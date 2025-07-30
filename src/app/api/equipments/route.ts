// File: app/api/equipments/route.ts

import { AuthenticatedUser, withResourcePermission } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { status as EquipmentStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
const supabase = createServiceRoleClient();

// Helper to extract storage path from a Supabase URL
const extractFilePathFromUrl = (fileUrl: string): string | null => {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "equipments");
    if (idx !== -1 && idx < parts.length - 1) {
      return parts.slice(idx + 1).join("/");
    }
    return null;
  } catch (err) {
    return null;
  }
};

// Delete a file from Supabase storage with improved error handling
const deleteFileFromSupabase = async (
  fileUrl: string,
  tag: string
): Promise<void> => {
  // Additional validation for URL format
  if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim() === '') {
    throw new Error(`Invalid file URL provided for ${tag}`);
  }
  
  const path = extractFilePathFromUrl(fileUrl);
  
  if (!path) { 
    throw new Error(`Cannot parse storage path from URL for ${tag}: ${fileUrl}`);
  }
  
  // Validate that path is specific (not a directory)
  if (path.endsWith('/') || !path.includes('.')) {
    throw new Error(`Invalid file path detected for ${tag} - appears to be a directory: ${path}`);
  }
  
  const { error } = await supabase.storage.from("equipments").remove([path]);
  
  if (error) {
    // Enhanced error message for debugging
    throw new Error(`Failed to delete file from storage for ${tag}: ${error.message} (Path: ${path})`);
  }
};

// Delete old files of specific type for an equipment (for replacement scenarios)
const deleteOldEquipmentFiles = async (
  equipmentId: string,
  fileType: 'image' | 'thirdparty_inspection' | 'pgpc_inspection' | 'receipt' | 'registration'
): Promise<void> => {
  try {
    const getSubfolderForFileType = (type: string) => {
      switch (type) {
        case 'image':
        case 'thirdparty_inspection':
        case 'pgpc_inspection':
          return 'equipment-images';
        case 'receipt':
        case 'registration':
          return 'equipment-documents';
        default:
          return 'equipment-files';
      }
    };
    
    const subfolder = getSubfolderForFileType(fileType);
    const equipmentDir = `equipment-${equipmentId}/${subfolder}`;
    
    // List files in the specific directory
    const { data: files, error } = await supabase.storage
      .from("equipments")
      .list(equipmentDir);

    if (error || !files) return; // Directory might not exist yet
    
    // Filter files based on type prefix
    const typePatterns = {
      image: /^equipment_image_\d+\./,
      thirdparty_inspection: /^thirdparty_inspection_\d+\./,
      pgpc_inspection: /^pgpc_inspection_\d+\./,
      receipt: /^original_receipt_\d+\./,
      registration: /^equipment_registration_\d+\./
    };
    
    const filesToDelete = files
      .filter(file => typePatterns[fileType].test(file.name))
      .map(file => `${equipmentDir}/${file.name}`);
    
    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from("equipments")
        .remove(filesToDelete);
        
      if (deleteError) {
        console.warn(`Warning: Could not delete some old ${fileType} files:`, deleteError.message);
        // Don't throw - proceed with upload even if cleanup fails
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not clean up old ${fileType} files:`, error);
    // Don't throw - proceed with upload even if cleanup fails
  }
};

// Ensure directory exists in Supabase storage by creating a placeholder file
const ensureDirectoryExists = async (directoryPath: string): Promise<void> => {
  try {
    // Check if directory exists by trying to list it
    const { data: files, error } = await supabase.storage
      .from("equipments")
      .list(directoryPath);
    
    if (error && error.message.includes('not found')) {
      // Directory doesn't exist, create it by uploading a placeholder file
      const placeholderPath = `${directoryPath}/.placeholder`;
      const { error: uploadError } = await supabase.storage
        .from("equipments")
        .upload(placeholderPath, new Blob([''], { type: 'text/plain' }), {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError && !uploadError.message.includes('already exists')) {
        // Ignore upload errors - directory creation is best effort
      }
    }
  } catch (error) {
    // Ignore errors - directory creation is best effort
  }
};

// Upload a file to Supabase storage with equipment-{equipmentId} structure
const uploadFileToSupabase = async (
  file: File,
  projectId: string,
  equipmentId: string,
  prefix: string,
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  type?: string
): Promise<{ field: string; url: string }> => {
  const timestamp = Date.now();
  const ext = file.name.split(".").pop();
  
  // Generate unique filename with timestamp to prevent browser caching issues
  const getFilename = (prefix: string) => {
    switch (prefix) {
      case 'image':
        return `equipment_image_${timestamp}.${ext}`;
      case 'thirdparty_inspection':
        return `thirdparty_inspection_${timestamp}.${ext}`;
      case 'pgpc_inspection':
        return `pgpc_inspection_${timestamp}.${ext}`;
      case 'receipt':
        return `original_receipt_${timestamp}.${ext}`;
      case 'registration':
        return `equipment_registration_${timestamp}.${ext}`;
      default:
        return `${prefix}_${timestamp}.${ext}`;
    }
  };

  const filename = getFilename(prefix);

  // NEW STRUCTURE: equipment-{equipmentId}/equipment-images/ or equipment-documents/
  const getSubfolder = (prefix: string) => {
    switch (prefix) {
      case 'image':
      case 'thirdparty_inspection':
      case 'pgpc_inspection':
        return 'equipment-images';
      case 'receipt':
      case 'registration':
        return 'equipment-documents';
      default:
        return 'equipment-files';
    }
  };

  const subfolder = getSubfolder(prefix);
  const equipmentDir = `equipment-${equipmentId}/${subfolder}`;
  
  // Ensure directory exists before uploading
  await ensureDirectoryExists(equipmentDir);
  
  // Clean up old files with same prefix (for true overwrite)
  const filePrefix = prefix; // e.g., "image", "thirdparty_inspection"
  try {
    const { data: existingFiles, error } = await supabase.storage
      .from("equipments")
      .list(equipmentDir);
    
    if (existingFiles && !error) {
      // Match files that start with the prefix pattern (e.g., "equipment_image_")
      const prefixPattern = `${prefix === 'image' ? 'equipment_image' : 
                              prefix === 'thirdparty_inspection' ? 'thirdparty_inspection' :
                              prefix === 'pgpc_inspection' ? 'pgpc_inspection' :
                              prefix === 'receipt' ? 'original_receipt' :
                              prefix === 'registration' ? 'equipment_registration' : prefix}_`;
      
      const filesToDelete = existingFiles
        .filter(file => file.name.startsWith(prefixPattern))
        .map(file => `${equipmentDir}/${file.name}`);
      
      if (filesToDelete.length > 0) {
        console.log(`🧹 Cleaning up old ${prefix} files:`, filesToDelete);
        await supabase.storage
          .from("equipments")
          .remove(filesToDelete);
      }
    }
  } catch (error) {
    // Continue with upload even if cleanup fails
    console.warn(`Warning: Could not clean up old ${prefix} files:`, error);
  }
  
  const filepath = `${equipmentDir}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("equipments")
    .upload(filepath, buffer, { cacheControl: "3600", upsert: true });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload ${prefix} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("equipments")
    .getPublicUrl(uploadData.path);

  return { field: getFieldName(prefix), url: urlData.publicUrl };
};

// Upload equipment part with unique identifier for tracking
const uploadEquipmentPart = async (
  file: File,
  projectId: string,
  equipmentId: string,
  fileId: string, // Unique identifier for tracking/deletion
  folderPath: string = "root",
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  type?: string
): Promise<{ id: string; url: string; name: string; type: string }> => {
  const ext = file.name.split(".").pop();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const filename = `${fileId}_${sanitizedFileName}`;

  // NEW STRUCTURE: equipment-{equipmentId}/parts-management/{folderPath}/
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const sanitizedFolderPath = sanitizeForPath(folderPath);
  const partsDir = `equipment-${equipmentId}/parts-management/${sanitizedFolderPath}`;
  
  // Ensure directory exists before uploading
  await ensureDirectoryExists(partsDir);
  
  const filepath = `${partsDir}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("equipments")
    .upload(filepath, buffer, { cacheControl: "3600", upsert: true });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload part file failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("equipments")
    .getPublicUrl(uploadData.path);

  return {
    id: fileId,
    url: urlData.publicUrl,
    name: file.name,
    type: file.type.startsWith('image/') ? 'image' : 'document'
  };
};

// Delete individual part file by ID
const deletePartFile = async (equipmentId: string, fileId: string, folderPath: string = "root"): Promise<void> => {
  try {
    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const sanitizedFolderPath = sanitizeForPath(folderPath);
    const partsDir = `equipment-${equipmentId}/parts-management/${sanitizedFolderPath}`;
    
    // List files in the directory to find the one with our fileId
    const { data: files, error } = await supabase.storage
      .from("equipments")
      .list(partsDir);

    if (error || !files) return; // Directory might not exist

    // Find file that starts with our fileId
    const fileToDelete = files.find(file => file.name.startsWith(`${fileId}_`));
    
    if (fileToDelete) {
      const { error: deleteError } = await supabase.storage
        .from("equipments")
        .remove([`${partsDir}/${fileToDelete.name}`]);
        
      if (deleteError) {
        console.warn(`Warning: Could not delete part file ${fileId}:`, deleteError.message);
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not delete part file ${fileId}:`, error);
  }
};

// CASCADE DELETE: Delete entire folder and all files within it
const deletePartFolder = async (equipmentId: string, folderPath: string): Promise<void> => {
  try {
    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const sanitizedFolderPath = sanitizeForPath(folderPath);
    const partsDir = `equipment-${equipmentId}/parts-management/${sanitizedFolderPath}`;
    
    // Use the existing recursive delete function
    await deleteDirectoryRecursively(partsDir);
  } catch (error) {
    console.warn(`Warning: Could not delete part folder ${folderPath}:`, error);
  }
};

// Map file-prefix to Prisma field name
const getFieldName = (prefix: string): string => {
  switch (prefix) {
    case "image":
      return "image_url";
    case "receipt":
      return "original_receipt_url";
    case "registration":
      return "equipment_registration_url";
    case "thirdparty_inspection":
      return "thirdparty_inspection_image";
    case "pgpc_inspection":
      return "pgpc_inspection_image";
    default:
      throw new Error(`Unknown prefix: ${prefix}`);
  }
};

// GET: Retrieve all equipment with proper role-based access control
export const GET = withResourcePermission(
  "equipment",
  "view",
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      const { searchParams } = new URL(request.url);
      const projectId = searchParams.get("projectId");
      const limit = searchParams.get("limit");
      const offset = searchParams.get("offset");

      // Build query filters
      const where: Prisma.equipmentWhereInput = {};
      if (projectId) {
        where.project_id = projectId;
      }

      // Apply pagination if provided
      const queryOptions: Prisma.equipmentFindManyArgs = {
        where,
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
            },
          },
          maintenance_reports: {
            orderBy: {
              date_reported: "desc",
            },
            take: 5, // Only include recent reports
          },
        },
        orderBy: {
          created_at: "desc",
        },
      };

      if (limit) {
        queryOptions.take = parseInt(limit, 10);
      }
      if (offset) {
        queryOptions.skip = parseInt(offset, 10);
      }

      const equipment = await prisma.equipment.findMany(queryOptions);

      // Get total count for pagination
      const total = await prisma.equipment.count({ where });

      return NextResponse.json({
        data: equipment,
        total,
        user_role: user.role,
        permissions: {
          can_create: user.role !== "VIEWER",
          can_update: user.role !== "VIEWER",
          can_delete: user.role === "SUPERADMIN",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to fetch equipment" },
        { status: 500 }
      );
    }
  }
);

export const POST = withResourcePermission(
  "equipment",
  "create",
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      const formData = await request.formData();

      const brand = formData.get("brand") as string;
      const model = formData.get("model") as string;
      const type = formData.get("type") as string;
      const insExp = formData.get("insuranceExpirationDate") as string | null; // Changed to allow null
      const regExp = formData.get("registrationExpiry") as string | null; // Add registration expiry
      const status = formData.get("status") as keyof typeof EquipmentStatus;
      const remarks = (formData.get("remarks") as string) || null;
      const owner = formData.get("owner") as string;
      const projectId = formData.get("projectId") as string;

      // Dates & plate:
      const inspDateStr = formData.get("inspectionDate") as string | null;
      const plateNum = (formData.get("plateNumber") as string) || null;
      
      // New inspection & compliance fields

      // BEFORE field as string
      const rawBefore = formData.get("before");
      const beforeStr = typeof rawBefore === "string" ? rawBefore : "";

      // Removed !insExp from validation - insurance date is now optional
      if (!brand || !model || !type || !owner || !projectId) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      // Fetch project and client info for human-readable paths
      const projectInfo = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: {
            include: {
              location: true,
            },
          },
        },
      });

      if (!projectInfo) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }

      const projectName = projectInfo.name;
      const clientName = projectInfo.client.name;

      // 1) create record without files  
      const createData: any = {
        brand,
        model,
        type,
        status,
        remarks,
        owner,
        plate_number: plateNum,
        project: { connect: { id: projectId } },
        equipment_parts: [], // Initialize empty array
        user: { connect: { id: user.id } }, // Connect to the user who created this equipment
        // only include `before` if provided
        ...(beforeStr !== "" ? { before: parseInt(beforeStr, 10) } : {}),
        // only include insurance date if provided
        ...(insExp ? { insurance_expiration_date: new Date(insExp) } : {}),
        // only include registration expiry if provided
        ...(regExp ? { registration_expiry: new Date(regExp) } : {}),
      };

      if (inspDateStr) {
        createData.inspection_date = new Date(inspDateStr);
      }
      
      // Add new inspection & compliance fields

      const equipment = await prisma.equipment.create({ data: createData });

      // Rest of the function remains the same...
      // 2) handle regular file uploads
      const fileJobs = [
        { file: formData.get("equipmentImage") as File | null, prefix: "image" },
        {
          file: formData.get("originalReceipt") as File | null,
          prefix: "receipt",
        },
        {
          file: formData.get("equipmentRegistration") as File | null,
          prefix: "registration",
        },
        {
          file: formData.get("thirdpartyInspection") as File | null,
          prefix: "thirdparty_inspection",
        },
        {
          file: formData.get("pgpcInspection") as File | null,
          prefix: "pgpc_inspection",
        },
      ]
        .filter((f) => f.file && f.file.size > 0)
        .map((f) =>
          uploadFileToSupabase(
            f.file!,
            projectId,
            equipment.id,
            f.prefix,
            projectName,
            clientName,
            brand,
            model,
            type
          )
        );

      // 3) handle equipment parts with new standardized structure (matching server actions) - CRITICAL FIX: Support empty folders
      const partsStructureData = formData.get('partsStructure') as string;
      let partsStructureWithUrls: any = null;
      
      if (partsStructureData) {
        try {
          const partsStructure = JSON.parse(partsStructureData);
          
          // CRITICAL FIX: Initialize with existing structure to preserve empty folders
          partsStructureWithUrls = {
            rootFiles: [],
            folders: partsStructure.folders ? partsStructure.folders.map((folder: any) => ({
              id: folder.id,
              name: folder.name,
              files: [] // Start with empty files array, will be populated with actual uploaded files
            })) : []
          };
          
          // Upload root files and build structure with unique IDs
          for (let i = 0; formData.get(`partsFile_root_${i}`); i++) {
            const file = formData.get(`partsFile_root_${i}`) as File;
            const fileName = formData.get(`partsFile_root_${i}_name`) as string;
            
            if (file && file.size > 0) {
              const fileId = `root_file_${i}`; // Predictable identifier for edit mode tracking
              const uploadResult = await uploadEquipmentPart(
                file,
                projectId,
                equipment.id,
                fileId,
                'root',
                projectName,
                clientName,
                brand,
                model,
                type
              );
              
              partsStructureWithUrls.rootFiles.push(uploadResult);
            }
          }
          
          // Upload folder files and build structure
          const folderMap: { [key: string]: any } = {};
          
          // CRITICAL FIX: Initialize folderMap with existing folders to preserve empty ones
          partsStructureWithUrls.folders.forEach((folder: any) => {
            folderMap[folder.name] = folder;
          });
          
          for (let folderIndex = 0; formData.get(`partsFile_folder_${folderIndex}_0`); folderIndex++) {
            for (let fileIndex = 0; formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`); fileIndex++) {
              const file = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
              const fileName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_name`) as string;
              const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
              
              if (file && file.size > 0) {
                const fileId = `folder_${folderName}_file_${fileIndex}`; // Predictable identifier for edit mode tracking
                const uploadResult = await uploadEquipmentPart(
                  file,
                  projectId,
                  equipment.id,
                  fileId,
                  folderName,
                  projectName,
                  clientName,
                  brand,
                  model,
                  type
                );
                
                // Initialize folder if it doesn't exist
                if (!folderMap[folderName]) {
                  folderMap[folderName] = {
                    id: `folder_${folderIndex}`,
                    name: folderName,
                    files: []
                  };
                }
                
                folderMap[folderName].files.push(uploadResult);
              }
            }
          }
          
          // Convert folderMap to array
          partsStructureWithUrls.folders = Object.values(folderMap);
          
        } catch (error) {
          // Failed to parse parts structure
          // Fall back to legacy handling if JSON parsing fails
        }
      }


      const updateData: Record<string, unknown> = {};

      if (fileJobs.length) {
        try {
          const uploads = await Promise.all(fileJobs);
          uploads.forEach((u) => {
            updateData[u.field] = u.url;
          });
        } catch (e) {
          await prisma.equipment.delete({ where: { id: equipment.id } });
          return NextResponse.json(
            { error: "File upload failed" },
            { status: 500 }
          );
        }
      }

      // Handle parts upload using new structure
      if (partsStructureWithUrls) {
        // Store as array with single JSON string element (to match existing API expectations)
        updateData.equipment_parts = [JSON.stringify(partsStructureWithUrls)];
      }

      // Update if we have any files
      if (Object.keys(updateData).length > 0) {
        await prisma.equipment.update({
          where: { id: equipment.id },
          data: updateData,
        });
      }

      // Handle maintenance report creation if provided
      const maintenanceReportData = formData.get("maintenanceReport") as string;
      if (maintenanceReportData) {
        try {
          const maintenanceData = JSON.parse(maintenanceReportData);
          
          // Get project info for location_id
          const projectInfo = await prisma.project.findUnique({
            where: { id: projectId },
            include: { client: { include: { location: true } } },
          });
          
          if (projectInfo) {
            // Validate required fields for maintenance report
            if (!maintenanceData.issueDescription || maintenanceData.issueDescription.trim() === '') {
              // Skip maintenance report creation if issue description is empty
            } else {
            
            // FIRST: Create the maintenance report to get the ID
            const maintenanceReport = await prisma.maintenance_equipment_report.create({
              data: {
                equipment_id: equipment.id,
                location_id: projectInfo.client.location.id,
                issue_description: maintenanceData.issueDescription || '',
                remarks: maintenanceData.remarks || null,
                inspection_details: maintenanceData.inspectionDetails || null,
                action_taken: maintenanceData.actionTaken || null,
                parts_replaced: maintenanceData.partsReplaced || [],
                priority: maintenanceData.priority || 'MEDIUM',
                status: maintenanceData.status || 'REPORTED',
                downtime_hours: maintenanceData.downtimeHours || null,
                date_reported: maintenanceData.dateReported ? new Date(maintenanceData.dateReported) : new Date(),
                date_repaired: maintenanceData.dateRepaired ? new Date(maintenanceData.dateRepaired) : null,
                reported_by: user.id,
                repaired_by: maintenanceData.status === 'COMPLETED' && maintenanceData.repairedBy ? maintenanceData.repairedBy : null,
                attachment_urls: [], // Will be updated after file uploads
              },
            });
            
            // THEN: Upload part images and collect attachment URLs
            const attachmentUrls: string[] = [];
            
            // Handle part images
            for (let i = 0; formData.get(`partImage_${i}`); i++) {
              const partImage = formData.get(`partImage_${i}`) as File;
              const partName = formData.get(`partImageName_${i}`) as string;
              
              if (partImage && partImage.size > 0) {
                try {
                  // Ensure the parts directory exists
                  const partsDir = `equipment-${equipment.id}/maintenance-reports/${maintenanceReport.id}/parts`;
                  await ensureDirectoryExists(partsDir);
                  
                  // Use dedicated maintenance parts upload with correct report ID
                  const timestamp = Date.now();
                  const ext = partImage.name.split(".").pop();
                  const sanitizedPartName = (partName || `part_${i + 1}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
                  const filename = `${sanitizedPartName}_${timestamp}.${ext}`;
                  const filepath = `${partsDir}/${filename}`;
                  const buffer = Buffer.from(await partImage.arrayBuffer());

                  const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from("equipments")
                    .upload(filepath, buffer, { cacheControl: "3600", upsert: false });

                  if (uploadErr || !uploadData) {
                    throw new Error(`Upload maintenance part image ${i + 1} failed: ${uploadErr?.message}`);
                  }

                  const { data: urlData } = supabase.storage
                    .from("equipments")
                    .getPublicUrl(uploadData.path);

                  const url = urlData.publicUrl;
                  attachmentUrls.push(url);
                } catch (error) {
                  // Continue if individual part image upload fails
                }
              }
            }
            
            // Handle maintenance attachments
            for (let i = 0; formData.get(`maintenanceAttachment_${i}`); i++) {
              const attachment = formData.get(`maintenanceAttachment_${i}`) as File;
              
              if (attachment && attachment.size > 0) {
                try {
                  // Ensure the attachments directory exists
                  const attachmentsDir = `equipment-${equipment.id}/maintenance-reports/${maintenanceReport.id}/attachments`;
                  await ensureDirectoryExists(attachmentsDir);
                  
                  // Use dedicated maintenance attachment upload with correct report ID
                  const timestamp = Date.now();
                  const ext = attachment.name.split(".").pop();
                  const filename = `maintenance_attachment_${i + 1}_${timestamp}.${ext}`;
                  const filepath = `${attachmentsDir}/${filename}`;
                  const buffer = Buffer.from(await attachment.arrayBuffer());

                  const { data: uploadData, error: uploadErr } = await supabase.storage
                    .from("equipments")
                    .upload(filepath, buffer, { cacheControl: "3600", upsert: false });

                  if (uploadErr || !uploadData) {
                    throw new Error(`Upload maintenance attachment ${i + 1} failed: ${uploadErr?.message}`);
                  }

                  const { data: urlData } = supabase.storage
                    .from("equipments")
                    .getPublicUrl(uploadData.path);

                  const url = urlData.publicUrl;
                  attachmentUrls.push(url);
                } catch (error) {
                  // Continue if individual attachment upload fails
                }
              }
            }
            
            // Update maintenance report with attachment URLs if any files were uploaded
            if (attachmentUrls.length > 0) {
              await prisma.maintenance_equipment_report.update({
                where: { id: maintenanceReport.id },
                data: { attachment_urls: attachmentUrls },
              });
            }
            }
          }
        } catch (error) {
          // Failed to create maintenance report, but equipment was created successfully
          // Don't fail the whole request
        }
      }

      const result = await prisma.equipment.findUnique({
        where: { id: equipment.id },
        include: {
          project: {
            include: { client: { include: { location: true } } },
          },
          maintenance_reports: {
            orderBy: { date_reported: 'desc' },
            take: 5,
          },
        },
      });
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json(
        {
          error: "Internal server error",
          details: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);

// Also replace your PUT function with this updated version:

export const PUT = withResourcePermission(
  "equipment",
  "update",
  async (request: NextRequest) => {
    try {
      const formData = await request.formData();

      const equipmentId = formData.get("equipmentId") as string;
      const brand = formData.get("brand") as string;
      const model = formData.get("model") as string;
      const type = formData.get("type") as string;
      const insExp = formData.get("insurance_expiration_date") as string | null; // Match frontend field name
      const status = formData.get("status") as keyof typeof EquipmentStatus;
      const remarks = (formData.get("remarks") as string) || null;
      const owner = formData.get("owner") as string;
      const projectId = formData.get("project_id") as string;

      const inspDateStr = formData.get("inspection_date") as string | null;
      const plateNum = (formData.get("plate_number") as string) || null;
      const regExpiryStr = formData.get("registration_expiry") as string | null;
      const createdBy = formData.get("created_by") as string | null;
      
      // New inspection & compliance fields

      // BEFORE field
      const rawBefore = formData.get("before");
      const beforeStr = typeof rawBefore === "string" ? rawBefore : "";

      // Removed !insExp from validation - insurance date is now optional
      if (!equipmentId || !brand || !model || !type || !owner || !projectId) {
        return NextResponse.json(
          { error: "Missing required fields" },
          { status: 400 }
        );
      }

      const existing = await prisma.equipment.findUnique({
        where: { id: equipmentId },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Equipment not found" },
          { status: 404 }
        );
      }

      // 🚀 PERFORMANCE OPTIMIZATION: Build update data only with changed fields
      const updateData: Record<string, unknown> = {};

      // Required fields - always sent by frontend, but only update if different from existing
      if (brand !== null && brand !== existing.brand) updateData.brand = brand;
      if (model !== null && model !== existing.model) updateData.model = model;
      if (type !== null && type !== existing.type) updateData.type = type;
      if (owner !== null && owner !== existing.owner) updateData.owner = owner;
      if (projectId !== null && projectId !== existing.project_id) updateData.project_id = projectId;

      // Optional fields - only update if provided and different
      if (status !== null && status !== existing.status) updateData.status = status;
      if (remarks !== null && remarks !== existing.remarks) updateData.remarks = remarks;
      if (plateNum !== null && plateNum !== existing.plate_number) updateData.plate_number = plateNum;
      if (createdBy !== null && createdBy !== existing.created_by) updateData.created_by = createdBy;
      if (beforeStr !== null) {
        const newBefore = beforeStr !== "" ? parseInt(beforeStr, 10) : null;
        if (newBefore !== existing.before) updateData.before = newBefore;
      }

      // Handle dates only if provided and different
      if (insExp !== null) {
        const newInsuranceDate = insExp ? new Date(insExp) : null;
        const existingInsuranceDate = existing.insurance_expiration_date;
        // Compare dates properly
        const datesAreDifferent = newInsuranceDate?.getTime() !== existingInsuranceDate?.getTime();
        if (datesAreDifferent) {
          updateData.insurance_expiration_date = newInsuranceDate;
        }
      }
      if (inspDateStr !== null) {
        const newInspectionDate = inspDateStr ? new Date(inspDateStr) : null;
        const existingInspectionDate = existing.inspection_date;
        // Compare dates properly
        const datesAreDifferent = newInspectionDate?.getTime() !== existingInspectionDate?.getTime();
        if (datesAreDifferent) {
          updateData.inspection_date = newInspectionDate;
        }
      }
      if (regExpiryStr !== null) {
        const newRegistrationExpiry = regExpiryStr ? new Date(regExpiryStr) : null;
        const existingRegistrationExpiry = existing.registration_expiry;
        // Compare dates properly
        const datesAreDifferent = newRegistrationExpiry?.getTime() !== existingRegistrationExpiry?.getTime();
        if (datesAreDifferent) {
          updateData.registration_expiry = newRegistrationExpiry;
        }
      }
      


      // Rest of the PUT function remains the same...
      // SIMPLE: Handle removed equipment images (3 fixed images only)
      const removedImagesData = formData.get('removedImages') as string;
      const removedImages = removedImagesData ? JSON.parse(removedImagesData) : [];
      
      console.log('🔍 DEBUG: Backend received removedImages:', removedImages);
      console.log('🔍 DEBUG: Backend received new files:', {
        equipmentImage: formData.get("equipmentImage") ? 'FILE_PRESENT' : 'NO_FILE',
        thirdpartyInspection: formData.get("thirdpartyInspection") ? 'FILE_PRESENT' : 'NO_FILE',
        pgpcInspection: formData.get("pgpcInspection") ? 'FILE_PRESENT' : 'NO_FILE'
      });
      
      // IMPROVED: Delete removed equipment images with better error handling and validation
      const equipmentImageFields = ['image_url', 'thirdparty_inspection_image', 'pgpc_inspection_image'];
      const processedUrls = new Set<string>(); // Prevent duplicate deletions
      
      for (const fieldName of removedImages) {
        if (equipmentImageFields.includes(fieldName)) {
          const existingUrl = existing[fieldName as keyof typeof existing] as string;
          
          // Additional validation to ensure we have a valid URL and it hasn't been processed
          if (existingUrl && existingUrl.trim() && !processedUrls.has(existingUrl)) {
            console.log(`🗑️ DELETING equipment image ${fieldName}:`, existingUrl);
            
            try {
              await deleteFileFromSupabase(existingUrl, fieldName);
              processedUrls.add(existingUrl); // Mark as processed
              updateData[fieldName] = null;
              console.log(`✅ Successfully deleted equipment image ${fieldName}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete ${fieldName}:`, deleteError);
              // Continue processing other files even if one fails
              // Still set field to null to reflect user intent
              updateData[fieldName] = null;
            }
          } else if (!existingUrl) {
            // Field is already empty, just ensure it's set to null
            console.log(`ℹ️ Field ${fieldName} is already empty, setting to null`);
            updateData[fieldName] = null;
          } else if (processedUrls.has(existingUrl)) {
            console.log(`⚠️ URL already processed for deletion: ${existingUrl}`);
            updateData[fieldName] = null;
          }
        } else {
          console.warn(`⚠️ Invalid field name in removedImages: ${fieldName}`);
        }
      }

      // NEW: Handle removed equipment documents with same logic as images
      const removedDocumentsData = formData.get('removedDocuments') as string;
      const removedDocuments = removedDocumentsData ? JSON.parse(removedDocumentsData) : [];
      
      console.log('🔍 DEBUG: Backend received removedDocuments:', removedDocuments);
      
      const equipmentDocumentFields = ['original_receipt_url', 'equipment_registration_url'];
      
      for (const fieldName of removedDocuments) {
        if (equipmentDocumentFields.includes(fieldName)) {
          const existingUrl = existing[fieldName as keyof typeof existing] as string;
          
          // Additional validation to ensure we have a valid URL and it hasn't been processed
          if (existingUrl && existingUrl.trim() && !processedUrls.has(existingUrl)) {
            console.log(`🗑️ DELETING equipment document ${fieldName}:`, existingUrl);
            
            try {
              await deleteFileFromSupabase(existingUrl, fieldName);
              processedUrls.add(existingUrl); // Mark as processed
              updateData[fieldName] = null;
              console.log(`✅ Successfully deleted equipment document ${fieldName}`);
            } catch (deleteError) {
              console.error(`❌ Failed to delete ${fieldName}:`, deleteError);
              // Continue processing other files even if one fails
              // Still set field to null to reflect user intent
              updateData[fieldName] = null;
            }
          } else if (!existingUrl) {
            // Field is already empty, just ensure it's set to null
            console.log(`ℹ️ Field ${fieldName} is already empty, setting to null`);
            updateData[fieldName] = null;
          } else if (processedUrls.has(existingUrl)) {
            console.log(`⚠️ URL already processed for deletion: ${existingUrl}`);
            updateData[fieldName] = null;
          }
        } else {
          console.warn(`⚠️ Invalid field name in removedDocuments: ${fieldName}`);
        }
      }

      // Handle new equipment image uploads (3 fixed images only)
      const fileJobs: Promise<{ field: string; url: string }>[] = [];
      
      const equipmentImageConfigs = [
        { file: formData.get("equipmentImage") as File | null, prefix: "image" },
        { file: formData.get("thirdpartyInspection") as File | null, prefix: "thirdparty_inspection" },
        { file: formData.get("pgpcInspection") as File | null, prefix: "pgpc_inspection" },
      ];

      for (const cfg of equipmentImageConfigs) {
        if (cfg.file && cfg.file.size > 0) {
          console.log(`📤 UPLOADING new ${cfg.prefix} file: ${cfg.file.name} (${cfg.file.size} bytes)`);
          fileJobs.push(
            uploadFileToSupabase(cfg.file, projectId, equipmentId, cfg.prefix)
          );
        }
      }

      // Handle documents separately (not part of images tab)
      const documentConfigs = [
        { file: formData.get("originalReceipt") as File | null, prefix: "receipt" },
        { file: formData.get("equipmentRegistration") as File | null, prefix: "registration" },
      ];

      for (const cfg of documentConfigs) {
        if (cfg.file && cfg.file.size > 0) {
          fileJobs.push(
            uploadFileToSupabase(cfg.file, projectId, equipmentId, cfg.prefix)
          );
        }
      }

      // Handle parts deletion requests first
      const deletePartsData = formData.get('deleteParts') as string;
      if (deletePartsData) {
        try {
          const deleteRequests = JSON.parse(deletePartsData);
          
          // Handle individual file deletions
          if (deleteRequests.files && Array.isArray(deleteRequests.files)) {
            for (const fileDelete of deleteRequests.files) {
              // If file has URL, it's an existing file - delete by URL
              if (fileDelete.fileUrl) {
                try {
                  await deleteFileFromSupabase(fileDelete.fileUrl, `part file ${fileDelete.fileName}`);
                } catch (error) {
                  console.warn(`Failed to delete part file by URL: ${fileDelete.fileName}`, error);
                }
              } else {
                // No URL means it's a new file - delete by ID
                await deletePartFile(equipmentId, fileDelete.fileId, fileDelete.folderPath || 'root');
              }
            }
          }
          
          // Handle folder cascade deletions
          if (deleteRequests.folders && Array.isArray(deleteRequests.folders)) {
            for (const folderDelete of deleteRequests.folders) {
              await deletePartFolder(equipmentId, folderDelete.folderPath);
            }
          }
        } catch (error) {
          // Continue processing even if some deletions fail
          console.warn('Warning: Some parts deletion operations failed:', error);
        }
      }

      // Handle equipment parts updates - simplified approach following vehicles pattern
      const partsStructureData = formData.get('partsStructure') as string;
      let partsStructureWithUrls: any = null;
      
      if (partsStructureData) {
        try {
          const partsStructure = JSON.parse(partsStructureData);
          
          // Create the final structure with uploaded URLs - only process NEW uploads
          const processedStructure = {
            rootFiles: [] as any[],
            folders: [] as any[]
          };
          
          // Process root files - only handle NEW uploads (files with File objects)
          if (partsStructure.rootFiles && Array.isArray(partsStructure.rootFiles)) {
            for (let i = 0; i < partsStructure.rootFiles.length; i++) {
              const rootFile = partsStructure.rootFiles[i];
              
              const partFile = formData.get(`partsFile_root_${i}`) as File;
              const partName = formData.get(`partsFile_root_${i}_name`) as string || rootFile.name;
              
              // Check if this is a new file upload
              if (partFile && partFile.size > 0) {
                try {
                  const fileId = `root_file_${i}_${Date.now()}`;
                  const uploadResult = await uploadEquipmentPart(
                    partFile,
                    projectId,
                    equipmentId,
                    fileId,
                    'root'
                  );
                  
                  processedStructure.rootFiles.push({
                    id: uploadResult.id,
                    name: rootFile.name,
                    url: uploadResult.url,
                    preview: uploadResult.preview || uploadResult.url,
                    type: uploadResult.type
                  });
                } catch (error) {
                  console.error(`Failed to upload root file ${i}:`, error);
                  // Continue with other files
                }
              } else if (rootFile.url || rootFile.preview) {
                // This is an existing file, preserve it
                processedStructure.rootFiles.push({
                  id: rootFile.id,
                  name: rootFile.name,
                  url: rootFile.url || rootFile.preview,
                  preview: rootFile.preview || rootFile.url,
                  type: rootFile.type || (rootFile.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
                });
              }
            }
          }
          
          // Process folder files
          if (partsStructure.folders && Array.isArray(partsStructure.folders)) {
            for (let folderIndex = 0; folderIndex < partsStructure.folders.length; folderIndex++) {
              const folder = partsStructure.folders[folderIndex];
              const processedFolder = {
                id: folder.id,
                name: folder.name,
                files: [] as any[],
                created_at: folder.created_at
              };
              
              if (folder.files && Array.isArray(folder.files)) {
                for (let fileIndex = 0; fileIndex < folder.files.length; fileIndex++) {
                  const folderFile = folder.files[fileIndex];
                  
                  const partFile = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
                  const partName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_name`) as string || folderFile.name;
                  
                  // Check if this is a new file upload
                  if (partFile && partFile.size > 0) {
                    try {
                      const fileId = `folder_${folder.name}_file_${fileIndex}_${Date.now()}`;
                      const uploadResult = await uploadEquipmentPart(
                        partFile,
                        projectId,
                        equipmentId,
                        fileId,
                        folder.name
                      );
                      
                      processedFolder.files.push({
                        id: uploadResult.id,
                        name: folderFile.name,
                        url: uploadResult.url,
                        preview: uploadResult.preview || uploadResult.url,
                        type: uploadResult.type
                      });
                    } catch (error) {
                      console.error(`Failed to upload folder file ${folderIndex}-${fileIndex}:`, error);
                      // Continue with other files
                    }
                  } else if (folderFile.url || folderFile.preview) {
                    // This is an existing file, preserve it
                    processedFolder.files.push({
                      id: folderFile.id,
                      name: folderFile.name,
                      url: folderFile.url || folderFile.preview,
                      preview: folderFile.preview || folderFile.url,
                      type: folderFile.type || (folderFile.url?.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
                    });
                  }
                }
              }
              
              processedStructure.folders.push(processedFolder);
            }
          }
          
          partsStructureWithUrls = processedStructure;
          
          // Store as array with single JSON string element
          updateData.equipment_parts = [JSON.stringify(partsStructureWithUrls)];
        } catch (error) {
          console.error('Failed to process parts structure during update:', error);
        }
      }

      if (fileJobs.length) {
        try {
          const ups = await Promise.all(fileJobs);
          console.log('🎯 UPLOAD RESULTS:', ups.map(u => ({ field: u.field, url: u.url })));
          ups.forEach((u) => {
            updateData[u.field] = u.url;
            console.log(`✅ Setting ${u.field} = ${u.url}`);
          });
        } catch (e) {
          console.error('❌ FILE UPLOAD FAILED:', e);
          return NextResponse.json(
            { error: "File upload failed" },
            { status: 500 }
          );
        }
      }

      // Only update if we have changes to make
      let updated = existing;
      if (Object.keys(updateData).length > 0) {
        console.log('📝 FINAL UPDATE DATA BEING SAVED:', updateData);
        updated = await prisma.equipment.update({
          where: { id: equipmentId },
          data: updateData,
        });
        console.log('💾 DATABASE UPDATE SUCCESSFUL');
      }

      const result = await prisma.equipment.findUnique({
        where: { id: updated.id },
        include: {
          project: {
            include: { client: { include: { location: true } } },
          },
        },
      });

      console.log('🚀 FINAL API RESPONSE IMAGE URLS:', {
        image_url: result?.image_url,
        thirdparty_inspection_image: result?.thirdparty_inspection_image,
        pgpc_inspection_image: result?.pgpc_inspection_image
      });

      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json(
        {
          error: "Internal server error",
          details: err instanceof Error ? err.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }
);

// Helper function to recursively delete all files and folders in a directory
const deleteDirectoryRecursively = async (directoryPath: string): Promise<void> => {
  try {
    // List all items in the directory
    const { data: items, error: listError } = await supabase.storage
      .from("equipments")
      .list(directoryPath);

    if (listError) {
      // If directory doesn't exist, that's fine - nothing to delete
      if (listError.message.includes('not found')) {
        return;
      }
      throw listError;
    }

    if (!items || items.length === 0) {
      return;
    }

    // Separate files and folders
    const files = items.filter(item => !item.metadata?.isDirectory && item.name !== '.emptyFolderPlaceholder');
    const folders = items.filter(item => item.metadata?.isDirectory || (item.name && item.name.indexOf('.') === -1));

    // Delete all files in current directory
    if (files.length > 0) {
      const filePaths = files.map(file => `${directoryPath}/${file.name}`);
      const { error: deleteFilesError } = await supabase.storage
        .from("equipments")
        .remove(filePaths);
      
      if (deleteFilesError) {
        // Ignore individual file deletion errors - some files may already be gone
      }
    }

    // Recursively delete subdirectories
    for (const folder of folders) {
      await deleteDirectoryRecursively(`${directoryPath}/${folder.name}`);
    }

    // Try to remove any remaining placeholder files
    try {
      await supabase.storage
        .from("equipments")
        .remove([`${directoryPath}/.placeholder`]);
    } catch (error) {
      // Ignore placeholder removal errors
    }

  } catch (error) {
    // Directory deletion errors are handled gracefully
  }
};

export const DELETE = withResourcePermission(
  "equipment",
  "delete",
  async (request: NextRequest) => {
    try {
      const url = new URL(request.url);
      const equipmentId = url.searchParams.get("equipmentId");
      if (!equipmentId) {
        return NextResponse.json(
          { error: "equipmentId required" },
          { status: 400 }
        );
      }

      const existing = await prisma.equipment.findUnique({
        where: { id: equipmentId },
        include: { 
          project: true,
          maintenance_reports: true 
        },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      // Delete all maintenance reports first (for proper foreign key cleanup)
      if (existing.maintenance_reports && existing.maintenance_reports.length > 0) {
        await prisma.maintenance_equipment_report.deleteMany({
          where: { equipment_id: equipmentId }
        });
      }

      // Delete equipment record
      await prisma.equipment.delete({ where: { id: equipmentId } });

      // Clean up storage using the NEW structure: equipment-{equipmentId}/
      const equipmentFolder = `equipment-${equipmentId}`;
      
      try {
        await deleteDirectoryRecursively(equipmentFolder);
      } catch (storageError) {
        // Don't fail the request if storage cleanup fails - the equipment record is already deleted
      }

      return NextResponse.json({ 
        message: "Equipment deleted successfully",
        cleanedUp: {
          equipmentRecord: true,
          maintenanceReports: existing.maintenance_reports?.length || 0,
          storageFolder: equipmentFolder
        }
      });
    } catch (err) {
      return NextResponse.json(
        { 
          error: "Internal server error",
          details: err instanceof Error ? err.message : "Unknown error"
        },
        { status: 500 }
      );
    }
  }
);

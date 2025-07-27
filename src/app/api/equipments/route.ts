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

// Delete a file from Supabase storage
const deleteFileFromSupabase = async (
  fileUrl: string,
  tag: string
): Promise<void> => {
  const path = extractFilePathFromUrl(fileUrl);
  if (!path) throw new Error(`Cannot parse path for ${tag}`);
  const { error } = await supabase.storage.from("equipments").remove([path]);
  if (error) throw error;
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
  const filename = `${prefix}_${timestamp}.${ext}`;

  // NEW STRUCTURE: equipment-{equipmentId}/equipment-images/ or equipment-documents/
  const getSubfolder = (prefix: string) => {
    switch (prefix) {
      case 'equipment_image':
        return 'equipment-images';
      case 'thirdparty_inspection':
      case 'pgpc_inspection':
      case 'original_receipt':
      case 'equipment_registration':
        return 'equipment-documents';
      default:
        return 'equipment-files';
    }
  };

  const subfolder = getSubfolder(prefix);
  const equipmentDir = `equipment-${equipmentId}/${subfolder}`;
  
  // Ensure directory exists before uploading
  await ensureDirectoryExists(equipmentDir);
  
  const filepath = `${equipmentDir}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("equipments")
    .upload(filepath, buffer, { cacheControl: "3600", upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload ${prefix} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("equipments")
    .getPublicUrl(uploadData.path);

  return { field: getFieldName(prefix), url: urlData.publicUrl };
};

// Upload equipment part with numbered prefix and folder support
const uploadEquipmentPart = async (
  file: File,
  projectId: string,
  equipmentId: string,
  partNumber: number,
  folderPath: string = "main",
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  type?: string
): Promise<string> => {
  const timestamp = Date.now();
  const ext = file.name.split(".").pop();
  const filename = `${partNumber}_${file.name.replace(
    /\.[^/.]+$/,
    ""
  )}_${timestamp}.${ext}`;

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
    .upload(filepath, buffer, { cacheControl: "3600", upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload part ${partNumber} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("equipments")
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
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
          
          // Upload root files and build structure
          for (let i = 0; formData.get(`partsFile_root_${i}`); i++) {
            const file = formData.get(`partsFile_root_${i}`) as File;
            const fileName = formData.get(`partsFile_root_${i}_name`) as string;
            
            if (file && file.size > 0) {
              const url = await uploadEquipmentPart(
                file,
                projectId,
                equipment.id,
                i + 1,
                'root',
                projectName,
                clientName,
                brand,
                model,
                type
              );
              
              partsStructureWithUrls.rootFiles.push({
                id: `root_${i}`,
                name: fileName,
                url: url,
                type: file.type.startsWith('image/') ? 'image' : 'document'
              });
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
                const url = await uploadEquipmentPart(
                  file,
                  projectId,
                  equipment.id,
                  fileIndex + 1,
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
                
                folderMap[folderName].files.push({
                  id: `folder_${folderIndex}_file_${fileIndex}`,
                  name: fileName,
                  url: url,
                  type: file.type.startsWith('image/') ? 'image' : 'document'
                });
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
      // Handle regular files
      const configs = [
        {
          newFile: formData.get("equipmentImage") as File | null,
          keep: formData.get("keepExistingImage") as string,
          existingUrl: existing.image_url,
          prefix: "image",
          field: "image_url",
          tag: "image",
        },
        {
          newFile: formData.get("originalReceipt") as File | null,
          keep: formData.get("keepExistingReceipt") as string,
          existingUrl: existing.original_receipt_url,
          prefix: "receipt",
          field: "original_receipt_url",
          tag: "receipt",
        },
        {
          newFile: formData.get("equipmentRegistration") as File | null,
          keep: formData.get("keepExistingRegistration") as string,
          existingUrl: existing.equipment_registration_url,
          prefix: "registration",
          field: "equipment_registration_url",
          tag: "registration",
        },
        {
          newFile: formData.get("thirdpartyInspection") as File | null,
          keep: formData.get("keepExistingThirdpartyInspection") as string,
          existingUrl: existing.thirdparty_inspection_image,
          prefix: "thirdparty_inspection",
          field: "thirdparty_inspection_image",
          tag: "3rd-party inspection",
        },
        {
          newFile: formData.get("pgpcInspection") as File | null,
          keep: formData.get("keepExistingPgpcInspection") as string,
          existingUrl: existing.pgpc_inspection_image,
          prefix: "pgpc_inspection",
          field: "pgpc_inspection_image",
          tag: "PGPC inspection",
        },
      ];

      const fileJobs: Promise<{ field: string; url: string }>[] = [];

      for (const cfg of configs) {
        if (cfg.newFile && cfg.newFile.size > 0) {
          // delete old if exists
          if (cfg.existingUrl) {
            await deleteFileFromSupabase(cfg.existingUrl, cfg.tag);
          }
          fileJobs.push(
            uploadFileToSupabase(
              cfg.newFile,
              projectId,
              equipmentId,
              cfg.prefix
            )
          );
        } else if (cfg.keep !== "true") {
          // user removed it
          if (cfg.existingUrl) {
            await deleteFileFromSupabase(cfg.existingUrl, cfg.tag);
          }
          updateData[cfg.field] = null;
        }
      }

      // Handle equipment parts updates - support both new and legacy formats - CRITICAL FIX: Support empty folders
      const partsStructureData = formData.get('partsStructure') as string;
      let partsStructureWithUrls: any = null;
      
      if (partsStructureData) {
        // Handle new parts structure (matching server actions)
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
          
          // Upload root files and build structure
          for (let i = 0; formData.get(`partsFile_root_${i}`); i++) {
            const file = formData.get(`partsFile_root_${i}`) as File;
            const fileName = formData.get(`partsFile_root_${i}_name`) as string;
            
            if (file && file.size > 0) {
              const url = await uploadEquipmentPart(
                file,
                projectId,
                equipmentId,
                i + 1,
                'root'
              );
              
              partsStructureWithUrls.rootFiles.push({
                id: `root_${i}`,
                name: fileName,
                url: url,
                type: file.type.startsWith('image/') ? 'image' : 'document'
              });
            }
          }
          
          // CRITICAL FIX: Process existing root files (for existing data preservation)
          if (partsStructure.rootFiles && Array.isArray(partsStructure.rootFiles)) {
            partsStructure.rootFiles.forEach((existingFile: any) => {
              // Only add if it has a valid URL (existing stored file)
              if (existingFile.url || existingFile.preview) {
                partsStructureWithUrls.rootFiles.push({
                  id: existingFile.id,
                  name: existingFile.name,
                  url: existingFile.url || existingFile.preview,
                  type: existingFile.type || 'document'
                });
              }
            });
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
                const url = await uploadEquipmentPart(
                  file,
                  projectId,
                  equipmentId,
                  fileIndex + 1,
                  folderName
                );
                
                // Initialize folder if it doesn't exist
                if (!folderMap[folderName]) {
                  folderMap[folderName] = {
                    id: `folder_${folderIndex}`,
                    name: folderName,
                    files: []
                  };
                }
                
                folderMap[folderName].files.push({
                  id: `folder_${folderIndex}_file_${fileIndex}`,
                  name: fileName,
                  url: url,
                  type: file.type.startsWith('image/') ? 'image' : 'document'
                });
              }
            }
          }
          
          // CRITICAL FIX: Preserve existing files in folders
          if (partsStructure.folders && Array.isArray(partsStructure.folders)) {
            partsStructure.folders.forEach((existingFolder: any) => {
              if (existingFolder.files && Array.isArray(existingFolder.files)) {
                // Ensure folder exists in folderMap
                if (!folderMap[existingFolder.name]) {
                  folderMap[existingFolder.name] = {
                    id: existingFolder.id,
                    name: existingFolder.name,
                    files: []
                  };
                }
                
                // Add existing files that have valid URLs
                existingFolder.files.forEach((existingFile: any) => {
                  if (existingFile.url || existingFile.preview) {
                    folderMap[existingFolder.name].files.push({
                      id: existingFile.id,
                      name: existingFile.name,
                      url: existingFile.url || existingFile.preview,
                      type: existingFile.type || 'document'
                    });
                  }
                });
              }
            });
          }
          
          // Convert folderMap to array
          partsStructureWithUrls.folders = Object.values(folderMap);
          
          
          // Store as array with single JSON string element
          updateData.equipment_parts = [JSON.stringify(partsStructureWithUrls)];
        } catch (error) {
          // Failed to parse parts structure during update
        }
      }

      if (fileJobs.length) {
        try {
          const ups = await Promise.all(fileJobs);
          ups.forEach((u) => {
            updateData[u.field] = u.url;
          });
        } catch (e) {
          return NextResponse.json(
            { error: "File upload failed" },
            { status: 500 }
          );
        }
      }

      // Only update if we have changes to make
      let updated = existing;
      if (Object.keys(updateData).length > 0) {
        updated = await prisma.equipment.update({
          where: { id: equipmentId },
          data: updateData,
        });
      }

      const result = await prisma.equipment.findUnique({
        where: { id: updated.id },
        include: {
          project: {
            include: { client: { include: { location: true } } },
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

// File: app/api/equipments/route.ts

import { AuthenticatedUser, withResourcePermission } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { status as EquipmentStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
const supabase = createServiceRoleClient();

// Helper to get next available file indices from existing parts structure
const getNextFileIndices = (existingPartsStructure: { rootFiles: any[], folders: any[] }) => {
  // Find highest root file index
  let maxRootIndex = -1;
  existingPartsStructure.rootFiles.forEach((file) => {
    if (file.id) {
      const match = file.id.match(/^root_(\d+)_/);
      if (match) {
        const index = parseInt(match[1]);
        if (index > maxRootIndex) {
          maxRootIndex = index;
        }
      }
    }
  });
  
  // Find highest folder file index
  let maxFolderIndex = -1;
  existingPartsStructure.folders.forEach((folder) => {
    folder.files.forEach((file: any) => {
      if (file.id) {
        const match = file.id.match(/^folder_(\d+)_/);
        if (match) {
          const index = parseInt(match[1]);
          if (index > maxFolderIndex) {
            maxFolderIndex = index;
          }
        }
      }
    });
  });
  
  return {
    nextRootIndex: maxRootIndex + 1,
    nextFolderIndex: maxFolderIndex + 1
  };
};

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

// Retrieve parts files from Supabase storage for equipment viewing
const retrievePartsFromStorage = async (equipmentId: string): Promise<{ rootFiles: any[], folders: any[] }> => {
  try {
    const partsDir = `equipment-${equipmentId}/parts-management`;
    
    // List all items in the parts directory
    const { data: items, error } = await supabase.storage
      .from("equipments")
      .list(partsDir, { limit: 1000 });

    if (error || !items) {
      console.log(`ℹ️ No parts directory found for equipment ${equipmentId}`);
      return { rootFiles: [], folders: [] };
    }

    const rootFiles: any[] = [];
    const foldersMap: Record<string, any[]> = {};

    // Process each item to determine if it's a root file or folder
    for (const item of items) {
      if (item.name === '.placeholder') continue; // Skip placeholder files
      
      // Check if it's a directory (folder) - but exclude files that start with root_ prefix
      const isRootFile = item.name.startsWith('root_') && item.name.includes('.');
      const isDirectory = item.metadata?.isDirectory || (item.name && !item.name.includes('.') && !isRootFile);
      
      if (isDirectory) {
        // This is a folder, list its contents
        const folderPath = `${partsDir}/${item.name}`;
        const { data: folderItems, error: folderError } = await supabase.storage
          .from("equipments")
          .list(folderPath, { limit: 100 });

        if (!folderError && folderItems) {
          const folderFiles = folderItems
            .filter(file => file.name !== '.placeholder')
            .map(file => {
              const { data: urlData } = supabase.storage
                .from("equipments")
                .getPublicUrl(`${folderPath}/${file.name}`);
              
              return {
                id: `${item.name}_${file.name}`,
                name: file.name.split('_').slice(1).join('_'), // Remove ID prefix
                url: urlData.publicUrl,
                type: file.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document',
                uploadedAt: file.created_at || new Date().toISOString()
              };
            });
          
          if (folderFiles.length > 0) {
            foldersMap[item.name] = folderFiles;
          }
        }
      } else {
        // This is a root file (either has extension or starts with root_ prefix)
        const { data: urlData } = supabase.storage
          .from("equipments")
          .getPublicUrl(`${partsDir}/${item.name}`);
        
        rootFiles.push({
          id: item.name,
          name: item.name.split('_').slice(1).join('_'), // Remove ID prefix
          url: urlData.publicUrl,
          type: item.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document',
          uploadedAt: item.created_at || new Date().toISOString()
        });
      }
    }

    // Convert folders map to array format
    const folders = Object.entries(foldersMap).map(([name, files]) => ({
      name, // Keep original folder names - don't create artificial 'Root' folder
      files
    }));

    console.log(`📦 Retrieved ${rootFiles.length} root files and ${folders.length} folders from storage for equipment ${equipmentId}`);
    return { rootFiles, folders };

  } catch (error) {
    console.error('❌ Failed to retrieve parts from storage:', error);
    return { rootFiles: [], folders: [] };
  }
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
  // For root files (folderPath === "root"), store directly in parts-management
  let partsDir: string;
  if (folderPath && folderPath.trim() !== "" && folderPath !== "root") {
    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const sanitizedFolderPath = sanitizeForPath(folderPath);
    partsDir = `equipment-${equipmentId}/parts-management/${sanitizedFolderPath}`;
  } else {
    // Root files go directly in parts-management (not in a "root" subfolder)
    partsDir = `equipment-${equipmentId}/parts-management`;
  }
  
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
    // For root files (folderPath === "root"), look directly in parts-management
    let partsDir: string;
    if (folderPath && folderPath.trim() !== "" && folderPath !== "root") {
      const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const sanitizedFolderPath = sanitizeForPath(folderPath);
      partsDir = `equipment-${equipmentId}/parts-management/${sanitizedFolderPath}`;
    } else {
      // Root files are directly in parts-management
      partsDir = `equipment-${equipmentId}/parts-management`;
    }
    
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
    // Don't delete root folder - only delete actual named folders
    if (folderPath === "root" || !folderPath || folderPath.trim() === "") {
      console.warn("Cannot delete root folder - only individual files can be deleted from root");
      return;
    }
    
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

      // Enhance equipment data with parts information
      const enhancedEquipment = await Promise.all(
        equipment.map(async (eq) => {
          let partsData: { rootFiles: any[], folders: any[] } = { rootFiles: [], folders: [] };
          
          // First, try to get parts from database metadata
          if (eq.equipment_parts && eq.equipment_parts.length > 0) {
            try {
              const firstPart = eq.equipment_parts[0];
              if (typeof firstPart === 'string' && firstPart.startsWith('{')) {
                partsData = JSON.parse(firstPart);
                console.log(`📖 Loaded parts metadata from database for equipment ${eq.id}`);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to parse parts metadata for equipment ${eq.id}, falling back to storage scan`);
            }
          }
          
          // If no metadata in database, try to retrieve from storage (fallback for existing equipment)
          if (partsData.rootFiles.length === 0 && partsData.folders.length === 0) {
            partsData = await retrievePartsFromStorage(eq.id);
            
            // If we found parts in storage, update the database for next time
            if (partsData.rootFiles.length > 0 || partsData.folders.length > 0) {
              try {
                await prisma.equipment.update({
                  where: { id: eq.id },
                  data: { equipment_parts: [JSON.stringify(partsData)] }
                });
                console.log(`💾 Stored retrieved parts metadata in database for equipment ${eq.id}`);
              } catch (updateError) {
                console.warn(`⚠️ Failed to update parts metadata for equipment ${eq.id}:`, updateError);
              }
            }
          }
          
          return {
            ...eq,
            parts_data: partsData
          };
        })
      );

      // Get total count for pagination
      const total = await prisma.equipment.count({ where });

      return NextResponse.json({
        data: enhancedEquipment,
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

      // 3) Handle equipment parts as simple string array (aligned with UI changes)
      const equipmentPartsData = formData.get('equipmentParts') as string;
      let equipmentParts: string[] = [];
      
      if (equipmentPartsData) {
        try {
          const partsArray = JSON.parse(equipmentPartsData);
          if (Array.isArray(partsArray)) {
            // Filter and validate parts as strings
            equipmentParts = partsArray
              .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
              .map(part => part.trim())
              .slice(0, 50); // Reasonable limit
          }
        } catch (error) {
          // If parsing fails, try to handle as comma-separated string
          equipmentParts = equipmentPartsData
            .split(',')
            .map(part => part.trim())
            .filter(part => part.length > 0)
            .slice(0, 50);
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

      // Update equipment parts if provided
      if (equipmentParts.length > 0) {
        updateData.equipment_parts = equipmentParts;
      }

      // 4) CRITICAL FIX: Handle parts files upload with consistent indexing
      // For create mode, start from 0 (no existing files to conflict with)
      const partsUploadPromises: Promise<any>[] = [];
      let rootFileIndex = 0; // Both FormData index and actual index start at 0 for create
      
      console.log(`🔢 CREATE MODE - Starting file indices - Root: 0, Folder: 0`);
      
      while (formData.get(`partsFile_root_${rootFileIndex}`)) {
        const partFile = formData.get(`partsFile_root_${rootFileIndex}`) as File;
        const partName = formData.get(`partsFile_root_${rootFileIndex}_name`) as string;
        
        if (partFile && partFile.size > 0) {
          const fileId = `root_${rootFileIndex}_${Date.now()}`;
          console.log(`📁 Creating root file with ID: ${fileId} (CREATE MODE)`);
          partsUploadPromises.push(
            uploadEquipmentPart(
              partFile,
              projectId,
              equipment.id,
              fileId,
              "", // empty folder path for root files - store directly in parts-management
              projectName,
              clientName,
              brand,
              model,
              type
            )
          );
        }
        rootFileIndex++;
      }
      
      // Process folder parts files with consistent indexing
      let folderIndex = 0; // FormData folder index
      let fileIndex = 0; // FormData file index within folder
      let actualFolderFileIndex = 0; // Actual file ID index (starts at 0 for create mode)
      
      while (formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`)) {
        const partFile = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
        const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
        
        if (partFile && partFile.size > 0 && folderName) {
          const fileId = `folder_${actualFolderFileIndex}_${Date.now()}`;
          console.log(`📁 Creating folder file with ID: ${fileId} (CREATE MODE - FormData indices: ${folderIndex}/${fileIndex})`);
          partsUploadPromises.push(
            uploadEquipmentPart(
              partFile,
              projectId,
              equipment.id,
              fileId,
              folderName, // use actual folder name
              projectName,
              clientName,
              brand,
              model,
              type
            )
          );
          actualFolderFileIndex++; // Increment the actual file ID index
        }
        
        fileIndex++;
        // Check for next folder if no more files in current folder
        if (!formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`)) {
          folderIndex++;
          fileIndex = 0;
        }
      }
      
      // Upload all parts files in parallel and store metadata in database
      if (partsUploadPromises.length > 0) {
        try {
          const partsResults = await Promise.all(partsUploadPromises);
          console.log(`📦 Successfully uploaded ${partsResults.length} parts files`);
          
          // CRITICAL FIX: Store parts file metadata in equipment_parts field
          if (partsResults.length > 0) {
            // Build parts structure with root files and folders
            const partsStructure: {
              rootFiles: any[],
              folders: Record<string, any[]>
            } = {
              rootFiles: [],
              folders: {}
            };
            
            partsResults.forEach((partResult) => {
              const partData = {
                id: partResult.id,
                name: partResult.name,
                url: partResult.url,
                type: partResult.type,
                uploadedAt: new Date().toISOString()
              };
              
              // Determine if this is a root file or folder file based on fileId pattern
              if (partResult.id.startsWith('root_')) {
                partsStructure.rootFiles.push(partData);
              } else if (partResult.id.startsWith('folder_')) {
                // Extract folder info from formData based on fileId pattern
                const idParts = partResult.id.split('_');
                const folderIndex = idParts[1];
                const fileIndex = idParts[2];
                
                // Find the folder name from formData
                const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
                
                if (folderName) {
                  if (!partsStructure.folders[folderName]) {
                    partsStructure.folders[folderName] = [];
                  }
                  partsStructure.folders[folderName].push(partData);
                }
              }
            });
            
            // Convert folders object to array format for consistency
            const foldersArray = Object.entries(partsStructure.folders).map(([name, files]) => ({
              name,
              files
            }));
            
            const finalPartsStructure = {
              rootFiles: partsStructure.rootFiles,
              folders: foldersArray
            };
            
            // Store the parts structure as JSON in equipment_parts field
            updateData.equipment_parts = [JSON.stringify(finalPartsStructure)];
            console.log(`📝 Storing parts metadata for ${partsResults.length} files in equipment_parts field`);
          }
        } catch (error) {
          console.error('❌ Parts upload failed:', error);
          // Continue processing - don't fail the entire request
        }
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

      // Handle parts deletion requests first and track deleted files
      const deletePartsData = formData.get('deleteParts') as string;
      const deletedFileUrls = new Set<string>();
      const deletedFileIds = new Set<string>();
      
      if (deletePartsData) {
        try {
          const deleteRequests = JSON.parse(deletePartsData);
          console.log('🗑️ Processing parts deletion requests:', deleteRequests);
          
          // Handle individual file deletions
          if (deleteRequests.files && Array.isArray(deleteRequests.files)) {
            for (const fileDelete of deleteRequests.files) {
              // If file has URL, it's an existing file - delete by URL
              if (fileDelete.fileUrl) {
                try {
                  await deleteFileFromSupabase(fileDelete.fileUrl, `part file ${fileDelete.fileName}`);
                  deletedFileUrls.add(fileDelete.fileUrl);
                  console.log(`✅ Deleted file from storage: ${fileDelete.fileName}`);
                } catch (error) {
                  console.warn(`Failed to delete part file by URL: ${fileDelete.fileName}`, error);
                }
              } else {
                // No URL means it's a new file - delete by ID
                await deletePartFile(equipmentId, fileDelete.fileId, fileDelete.folderPath || 'root');
              }
              
              // Track deletion for filtering from parts structure
              if (fileDelete.fileId) {
                deletedFileIds.add(fileDelete.fileId);
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

      // CRITICAL FIX: Handle parts files upload with proper auto-increment tracking
      // Get existing parts structure to determine next available indices
      const currentEquipment = await prisma.equipment.findUnique({
        where: { id: equipmentId },
        select: { equipment_parts: true }
      });
      
      let existingPartsStructure: { rootFiles: any[], folders: any[] } = { rootFiles: [], folders: [] };
      if (currentEquipment?.equipment_parts && currentEquipment.equipment_parts.length > 0) {
        try {
          const firstPart = currentEquipment.equipment_parts[0];
          if (typeof firstPart === 'string' && firstPart.startsWith('{')) {
            existingPartsStructure = JSON.parse(firstPart);
          }
        } catch (error) {
          console.warn('Could not parse existing parts structure for index calculation, starting from 0');
        }
      }
      
      // Get next available indices to prevent conflicts
      const { nextRootIndex, nextFolderIndex } = getNextFileIndices(existingPartsStructure);
      console.log(`🔢 Starting file indices - Root: ${nextRootIndex}, Folder: ${nextFolderIndex}`);
      
      // Process root parts files with proper auto-increment
      const partsUploadPromises: Promise<any>[] = [];
      let rootFileIndex = 0; // FormData index (always starts at 0)
      let actualRootIndex = nextRootIndex; // Actual file ID index (continues from existing)
      
      while (formData.get(`partsFile_root_${rootFileIndex}`)) {
        const partFile = formData.get(`partsFile_root_${rootFileIndex}`) as File;
        
        if (partFile && partFile.size > 0) {
          const fileId = `root_${actualRootIndex}_${Date.now()}`;
          console.log(`📁 Creating root file with ID: ${fileId} (FormData index: ${rootFileIndex})`);
          partsUploadPromises.push(
            uploadEquipmentPart(
              partFile,
              projectId,
              equipmentId,
              fileId,
              "" // empty folder path for root files - store directly in parts-management
            )
          );
          actualRootIndex++; // Increment the actual file ID index
        }
        rootFileIndex++; // Increment FormData index
      }
      
      // Process folder parts files with proper auto-increment
      let folderIndex = 0; // FormData folder index
      let fileIndex = 0; // FormData file index within folder
      let actualFolderFileIndex = nextFolderIndex; // Actual file ID index (continues from existing)
      
      while (formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`)) {
        const partFile = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
        const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
        
        if (partFile && partFile.size > 0 && folderName) {
          const fileId = `folder_${actualFolderFileIndex}_${Date.now()}`;
          console.log(`📁 Creating folder file with ID: ${fileId} (FormData indices: ${folderIndex}/${fileIndex})`);
          partsUploadPromises.push(
            uploadEquipmentPart(
              partFile,
              projectId,
              equipmentId,
              fileId,
              folderName // use actual folder name
            )
          );
          actualFolderFileIndex++; // Increment the actual file ID index
        }
        
        fileIndex++;
        // Check for next folder if no more files in current folder
        if (!formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`)) {
          folderIndex++;
          fileIndex = 0;
        }
      }
      
      // Upload all parts files in parallel and handle metadata
      let newPartsUploaded = false;
      if (partsUploadPromises.length > 0) {
        try {
          const partsResults = await Promise.all(partsUploadPromises);
          console.log(`📦 Successfully uploaded ${partsResults.length} parts files during update`);
          
          // Get existing parts structure from database
          const currentEquipment = await prisma.equipment.findUnique({
            where: { id: equipmentId },
            select: { equipment_parts: true }
          });
          
          // Parse existing parts structure
          let existingPartsStructure: { rootFiles: any[], folders: any[] } = { rootFiles: [], folders: [] };
          if (currentEquipment?.equipment_parts && currentEquipment.equipment_parts.length > 0) {
            try {
              const firstPart = currentEquipment.equipment_parts[0];
              if (typeof firstPart === 'string' && firstPart.startsWith('{')) {
                existingPartsStructure = JSON.parse(firstPart);
              }
            } catch (error) {
              console.warn('Could not parse existing parts structure, starting fresh');
            }
          }
          
          // CRITICAL FIX: Apply deletions to existing parts structure BEFORE adding new files
          if (deletedFileUrls.size > 0 || deletedFileIds.size > 0) {
            console.log('🗑️ Applying deletions to existing parts structure');
            
            // Filter deleted files from root files
            existingPartsStructure.rootFiles = existingPartsStructure.rootFiles.filter((file: any) => {
              const shouldDelete = deletedFileUrls.has(file.url || file.preview) || deletedFileIds.has(file.id);
              if (shouldDelete) {
                console.log(`🗑️ Removing from rootFiles: ${file.name}`);
              }
              return !shouldDelete;
            });
            
            // Filter deleted files from folders
            existingPartsStructure.folders = existingPartsStructure.folders.map((folder: any) => ({
              ...folder,
              files: folder.files.filter((file: any) => {
                const shouldDelete = deletedFileUrls.has(file.url || file.preview) || deletedFileIds.has(file.id);
                if (shouldDelete) {
                  console.log(`🗑️ Removing from folder "${folder.name}": ${file.name}`);
                }
                return !shouldDelete;
              })
            }));
            
            console.log(`🗑️ Applied deletions. Remaining files: ${existingPartsStructure.rootFiles.length} root, ${existingPartsStructure.folders.reduce((sum: number, f: any) => sum + f.files.length, 0)} in folders`);
          }
          
          // Add new uploaded parts to the structure
          if (partsResults.length > 0) {
            partsResults.forEach((partResult) => {
              const partData = {
                id: partResult.id,
                name: partResult.name,
                url: partResult.url,
                type: partResult.type,
                uploadedAt: new Date().toISOString()
              };
              
              // Determine if this is a root file or folder file based on fileId pattern
              if (partResult.id.startsWith('root_')) {
                existingPartsStructure.rootFiles.push(partData);
              } else if (partResult.id.startsWith('folder_')) {
                // Extract folder info from formData based on fileId pattern
                const idParts = partResult.id.split('_');
                const folderIndex = idParts[1];
                const fileIndex = idParts[2];
                
                // Find the folder name from formData
                const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
                
                if (folderName) {
                  // Find or create folder in existing structure
                  let targetFolder = existingPartsStructure.folders.find((f: any) => f.name === folderName);
                  if (!targetFolder) {
                    targetFolder = { name: folderName, files: [] };
                    existingPartsStructure.folders.push(targetFolder);
                  }
                  targetFolder.files.push(partData);
                }
              }
            });
            
            // Store the updated parts structure
            updateData.equipment_parts = [JSON.stringify(existingPartsStructure)];
            newPartsUploaded = true;
            console.log(`📝 Updated parts metadata for ${partsResults.length} new files in equipment_parts field`);
          }
        } catch (error) {
          console.error('❌ Parts upload failed during update:', error);
          // Continue processing - don't fail the entire request
        }
      }

      // Handle equipment parts updates - only update if no new files were uploaded
      if (!newPartsUploaded) {
        // Check for partsStructure data (modern format) first
        const partsStructureData = formData.get('partsStructure') as string;
        
        if (partsStructureData) {
          try {
            let partsStructure = JSON.parse(partsStructureData);
            console.log('📝 Processing partsStructure data for update');
            
            // CRITICAL FIX: Apply deletions to the parts structure being submitted
            if (deletedFileUrls.size > 0 || deletedFileIds.size > 0) {
              console.log('🗑️ Applying deletions to submitted parts structure');
              
              // Filter deleted files from root files
              if (partsStructure.rootFiles) {
                partsStructure.rootFiles = partsStructure.rootFiles.filter((file: any) => {
                  const shouldDelete = deletedFileUrls.has(file.url || file.preview) || deletedFileIds.has(file.id);
                  if (shouldDelete) {
                    console.log(`🗑️ Removing from submitted rootFiles: ${file.name}`);
                  }
                  return !shouldDelete;
                });
              }
              
              // Filter deleted files from folders
              if (partsStructure.folders) {
                partsStructure.folders = partsStructure.folders.map((folder: any) => ({
                  ...folder,
                  files: folder.files.filter((file: any) => {
                    const shouldDelete = deletedFileUrls.has(file.url || file.preview) || deletedFileIds.has(file.id);
                    if (shouldDelete) {
                      console.log(`🗑️ Removing from submitted folder "${folder.name}": ${file.name}`);
                    }
                    return !shouldDelete;
                  })
                }));
              }
              
              console.log(`🗑️ Applied deletions to submitted structure. Final count: ${(partsStructure.rootFiles || []).length} root, ${(partsStructure.folders || []).reduce((sum: number, f: any) => sum + (f.files?.length || 0), 0)} in folders`);
            }
            
            // Store the processed parts structure
            updateData.equipment_parts = [JSON.stringify(partsStructure)];
            console.log('📝 Updated equipment_parts with processed structure');
          } catch (error) {
            console.warn('Failed to process partsStructure data:', error);
          }
        } else {
          // Fall back to legacy equipmentParts format
          const equipmentPartsData = formData.get('equipmentParts') as string;
          
          if (equipmentPartsData) {
            try {
              const partsArray = JSON.parse(equipmentPartsData);
              if (Array.isArray(partsArray)) {
                // Filter and validate parts as strings
                const equipmentParts = partsArray
                  .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
                  .map(part => part.trim())
                  .slice(0, 50); // Reasonable limit
                
                updateData.equipment_parts = equipmentParts;
              }
            } catch (error) {
              // If parsing fails, try to handle as comma-separated string
              const equipmentParts = equipmentPartsData
                .split(',')
                .map(part => part.trim())
                .filter(part => part.length > 0)
                .slice(0, 50);
              
              if (equipmentParts.length > 0) {
                updateData.equipment_parts = equipmentParts;
              }
            }
          }
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

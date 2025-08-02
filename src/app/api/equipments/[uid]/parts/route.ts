import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'
import { randomUUID } from 'crypto'

const supabase = createServiceRoleClient()

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

// Upload equipment part with guaranteed unique naming and folder support
const uploadEquipmentPart = async (
  file: File,
  projectId: string,
  equipmentId: string,
  partNumber: number,
  folderPath: string = "main",
  uniqueId?: string,
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  type?: string
): Promise<string> => {
  const timestamp = Date.now();
  const fileUuid = uniqueId || randomUUID();
  const ext = file.name.split(".").pop();
  const sanitizedFileName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-]/g, "_");
  const filename = `${partNumber}_${sanitizedFileName}_${timestamp}_${fileUuid}.${ext}`;

  // NEW STRUCTURE: equipment-{equipmentId}/parts-management/{folderPath}/
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const sanitizedFolderPath = sanitizeForPath(folderPath);
  const filepath = `equipment-${equipmentId}/parts-management/${sanitizedFolderPath}/${filename}`;

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

/**
 * PATCH /api/equipments/[uid]/parts
 * Updates equipment parts structure with file upload support
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const handler = withResourcePermission('equipment', 'update', async (req: NextRequest, _user: AuthenticatedUser) => {
    try {
      const { uid } = await context.params
      const formData = await req.formData()

      // Check if equipment exists and get related data for file paths
      const existing = await prisma.equipment.findUnique({
        where: { id: uid },
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
        },
      })

      if (!existing) {
        return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
      }

      const projectName = existing.project.name
      const clientName = existing.project.client.name
      const { brand, model, type } = existing

      // Handle equipment parts updates - simplified approach following vehicles pattern
      const partsStructureData = formData.get('partsStructure') as string;
      let partsStructureWithUrls: any = null;
      
      if (partsStructureData) {
        try {
          const partsStructure = JSON.parse(partsStructureData);
          
          // CRITICAL FIX: Process deletions FIRST to ensure clean state
          // Handle file deletions - support both URL-based (existing files) and ID-based (new files)
          const deletePartsData = formData.get('deleteParts') as string;
          const deletedFileUrls = new Set<string>();
          const deletedFileIds = new Set<string>();
          
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
                      deletedFileUrls.add(fileDelete.fileUrl);
                      console.log(`🗑️ Deleted existing file: ${fileDelete.fileName}`);
                    } catch (error) {
                      console.warn(`Failed to delete part file by URL: ${fileDelete.fileName}`, error);
                    }
                  }
                  // Track deleted IDs for filtering
                  if (fileDelete.fileId) {
                    deletedFileIds.add(fileDelete.fileId);
                  }
                }
              }
              
              // Handle folder cascade deletions - delete all files in folder by iterating through them
              if (deleteRequests.folders && Array.isArray(deleteRequests.folders)) {
                for (const folderDelete of deleteRequests.folders) {
                  // For folder deletions, we would need to implement recursive directory deletion
                  // This would require more complex logic to list and delete all files in the folder
                  console.log(`🗂️ Folder deletion requested: ${folderDelete.folderName}`);
                }
              }
            } catch (error) {
              console.warn('Failed to process parts deletion requests:', error);
            }
          }
          
          // Legacy support: Handle simple file URL list (for backward compatibility)
          const filesToDelete = formData.get('filesToDelete') as string;
          if (filesToDelete) {
            const deleteList = JSON.parse(filesToDelete);
            for (const fileUrl of deleteList) {
              try {
                await deleteFileFromSupabase(fileUrl, 'equipment part');
                deletedFileUrls.add(fileUrl);
              } catch (error) {
                console.warn('Failed to delete equipment part file:', error);
              }
            }
          }

          // Create the final structure with uploaded URLs - only process NEW uploads
          const processedStructure = {
            rootFiles: [] as any[],
            folders: [] as any[]
          };
          
          // First, preserve existing files from partsStructure (those with URLs) that weren't deleted
          if (partsStructure.rootFiles && Array.isArray(partsStructure.rootFiles)) {
            for (const rootFile of partsStructure.rootFiles) {
              // Skip deleted files
              if (deletedFileUrls.has(rootFile.url) || deletedFileUrls.has(rootFile.preview) || deletedFileIds.has(rootFile.id)) {
                console.log(`⏭️ Skipping deleted file: ${rootFile.name}`);
                continue;
              }
              
              if (rootFile.url || rootFile.preview) {
                // This is an existing file that wasn't deleted, preserve it
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
          
          // Then, process new file uploads with guaranteed unique naming
          const formDataEntries = Array.from(formData.entries());
          const rootFileUploads = formDataEntries.filter(([key]) => key.startsWith('partsFile_root_new_'));
          const processedUploadKeys = new Set<string>();
          
          for (const [key, file] of rootFileUploads) {
            // Prevent duplicate processing of the same key
            if (processedUploadKeys.has(key)) {
              console.warn(`⚠️ Skipping duplicate upload key: ${key}`);
              continue;
            }
            processedUploadKeys.add(key);

            if (file instanceof File && file.size > 0) {
              const partName = formData.get(`${key}_name`) as string || file.name;
              const originalIndex = parseInt(formData.get(`${key}_originalIndex`) as string || '0');
              const uniqueFileId = randomUUID();
              
              try {
                const url = await uploadEquipmentPart(
                  file,
                  existing.project_id,
                  uid,
                  processedStructure.rootFiles.length + 1, // Use actual position for numbering
                  'root',
                  uniqueFileId, // Pass unique ID for guaranteed uniqueness
                  projectName,
                  clientName,
                  brand,
                  model,
                  type
                );
                
                processedStructure.rootFiles.push({
                  id: `root_new_${uniqueFileId}`,
                  name: partName,
                  url: url,
                  preview: url,
                  type: file.type.startsWith('image/') ? 'image' : 'document'
                });
                
                console.log(`✅ Successfully uploaded root file: ${partName} with ID: ${uniqueFileId}`);
              } catch (error) {
                console.error(`❌ Failed to upload new root file ${key}:`, error);
              }
            }
          }
          
          // Process folder files
          if (partsStructure.folders && Array.isArray(partsStructure.folders)) {
            for (const folder of partsStructure.folders) {
              const processedFolder = {
                id: folder.id,
                name: folder.name,
                files: [] as any[],
                created_at: folder.created_at
              };
              
              // First, preserve existing files in this folder that weren't deleted
              if (folder.files && Array.isArray(folder.files)) {
                for (const folderFile of folder.files) {
                  // Skip deleted files
                  if (deletedFileUrls.has(folderFile.url) || deletedFileUrls.has(folderFile.preview) || deletedFileIds.has(folderFile.id)) {
                    console.log(`⏭️ Skipping deleted folder file: ${folderFile.name}`);
                    continue;
                  }
                  
                  if (folderFile.url || folderFile.preview) {
                    // This is an existing file that wasn't deleted, preserve it
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
          
          // Then, process new folder file uploads with guaranteed unique naming
          const folderFileUploads = formDataEntries.filter(([key]) => key.startsWith('partsFile_folder_new_'));
          
          for (const [key, file] of folderFileUploads) {
            // Prevent duplicate processing of the same key
            if (processedUploadKeys.has(key)) {
              console.warn(`⚠️ Skipping duplicate folder upload key: ${key}`);
              continue;
            }
            processedUploadKeys.add(key);

            if (file instanceof File && file.size > 0) {
              const partName = formData.get(`${key}_name`) as string || file.name;
              const folderName = formData.get(`${key}_folder`) as string;
              const originalFolderIndex = parseInt(formData.get(`${key}_originalFolderIndex`) as string || '0');
              const originalFileIndex = parseInt(formData.get(`${key}_originalFileIndex`) as string || '0');
              const uniqueFileId = randomUUID();
              
              // Find the target folder in processedStructure
              const targetFolder = processedStructure.folders.find(f => f.name === folderName);
              
              if (targetFolder) {
                try {
                  const url = await uploadEquipmentPart(
                    file,
                    existing.project_id,
                    uid,
                    targetFolder.files.length + 1, // Use actual position for numbering
                    folderName,
                    uniqueFileId, // Pass unique ID for guaranteed uniqueness
                    projectName,
                    clientName,
                    brand,
                    model,
                    type
                  );
                  
                  targetFolder.files.push({
                    id: `folder_${folderName}_new_${uniqueFileId}`,
                    name: partName,
                    url: url,
                    preview: url,
                    type: file.type.startsWith('image/') ? 'image' : 'document'
                  });
                  
                  console.log(`✅ Successfully uploaded folder file: ${partName} in ${folderName} with ID: ${uniqueFileId}`);
                } catch (error) {
                  console.error(`❌ Failed to upload new folder file ${key}:`, error);
                }
              } else {
                console.warn(`⚠️ Target folder "${folderName}" not found for file upload ${key}`);
              }
            }
          }
          
          // Note: File deletions are now processed at the beginning of this function
          // to ensure clean state before processing uploads
          
          partsStructureWithUrls = processedStructure;
          
        } catch (error) {
          console.error('Failed to process parts structure:', error);
          return NextResponse.json(
            { error: 'Failed to process parts structure' },
            { status: 400 }
          );
        }
      } else {
        // Handle simple parts update (just JSON structure without files)
        const partsData = formData.get('equipmentParts') as string;
        if (partsData) {
          try {
            partsStructureWithUrls = JSON.parse(partsData);
          } catch (error) {
            return NextResponse.json(
              { error: 'Invalid parts data format' },
              { status: 400 }
            );
          }
        }
      }

      // Update the equipment parts
      const updateData: Record<string, any> = {};
      if (partsStructureWithUrls) {
        // Store as array with single JSON string element (to match existing API expectations)
        updateData.equipment_parts = [JSON.stringify(partsStructureWithUrls)];
      }

      // Update the equipment only if there are changes
      let updatedEquipment = existing;
      if (Object.keys(updateData).length > 0) {
        updatedEquipment = await prisma.equipment.update({
          where: { id: uid },
          data: updateData,
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
          },
        });
      }

      // Transform response to match the expected interface format
      const transformedEquipment = {
        uid: updatedEquipment.id,
        brand: updatedEquipment.brand,
        model: updatedEquipment.model,
        type: updatedEquipment.type,
        insuranceExpirationDate: updatedEquipment.insurance_expiration_date?.toISOString() || null,
        before: updatedEquipment.before || null,
        status: updatedEquipment.status,
        remarks: updatedEquipment.remarks || null,
        owner: updatedEquipment.owner,
        inspectionDate: updatedEquipment.inspection_date?.toISOString() || null,
        plateNumber: updatedEquipment.plate_number || null,
        // Keep existing URLs (not modified in parts tab)
        image_url: updatedEquipment.image_url || null,
        originalReceiptUrl: updatedEquipment.original_receipt_url || null,
        equipmentRegistrationUrl: updatedEquipment.equipment_registration_url || null,
        thirdpartyInspectionImage: updatedEquipment.thirdparty_inspection_image || null,
        pgpcInspectionImage: updatedEquipment.pgpc_inspection_image || null,
        // Updated equipment parts
        equipmentParts: updatedEquipment.equipment_parts && updatedEquipment.equipment_parts.length > 0 
          ? (() => {
              try {
                const rawParts = updatedEquipment.equipment_parts[0];
                
                // Check if it's a URL (legacy format)
                if (typeof rawParts === 'string' && rawParts.startsWith('http')) {
                  return {
                    rootFiles: updatedEquipment.equipment_parts.map((url, index) => ({
                      id: `legacy_${index}`,
                      name: url.split('/').pop() || `image_${index}`,
                      preview: url
                    })),
                    folders: []
                  };
                }
                
                // Try to parse as JSON (modern format)
                return JSON.parse(rawParts);
              } catch (error) {
                if (updatedEquipment.equipment_parts.length > 0) {
                  return {
                    rootFiles: updatedEquipment.equipment_parts.map((url, index) => ({
                      id: `legacy_${index}`,
                      name: url.split('/').pop() || `image_${index}`,
                      preview: url
                    })),
                    folders: []
                  };
                }
                return { rootFiles: [], folders: [] };
              }
            })()
          : { rootFiles: [], folders: [] },
        project: {
          uid: updatedEquipment.project.id,
          name: updatedEquipment.project.name,
          client: {
            uid: updatedEquipment.project.client.id,
            name: updatedEquipment.project.client.name,
            location: {
              uid: updatedEquipment.project.client.location.id,
              address: updatedEquipment.project.client.location.address,
            },
          },
        },
      }

      return NextResponse.json(transformedEquipment)
    } catch (error) {
      console.error('Equipment parts update error:', error)
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  })
  
  return handler(request)
}
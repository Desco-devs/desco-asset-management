import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'

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
                  const url = await uploadEquipmentPart(
                    partFile,
                    existing.project_id,
                    uid,
                    i + 1,
                    'root',
                    projectName,
                    clientName,
                    brand,
                    model,
                    type
                  );
                  
                  processedStructure.rootFiles.push({
                    id: `root_${i}_${Date.now()}`,
                    name: rootFile.name,
                    url: url,
                    preview: url,
                    type: partFile.type.startsWith('image/') ? 'image' : 'document'
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
                      const url = await uploadEquipmentPart(
                        partFile,
                        existing.project_id,
                        uid,
                        fileIndex + 1,
                        folder.name,
                        projectName,
                        clientName,
                        brand,
                        model,
                        type
                      );
                      
                      processedFolder.files.push({
                        id: `folder_${folder.name}_file_${fileIndex}_${Date.now()}`,
                        name: folderFile.name,
                        url: url,
                        preview: url,
                        type: partFile.type.startsWith('image/') ? 'image' : 'document'
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
          
          // Handle file deletions - support both URL-based (existing files) and ID-based (new files)
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
                  }
                  // Note: ID-based deletion for new files would need a deletePartFile function here
                  // but since this route handles existing equipment, files should have URLs
                }
              }
              
              // Handle folder cascade deletions - delete all files in folder by iterating through them
              if (deleteRequests.folders && Array.isArray(deleteRequests.folders)) {
                for (const folderDelete of deleteRequests.folders) {
                  // For folder deletions, we would need to implement recursive directory deletion
                  // This would require more complex logic to list and delete all files in the folder
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
              } catch (error) {
                console.warn('Failed to delete equipment part file:', error);
              }
            }
          }
          
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
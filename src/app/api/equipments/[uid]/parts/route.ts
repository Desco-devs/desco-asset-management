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

  // Create human-readable folder structure
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");

  let humanReadablePath = "";
  if (projectName && clientName && brand && model && type) {
    const readableProject = sanitizeForPath(`${projectName}_${clientName}`);
    const readableEquipment = sanitizeForPath(`${brand}_${model}_${type}`);
    humanReadablePath = `${readableProject}/${readableEquipment}`;
  } else {
    // Fallback to UUID structure
    humanReadablePath = `${projectId}/${equipmentId}`;
  }

  const sanitizedFolderPath = folderPath.replace(/[^a-zA-Z0-9_\-\/]/g, "_");
  const filepath = `${humanReadablePath}/${sanitizedFolderPath}/${filename}`;

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
export const PATCH = withResourcePermission(
  'equipment',
  'update',
  async (
    request: NextRequest,
    user: AuthenticatedUser,
    context: { params: Promise<{ uid: string }> }
  ) => {
    try {
      const { uid } = await context.params
      const formData = await request.formData()

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

      // Handle equipment parts updates with new standardized structure
      const partsStructureData = formData.get('partsStructure') as string;
      let partsStructureWithUrls = null;
      
      if (partsStructureData) {
        try {
          const partsStructure = JSON.parse(partsStructureData);
          
          // Initialize with existing structure to preserve empty folders
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
              
              partsStructureWithUrls.rootFiles.push({
                id: `root_${i}`,
                name: fileName,
                url: url,
                type: file.type.startsWith('image/') ? 'image' : 'document'
              });
            }
          }
          
          // Process existing root files (for existing data preservation)
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
          
          // Initialize folderMap with existing folders to preserve empty ones
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
                  existing.project_id,
                  uid,
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
          
          // Preserve existing files in folders
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
          
          // Handle file deletions
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
          
          // Convert folderMap to array
          partsStructureWithUrls.folders = Object.values(folderMap);
          
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
  }
)
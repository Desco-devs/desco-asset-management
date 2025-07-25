"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// Helper to upload files to Supabase with folder structure
const uploadFileToSupabase = async (
  file: File,
  projectId: string,
  equipmentId: string,
  prefix: string,
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  plateNumber?: string
): Promise<{ field: string; url: string }> => {
  const supabase = await createServerSupabaseClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const filename = `${prefix}_${timestamp}.${ext}`;
  
  // Create human-readable folder structure
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  let humanReadablePath = '';
  if (projectName && clientName && brand && model) {
    const readableProject = sanitizeForPath(`${projectName}_${clientName}`);
    const readableEquipment = sanitizeForPath(`${brand}_${model}_${plateNumber || 'Equipment'}`);
    humanReadablePath = `${readableProject}/${readableEquipment}`;
  } else {
    // Fallback to UUID structure
    humanReadablePath = `${projectId}/${equipmentId}`;
  }
  
  const filepath = `equipments/${humanReadablePath}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('equipments')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload ${prefix} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase
    .storage
    .from('equipments')
    .getPublicUrl(uploadData.path);

  return { field: getFieldName(prefix), url: urlData.publicUrl };
};

// Helper to upload parts files to Supabase with folder structure
const uploadPartFileToSupabase = async (
  file: File,
  fileName: string,
  projectId: string,
  equipmentId: string,
  folderName: string,
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  plateNumber?: string
): Promise<string> => {
  const supabase = await createServerSupabaseClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
  const uniqueFileName = `${sanitizedFileName}_${timestamp}.${ext}`;
  
  // Create human-readable folder structure for parts
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  let humanReadablePath = '';
  if (projectName && clientName && brand && model) {
    const readableProject = sanitizeForPath(`${projectName}_${clientName}`);
    const readableEquipment = sanitizeForPath(`${brand}_${model}_${plateNumber || 'Equipment'}`);
    humanReadablePath = `${readableProject}/${readableEquipment}`;
  } else {
    // Fallback to UUID structure
    humanReadablePath = `${projectId}/${equipmentId}`;
  }
  
  // Create the parts folder structure
  const sanitizedFolderName = sanitizeForPath(folderName);
  const filepath = `equipments/${humanReadablePath}/parts/${sanitizedFolderName}/${uniqueFileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('equipments')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload parts file failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase
    .storage
    .from('equipments')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
};

// Map file prefix to Prisma field name for equipment
const getFieldName = (prefix: string): string => {
  switch (prefix) {
    case 'equipment_image': return 'image_url';
    case 'thirdparty_inspection': return 'thirdparty_inspection_image';
    case 'pgpc_inspection': return 'pgpc_inspection_image';
    case 'original_receipt': return 'original_receipt_url';
    case 'equipment_registration': return 'equipment_registration_url';
    default: throw new Error(`Unknown prefix: ${prefix}`);
  }
};

export async function createEquipmentAction(formData: FormData) {
  try {
    // Get form data
    const brand = formData.get("brand") as string;
    const model = formData.get("model") as string;
    const type = formData.get("type") as string;
    const plateNumber = formData.get("plateNumber") as string;
    const owner = formData.get("owner") as string;
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as string;
    const inspectionDate = formData.get("inspectionDate") as string;
    const insuranceExpirationDate = formData.get("insuranceExpirationDate") as string;
    const before = formData.get("before") as string;
    const remarks = formData.get("remarks") as string;

    // Basic validation
    if (!brand || !model || !type || !owner || !projectId) {
      const missingFields = [
        !brand && 'brand',
        !model && 'model', 
        !type && 'type',
        !owner && 'owner',
        !projectId && 'projectId'
      ].filter(Boolean);
      
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    // Get project details for file organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          include: {
            location: true
          }
        }
      }
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Create equipment record first to get the ID
    const equipment = await prisma.equipment.create({
      data: {
        brand,
        model,
        type,
        plate_number: plateNumber || null,
        owner,
        project_id: projectId,
        status: status as "OPERATIONAL" | "NON_OPERATIONAL",
        inspection_date: inspectionDate ? new Date(inspectionDate) : null,
        insurance_expiration_date: insuranceExpirationDate ? new Date(insuranceExpirationDate) : null,
        before: before ? parseInt(before) : null,
        remarks: remarks || null,
        created_by: user.id, // Auto-populate from authenticated user
        created_at: new Date(),
        updated_at: new Date(),
      },
      include: {
        project: {
          include: {
            client: {
              include: {
                location: true
              }
            }
          }
        }
      }
    });

    // Handle regular file uploads
    const uploadPromises: Promise<{ field: string; url: string }>[] = [];
    const fileFields = [
      'equipmentImage',
      'thirdpartyInspection', 
      'pgpcInspection',
      'originalReceipt',
      'equipmentRegistration'
    ];

    const prefixMapping: { [key: string]: string } = {
      'equipmentImage': 'equipment_image',
      'thirdpartyInspection': 'thirdparty_inspection',
      'pgpcInspection': 'pgpc_inspection',
      'originalReceipt': 'original_receipt',
      'equipmentRegistration': 'equipment_registration'
    };

    fileFields.forEach(field => {
      const file = formData.get(field) as File;
      if (file && file.size > 0) {
        const prefix = prefixMapping[field];
        uploadPromises.push(
          uploadFileToSupabase(
            file,
            projectId,
            equipment.id,
            prefix,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          )
        );
      }
    });

    // Handle parts structure uploads
    const partsStructureData = formData.get('partsStructure') as string;
    let partsStructureWithUrls = null;
    
    if (partsStructureData) {
      const partsStructure = JSON.parse(partsStructureData);
      partsStructureWithUrls = {
        rootFiles: [],
        folders: []
      };
      
      // Upload root files and build structure
      for (let i = 0; formData.get(`partsFile_root_${i}`); i++) {
        const file = formData.get(`partsFile_root_${i}`) as File;
        const fileName = formData.get(`partsFile_root_${i}_name`) as string;
        
        if (file && file.size > 0) {
          const url = await uploadPartFileToSupabase(
            file,
            fileName,
            projectId,
            equipment.id,
            'root',
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
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
      
      for (let folderIndex = 0; formData.get(`partsFile_folder_${folderIndex}_0`); folderIndex++) {
        for (let fileIndex = 0; formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`); fileIndex++) {
          const file = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
          const fileName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_name`) as string;
          const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
          
          if (file && file.size > 0) {
            const url = await uploadPartFileToSupabase(
              file,
              fileName,
              projectId,
              equipment.id,
              folderName,
              project.name,
              project.client.name,
              brand,
              model,
              plateNumber
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
    }

    // Wait for all regular uploads to complete
    const uploadResults = await Promise.all(uploadPromises);

    // Update equipment with uploaded file URLs and parts data
    if (uploadResults.length > 0 || partsStructureWithUrls) {
      const updateData: { [key: string]: any } = {};
      
      // Add regular file URLs
      uploadResults.forEach(({ field, url }) => {
        updateData[field] = url;
      });
      
      // Add parts structure as JSON (preserving folder hierarchy)
      // Store as array with single JSON string element (to match existing API expectations)
      if (partsStructureWithUrls) {
        updateData.equipment_parts = [JSON.stringify(partsStructureWithUrls)];
      }

      await prisma.equipment.update({
        where: { id: equipment.id },
        data: {
          ...updateData,
          updated_at: new Date(),
        }
      });
    }

    // Revalidate the equipments page
    revalidatePath('/equipments');
    
    return { success: true, equipment };

  } catch (error: any) {
    console.error("Equipment creation error:", error);
    throw new Error(error.message || "Failed to create equipment");
  }
}

export async function updateEquipmentAction(formData: FormData) {
  try {
    // Get form data
    const equipmentId = formData.get("equipmentId") as string;
    const brand = formData.get("brand") as string;
    const model = formData.get("model") as string;
    const type = formData.get("type") as string;
    const plateNumber = formData.get("plateNumber") as string;
    const owner = formData.get("owner") as string;
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as string;
    const inspectionDate = formData.get("inspectionDate") as string;
    const insuranceExpirationDate = formData.get("insuranceExpirationDate") as string;
    const before = formData.get("before") as string;
    const remarks = formData.get("remarks") as string;

    // Basic validation
    if (!equipmentId || !brand || !model || !type || !owner || !projectId) {
      const missingFields = [
        !equipmentId && 'equipmentId',
        !brand && 'brand',
        !model && 'model', 
        !type && 'type',
        !owner && 'owner',
        !projectId && 'projectId'
      ].filter(Boolean);
      
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id }
    });

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    // Get existing equipment
    const existingEquipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      include: {
        project: {
          include: {
            client: {
              include: {
                location: true
              }
            }
          }
        }
      }
    });

    if (!existingEquipment) {
      throw new Error("Equipment not found");
    }

    // Get project details for file organization
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          include: {
            location: true
          }
        }
      }
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Update equipment record first
    const updateData: any = {
      brand,
      model,
      type,
      plate_number: plateNumber || null,
      owner,
      project_id: projectId,
      status: status as "OPERATIONAL" | "NON_OPERATIONAL",
      inspection_date: inspectionDate ? new Date(inspectionDate) : null,
      insurance_expiration_date: insuranceExpirationDate ? new Date(insuranceExpirationDate) : null,
      before: before ? parseInt(before) : null,
      remarks: remarks || null,
      updated_at: new Date(),
    };

    // Handle regular file uploads (if new files are provided)
    const uploadPromises: Promise<{ field: string; url: string }>[] = [];
    const fileFields = [
      'equipmentImage',
      'thirdpartyInspection', 
      'pgpcInspection',
      'originalReceipt',
      'equipmentRegistration'
    ];

    const prefixMapping: { [key: string]: string } = {
      'equipmentImage': 'equipment_image',
      'thirdpartyInspection': 'thirdparty_inspection',
      'pgpcInspection': 'pgpc_inspection',
      'originalReceipt': 'original_receipt',
      'equipmentRegistration': 'equipment_registration'
    };

    fileFields.forEach(field => {
      const file = formData.get(field) as File;
      if (file && file.size > 0) {
        const prefix = prefixMapping[field];
        uploadPromises.push(
          uploadFileToSupabase(
            file,
            projectId,
            equipmentId,
            prefix,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          )
        );
      }
    });

    // Handle parts structure uploads
    const partsStructureData = formData.get('partsStructure') as string;
    let partsStructureWithUrls = null;
    
    if (partsStructureData) {
      const partsStructure = JSON.parse(partsStructureData);
      partsStructureWithUrls = {
        rootFiles: [],
        folders: []
      };
      
      // Upload root files and build structure
      for (let i = 0; formData.get(`partsFile_root_${i}`); i++) {
        const file = formData.get(`partsFile_root_${i}`) as File;
        const fileName = formData.get(`partsFile_root_${i}_name`) as string;
        
        if (file && file.size > 0) {
          const url = await uploadPartFileToSupabase(
            file,
            fileName,
            projectId,
            equipmentId,
            'root',
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
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
      
      for (let folderIndex = 0; formData.get(`partsFile_folder_${folderIndex}_0`); folderIndex++) {
        for (let fileIndex = 0; formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`); fileIndex++) {
          const file = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
          const fileName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_name`) as string;
          const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
          
          if (file && file.size > 0) {
            const url = await uploadPartFileToSupabase(
              file,
              fileName,
              projectId,
              equipmentId,
              folderName,
              project.name,
              project.client.name,
              brand,
              model,
              plateNumber
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
    }

    // Wait for all regular uploads to complete
    const uploadResults = await Promise.all(uploadPromises);

    // Add upload results to update data
    if (uploadResults.length > 0) {
      uploadResults.forEach(({ field, url }) => {
        updateData[field] = url;
      });
    }
    
    // Add parts structure as JSON (preserving folder hierarchy)
    // Store as array with single JSON string element (to match existing API expectations)
    if (partsStructureWithUrls) {
      updateData.equipment_parts = [JSON.stringify(partsStructureWithUrls)];
    }

    // Update equipment
    const equipment = await prisma.equipment.update({
      where: { id: equipmentId },
      data: updateData,
      include: {
        project: {
          include: {
            client: {
              include: {
                location: true
              }
            }
          }
        }
      }
    });

    // Revalidate the equipments page
    revalidatePath('/equipments');
    
    return { success: true, equipment };

  } catch (error: any) {
    console.error("Equipment update error:", error);
    throw new Error(error.message || "Failed to update equipment");
  }
}
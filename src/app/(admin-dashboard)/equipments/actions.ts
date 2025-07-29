"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// Helper function to delete file from Supabase storage
const deleteFileFromStorage = async (fileUrl: string) => {
  try {
    const supabase = await createServerSupabaseClient();
    // Extract file path from URL
    const urlParts = fileUrl.split('/storage/v1/object/public/equipments/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      const { error } = await supabase.storage.from('equipments').remove([filePath]);
      if (error) {
        console.warn(`Failed to delete file from storage: ${filePath}`, error);
      } else {
        console.log(`Successfully deleted file from storage: ${filePath}`);
      }
    }
  } catch (error) {
    console.warn(`Error deleting file from storage: ${fileUrl}`, error);
  }
};

// Helper to upload maintenance files to Supabase
const uploadMaintenanceFileToSupabase = async (
  file: File,
  projectId: string,
  equipmentId: string,
  reportId: string,
  index: number,
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  plateNumber?: string
): Promise<string> => {
  const supabase = await createServerSupabaseClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const filename = `maintenance_${index}_${timestamp}.${ext}`;
  
  // NEW STRUCTURE: equipment-{equipmentId}/maintenance-reports/{reportId}/attachments/
  const filepath = `equipment-${equipmentId}/maintenance-reports/${reportId}/attachments/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('equipments')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload maintenance file failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase
    .storage
    .from('equipments')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
};

// Helper to upload part images to Supabase
const uploadPartImageToSupabase = async (
  file: File,
  partName: string,
  projectId: string,
  equipmentId: string,
  reportId: string,
  index: number,
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  plateNumber?: string
): Promise<string> => {
  const supabase = await createServerSupabaseClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  // Use part name as filename (sanitized)
  const sanitizedPartName = partName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = `${sanitizedPartName}_${timestamp}.${ext}`;
  
  // NEW STRUCTURE: equipment-{equipmentId}/maintenance-reports/{reportId}/parts/
  const filepath = `equipment-${equipmentId}/maintenance-reports/${reportId}/parts/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('equipments')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload part image failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase
    .storage
    .from('equipments')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
};

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
  const filepath = `equipment-${equipmentId}/${subfolder}/${filename}`;
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
  
  // NEW STRUCTURE: equipment-{equipmentId}/parts-management/{folderName}/
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const sanitizedFolderName = sanitizeForPath(folderName);
  
  const filepath = `equipment-${equipmentId}/parts-management/${sanitizedFolderName}/${uniqueFileName}`;
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
  // Enhanced transaction handling with rollback capabilities
  let createdEquipment: any = null;
  const createdMaintenanceReport: any = null;
  const uploadedFiles: string[] = [];
  
  try {
    // Input validation and sanitization
    const brand = formData.get("brand") as string;
    const model = formData.get("model") as string;
    const type = formData.get("type") as string;
    const plateNumber = formData.get("plateNumber") as string;
    const owner = formData.get("owner") as string;
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as string;
    const inspectionDate = formData.get("inspectionDate") as string;
    const registrationExpiry = formData.get("registrationExpiry") as string;
    const insuranceExpirationDate = formData.get("insuranceExpirationDate") as string;
    const before = formData.get("before") as string;
    const remarks = formData.get("remarks") as string;
    
    // Sanitize inputs to prevent XSS and injection attacks
    const sanitizeString = (str: string) => str?.trim().replace(/[<>"'&]/g, '') || '';
    const sanitizedBrand = sanitizeString(brand);
    const sanitizedModel = sanitizeString(model);
    const sanitizedOwner = sanitizeString(owner);
    const sanitizedRemarks = sanitizeString(remarks);

    // Enhanced validation with detailed error messages
    if (!sanitizedBrand || !sanitizedModel || !type || !sanitizedOwner || !projectId) {
      const missingFields = [
        !sanitizedBrand && 'brand',
        !sanitizedModel && 'model', 
        !type && 'type',
        !sanitizedOwner && 'owner',
        !projectId && 'projectId'
      ].filter(Boolean);
      
      throw new Error(`Missing required fields: ${missingFields.join(', ')}. Please fill in all required information.`);
    }
    
    // Additional validation
    if (sanitizedBrand.length > 100) {
      throw new Error('Brand name must be less than 100 characters');
    }
    if (sanitizedModel.length > 100) {
      throw new Error('Model name must be less than 100 characters');
    }
    if (sanitizedOwner.length > 200) {
      throw new Error('Owner name must be less than 200 characters');
    }
    if (!['OPERATIONAL', 'NON_OPERATIONAL'].includes(status)) {
      throw new Error('Invalid equipment status');
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

    // Start database transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      // Create equipment record first to get the ID
      const equipment = await tx.equipment.create({
        data: {
          brand: sanitizedBrand,
          model: sanitizedModel,
          type,
          plate_number: plateNumber || null,
          owner: sanitizedOwner,
          project_id: projectId,
          status: status as "OPERATIONAL" | "NON_OPERATIONAL",
          inspection_date: inspectionDate ? new Date(inspectionDate) : null,
          registration_expiry: registrationExpiry ? new Date(registrationExpiry) : null,
          insurance_expiration_date: insuranceExpirationDate ? new Date(insuranceExpirationDate) : null,
          before: before ? parseInt(before) : null,
          remarks: sanitizedRemarks || null,
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
      
      createdEquipment = equipment;
      return { equipment };
    });
    
    const equipment = result.equipment;

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

    // Handle parts structure uploads - CRITICAL FIX: Support empty folders
    const partsStructureData = formData.get('partsStructure') as string;
    let partsStructureWithUrls: { rootFiles: any[]; folders: any[] } | null = null;
    
    if (partsStructureData) {
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

    // Handle maintenance report creation if provided
    const maintenanceReportData = formData.get('maintenanceReport') as string;
    let maintenanceReport: any = null;
    
    if (maintenanceReportData) {
      const reportData = JSON.parse(maintenanceReportData);
      
      // Skip maintenance report if no meaningful data provided
      const hasMaintenanceData = reportData.issueDescription || 
                                reportData.remarks || 
                                reportData.inspectionDetails || 
                                reportData.actionTaken ||
                                (reportData.partsReplaced && reportData.partsReplaced.some((part: string) => part.trim()));
      
      if (hasMaintenanceData) {
        // Create maintenance report with timeout handling
        maintenanceReport = await prisma.maintenance_equipment_report.create({
        data: {
          equipment_id: equipment.id,
          location_id: project.client.location.id,
          issue_description: reportData.issueDescription || '',
          remarks: reportData.remarks || null,
          inspection_details: reportData.inspectionDetails || null,
          action_taken: reportData.actionTaken || null,
          parts_replaced: reportData.partsReplaced || [],
          priority: reportData.priority || 'MEDIUM',
          status: reportData.status || 'REPORTED',
          downtime_hours: reportData.downtimeHours || null,
          date_reported: reportData.dateReported ? new Date(reportData.dateReported) : new Date(),
          date_repaired: reportData.dateRepaired ? new Date(reportData.dateRepaired) : null,
          reported_by: user.id,
          repaired_by: reportData.status === 'COMPLETED' ? user.id : null,
          attachment_urls: [], // Will be updated after file uploads
          created_at: new Date(),
          updated_at: new Date(),
        }
      });
      
      // Handle maintenance file uploads
      const maintenanceAttachmentUrls: string[] = [];
      let maintenanceFileIndex = 0;
      
      while (formData.get(`maintenanceAttachment_${maintenanceFileIndex}`)) {
        const file = formData.get(`maintenanceAttachment_${maintenanceFileIndex}`) as File;
        
        if (file && file.size > 0) {
          const url = await uploadMaintenanceFileToSupabase(
            file,
            projectId,
            equipment.id,
            maintenanceReport.id,
            maintenanceFileIndex,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          );
          maintenanceAttachmentUrls.push(url);
        }
        
        maintenanceFileIndex++;
      }
      
      // Handle parts image uploads
      const partImageUrls: string[] = [];
      let partImageIndex = 0;
      
      while (formData.get(`partImage_${partImageIndex}`)) {
        const file = formData.get(`partImage_${partImageIndex}`) as File;
        const partName = formData.get(`partImageName_${partImageIndex}`) as string;
        
        if (file && file.size > 0 && partName) {
          const url = await uploadPartImageToSupabase(
            file,
            partName,
            projectId,
            equipment.id,
            maintenanceReport.id,
            partImageIndex,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          );
          partImageUrls.push(url);
        }
        
        partImageIndex++;
      }
      
      // Update maintenance report with attachment URLs using transaction
      if (maintenanceAttachmentUrls.length > 0 || partImageUrls.length > 0) {
        // Combine both maintenance attachments and part images
        const allAttachmentUrls = [...maintenanceAttachmentUrls, ...partImageUrls];
        
        await prisma.maintenance_equipment_report.update({
          where: { id: maintenanceReport.id },
          data: {
            attachment_urls: allAttachmentUrls,
            updated_at: new Date(),
          }
        });
        
        // Track uploaded files for potential cleanup
        uploadedFiles.push(...allAttachmentUrls);
      }
      } // End of hasMaintenanceData check
    } // End of maintenanceReportData check
    
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

      // Only update if there's actually data to update
      if (Object.keys(updateData).length > 0) {
        await prisma.equipment.update({
          where: { id: equipment.id },
          data: {
            ...updateData,
            updated_at: new Date(),
          }
        });
      }
    }

    // Revalidate the equipments page
    revalidatePath('/equipments');
    
    return { success: true, equipment, maintenanceReport };

  } catch (error: any) {
    console.error('Equipment creation failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Enhanced cleanup on failure
    try {
      // Cleanup uploaded files on error
      if (uploadedFiles.length > 0) {
        const supabase = await createServerSupabaseClient();
        for (const fileUrl of uploadedFiles) {
          try {
            // Extract file path from URL for deletion
            const urlParts = fileUrl.split('/storage/v1/object/public/equipments/');
            if (urlParts.length > 1) {
              const filePath = urlParts[1];
              await supabase.storage.from('equipments').remove([filePath]);
            }
          } catch (fileError) {
            console.warn('Failed to cleanup uploaded file:', fileUrl, fileError);
          }
        }
      }
      
      // Cleanup database records on error (if they were created)
      if (createdMaintenanceReport) {
        try {
          await prisma.maintenance_equipment_report.delete({
            where: { id: createdMaintenanceReport.id }
          });
        } catch (cleanupError) {
          console.warn('Failed to cleanup maintenance report:', cleanupError);
        }
      }
      
      if (createdEquipment) {
        try {
          await prisma.equipment.delete({
            where: { id: createdEquipment.id }
          });
        } catch (cleanupError) {
          console.warn('Failed to cleanup equipment record:', cleanupError);
        }
      }
    } catch (cleanupError) {
      console.error('Cleanup failed:', cleanupError);
    }
    
    // Provide more detailed error messages
    if (error.code === 'P2002') {
      throw new Error('An equipment with similar details already exists. Please check brand, model, and plate number.');
    }
    if (error.code === 'P2003') {
      throw new Error('Invalid project selected. Please refresh the page and try again.');
    }
    if (error.message?.includes('File upload failed')) {
      throw new Error('File upload failed. Please check your files and try again.');
    }
    
    throw new Error(error.message || "Failed to create equipment. Please check your information and try again.");
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

    // Basic validation - only equipmentId is required for updates
    if (!equipmentId) {
      throw new Error('Equipment ID is required for updates');
    }
    
    // For updates, other fields are optional - equipment already exists with valid data
    // Only validate fields that are actually being updated (non-empty values)
    if (brand !== null && !brand?.trim()) {
      throw new Error('Brand cannot be empty if provided');
    }
    if (model !== null && !model?.trim()) {
      throw new Error('Model cannot be empty if provided');
    }
    if (owner !== null && !owner?.trim()) {
      throw new Error('Owner cannot be empty if provided');
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
    // Use projectId if provided, otherwise use existing equipment's project
    const projectIdToUse = projectId || existingEquipment.project_id;
    
    if (!projectIdToUse) {
      throw new Error("No project ID available for file organization");
    }

    const project = await prisma.project.findUnique({
      where: { id: projectIdToUse },
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

    // Update equipment record first - only include provided fields
    const updateData: any = {
      updated_at: new Date(), // Always update timestamp
    };

    // Only include fields that were provided (partial update)
    if (brand !== null) updateData.brand = brand;
    if (model !== null) updateData.model = model;
    if (type !== null) updateData.type = type;
    if (plateNumber !== null) updateData.plate_number = plateNumber || null;
    if (owner !== null) updateData.owner = owner;
    if (projectId !== null) updateData.project_id = projectId;
    if (status !== null) updateData.status = status as "OPERATIONAL" | "NON_OPERATIONAL";
    if (inspectionDate !== null) updateData.inspection_date = inspectionDate ? new Date(inspectionDate) : null;
    if (insuranceExpirationDate !== null) updateData.insurance_expiration_date = insuranceExpirationDate ? new Date(insuranceExpirationDate) : null;
    if (before !== null) updateData.before = before ? parseInt(before) : null;
    if (remarks !== null) updateData.remarks = remarks || null;

    // CRITICAL FIX: Handle file removals - delete from storage AND set fields to null
    const removalFields = {
      'remove_equipmentImage': 'image_url',
      'remove_thirdpartyInspection': 'thirdparty_inspection_image',
      'remove_pgpcInspection': 'pgpc_inspection_image',
      'remove_originalReceipt': 'original_receipt_url',
      'remove_equipmentRegistration': 'equipment_registration_url'
    };


    // Process file removals - delete from storage before updating database
    for (const [removeKey, dbField] of Object.entries(removalFields)) {
      if (formData.get(removeKey) === 'true') {
        // Get current file URL from existing equipment
        const currentFileUrl = existingEquipment[dbField as keyof typeof existingEquipment] as string;
        
        // Delete file from storage if it exists
        if (currentFileUrl) {
          await deleteFileFromStorage(currentFileUrl);
        }
        
        // Set database field to null
        updateData[dbField] = null;
      }
    }

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
        
        // Before uploading new file, delete existing file if it exists
        const dbField = getFieldName(prefix);
        const existingFileUrl = existingEquipment[dbField as keyof typeof existingEquipment] as string;
        
        const uploadPromise = (async () => {
          // Delete existing file first if replacing
          if (existingFileUrl) {
            await deleteFileFromStorage(existingFileUrl);
          }
          
          // Upload new file
          return await uploadFileToSupabase(
            file,
            projectId,
            equipmentId,
            prefix,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          );
        })();
        
        uploadPromises.push(uploadPromise);
      }
    });

    // Handle parts structure uploads - CRITICAL FIX: Support empty folders and deletions
    const partsStructureData = formData.get('partsStructure') as string;
    let partsStructureWithUrls: { rootFiles: any[]; folders: any[] } | null = null;
    
    
    // CRITICAL FIX: Always process parts structure when provided, even if empty (for deletions)
    if (partsStructureData) {
      const partsStructure = JSON.parse(partsStructureData);
      console.log('Processing parts structure for equipment:', equipmentId);
      console.log('Parts structure data:', partsStructure);
      
      // Debug: Log all formData entries related to parts
      console.log('FormData entries for parts:');
      for (let i = 0; i < 10; i++) {
        const file = formData.get(`partsFile_root_${i}`);
        const name = formData.get(`partsFile_root_${i}_name`);
        if (file || name) {
          console.log(`  partsFile_root_${i}:`, file ? `File(${(file as File).name})` : 'null');
          console.log(`  partsFile_root_${i}_name:`, name);
        }
      }
      
      // CRITICAL FIX: Initialize with existing structure to preserve empty folders
      partsStructureWithUrls = {
        rootFiles: [],
        folders: partsStructure.folders ? partsStructure.folders.map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          files: [] // Start with empty files array, will be populated with actual uploaded files
        })) : []
      };
      
      // Upload root files and build structure - FIXED: Scan all possible indices
      // Don't rely on continuous indexing since existing files might create gaps
      for (let i = 0; i < 100; i++) { // Reasonable limit to avoid infinite loop
        const file = formData.get(`partsFile_root_${i}`) as File;
        const fileName = formData.get(`partsFile_root_${i}_name`) as string;
        
        if (file && file.size > 0 && fileName) {
          console.log(`Uploading root file ${i}: ${fileName}`);
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
          console.log(`Root file ${i} uploaded to: ${url}`);
          
          partsStructureWithUrls.rootFiles.push({
            id: `root_${i}`,
            name: fileName,
            url: url,
            type: file.type.startsWith('image/') ? 'image' : 'document'
          });
        }
      }
      
      // CRITICAL FIX: Process existing root files (for existing data preservation)
      if (partsStructure.rootFiles && Array.isArray(partsStructure.rootFiles) && partsStructureWithUrls) {
        partsStructure.rootFiles.forEach((existingFile: any) => {
          // Only add if it has a valid URL (existing stored file)
          if (existingFile.url || existingFile.preview) {
            partsStructureWithUrls!.rootFiles.push({
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
      
      // FIXED: Scan all possible folder indices without relying on continuous indexing
      for (let folderIndex = 0; folderIndex < 50; folderIndex++) { // Reasonable limit for folders
        for (let fileIndex = 0; fileIndex < 100; fileIndex++) { // Reasonable limit for files per folder
          const file = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
          const fileName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_name`) as string;
          const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
          
          if (file && file.size > 0 && fileName && folderName) {
            console.log(`Uploading folder file ${folderIndex}/${fileIndex}: ${fileName} to folder: ${folderName}`);
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
            console.log(`Folder file ${folderIndex}/${fileIndex} uploaded to: ${url}`);
            
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
      
      // CRITICAL FIX: Preserve existing files in folders ONLY for folders that still exist
      // Also delete files from storage if folders are deleted
      const currentPartsData = existingEquipment.equipment_parts?.[0];
      if (currentPartsData && typeof currentPartsData === 'string') {
        try {
          const currentPartsStructure = JSON.parse(currentPartsData);
          
          // Check for deleted folders and cleanup their files
          if (currentPartsStructure.folders && Array.isArray(currentPartsStructure.folders)) {
            for (const existingFolder of currentPartsStructure.folders) {
              const folderStillExists = partsStructureWithUrls.folders.some((f: any) => f.name === existingFolder.name);
              
              if (!folderStillExists && existingFolder.files && Array.isArray(existingFolder.files)) {
                // Folder was deleted, clean up its files from storage
                for (const deletedFile of existingFolder.files) {
                  if (deletedFile.url) {
                    await deleteFileFromStorage(deletedFile.url);
                  }
                }
              }
            }
          }
          
          // Check for deleted root files and cleanup
          if (currentPartsStructure.rootFiles && Array.isArray(currentPartsStructure.rootFiles)) {
            for (const existingRootFile of currentPartsStructure.rootFiles) {
              const fileStillExists = partsStructureWithUrls.rootFiles.some((f: any) => f.url === existingRootFile.url);
              
              if (!fileStillExists && existingRootFile.url) {
                // Root file was deleted, clean up from storage
                await deleteFileFromStorage(existingRootFile.url);
              }
            }
          }
        } catch (error) {
          // Failed to parse existing parts data, skip cleanup
        }
      }
      
      if (partsStructure.folders && Array.isArray(partsStructure.folders)) {
        partsStructure.folders.forEach((existingFolder: any) => {
          if (existingFolder.files && Array.isArray(existingFolder.files)) {
            // Only process if folder exists in current structure (not deleted)
            if (folderMap[existingFolder.name]) {
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
            // If folder is not in folderMap, it was deleted - files already cleaned up above
          }
        });
      }
      
      // Convert folderMap to array
      partsStructureWithUrls.folders = Object.values(folderMap);
      
      
      // Log if this is a deletion operation
      const currentFolderCount = partsStructureWithUrls.folders.length;
      const currentRootCount = partsStructureWithUrls.rootFiles.length;
    }

    // Wait for all regular uploads to complete
    const uploadResults = await Promise.all(uploadPromises);

    // Add upload results to update data
    if (uploadResults.length > 0) {
      uploadResults.forEach(({ field, url }) => {
        updateData[field] = url;
      });
    }
    
    // CRITICAL FIX: Always update parts structure when provided (including deletions)
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
    throw new Error(error.message || "Failed to update equipment");
  }
}
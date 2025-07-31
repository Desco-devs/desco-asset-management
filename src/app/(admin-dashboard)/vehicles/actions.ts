"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// Helper to upload files to Supabase with organized folder structure (following equipment pattern)
const uploadFileToSupabase = async (
  file: File,
  projectId: string,
  vehicleId: string,
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
  
  // Generate descriptive filenames based on prefix
  let baseFilename: string;
  
  switch (prefix) {
    case 'front':
      baseFilename = `front-view`;
      break;
    case 'back':
      baseFilename = `back-view`;
      break;
    case 'side1':
      baseFilename = `side1-view`;
      break;
    case 'side2':
      baseFilename = `side2-view`;
      break;
    case 'receipt':
      baseFilename = `original-receipt`;
      break;
    case 'registration':
      baseFilename = `car-registration`;
      break;
    case 'pgpc_inspection':
      baseFilename = `pgpc-inspection`;
      break;
    default:
      baseFilename = prefix;
  }
  
  // Get subfolder based on file type (following equipment pattern)
  const getSubfolder = (prefix: string) => {
    switch (prefix) {
      case 'front':
      case 'back':
      case 'side1':
      case 'side2':
        return 'vehicle-images';
      case 'receipt':
      case 'registration':
      case 'pgpc_inspection':
        return 'vehicle-documents';
      default:
        return 'vehicle-files';
    }
  };
  
  const subfolder = getSubfolder(prefix);
  const filename = `${baseFilename}-${timestamp}.${ext}`;
  const filepath = `vehicle-${vehicleId}/${subfolder}/${filename}`;
  
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('vehicles')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload ${prefix} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase
    .storage
    .from('vehicles')
    .getPublicUrl(uploadData.path);

  return { field: getFieldName(prefix), url: urlData.publicUrl };
};

// Map file prefix to Prisma field name
const getFieldName = (prefix: string): string => {
  switch (prefix) {
    case 'front': return 'front_img_url';
    case 'back': return 'back_img_url';
    case 'side1': return 'side1_img_url';
    case 'side2': return 'side2_img_url';
    case 'receipt': return 'original_receipt_url';
    case 'registration': return 'car_registration_url';
    case 'pgpc_inspection': return 'pgpc_inspection_image';
    default: throw new Error(`Unknown prefix: ${prefix}`);
  }
};

export async function createVehicleAction(formData: FormData) {
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
    const expiryDate = formData.get("expiryDate") as string;
    const registrationExpiry = formData.get("registrationExpiry") as string;
    const before = formData.get("before") as string;
    const remarks = formData.get("remarks") as string;

    // Basic validation with specific error messages
    const missingFields = [];
    if (!brand?.trim()) missingFields.push("Brand");
    if (!model?.trim()) missingFields.push("Model");
    if (!type?.trim()) missingFields.push("Vehicle Type");
    if (!plateNumber?.trim()) missingFields.push("Plate Number");
    if (!owner?.trim()) missingFields.push("Owner");
    if (!projectId?.trim()) missingFields.push("Project");
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Please fill in the following required fields: ${missingFields.join(", ")}`,
        validationError: true
      };
    }

    // Additional validation with enhanced error handling
    if (inspectionDate && isNaN(Date.parse(inspectionDate))) {
      return {
        success: false,
        error: "Please enter a valid inspection date",
        validationError: true
      };
    }

    if (expiryDate && isNaN(Date.parse(expiryDate))) {
      return {
        success: false,
        error: "Please enter a valid expiry date",
        validationError: true
      };
    }

    if (registrationExpiry && isNaN(Date.parse(registrationExpiry))) {
      return {
        success: false,
        error: "Please enter a valid registration expiry date",
        validationError: true
      };
    }

    if (before && (isNaN(parseInt(before)) || parseInt(before) < 0)) {
      return {
        success: false,
        error: "Days before expiry must be a valid positive number",
        validationError: true
      };
    }

    // Validate status enum
    if (status && !['OPERATIONAL', 'NON_OPERATIONAL'].includes(status)) {
      return {
        success: false,
        error: "Invalid status value. Must be OPERATIONAL or NON_OPERATIONAL",
        validationError: true
      };
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return {
        success: false,
        error: "Authentication required. Please log in and try again.",
        authError: true
      };
    }

    // Get user profile
    let userProfile;
    try {
      userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          user_status: true,
        },
      });
    } catch (dbError) {
      console.error("Database error fetching user profile:", dbError);
      return {
        success: false,
        error: "Unable to verify user permissions. Please try again.",
        dbError: true
      };
    }

    if (!userProfile) {
      return {
        success: false,
        error: "User profile not found. Please contact support.",
        authError: true
      };
    }

    if (userProfile.user_status !== 'ACTIVE') {
      return {
        success: false,
        error: "Your account is inactive. Please contact an administrator.",
        authError: true
      };
    }

    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      return {
        success: false,
        error: "You don't have permission to create vehicles. Admin access required.",
        permissionError: true
      };
    }

    // Validate project exists and get project details for file organization
    let project;
    try {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: {
            include: {
              location: true
            }
          }
        }
      });
    } catch (dbError) {
      console.error("Database error fetching project:", dbError);
      return {
        success: false,
        error: "Unable to validate project. Please try again.",
        dbError: true
      };
    }

    if (!project) {
      return {
        success: false,
        error: "Selected project not found. Please refresh the page and try again.",
        validationError: true
      };
    }

    // Create vehicle first (without files)
    let vehicle;
    try {
      // Ensure we have valid dates
      const parsedInspectionDate = inspectionDate ? new Date(inspectionDate) : new Date();
      const parsedExpiryDate = expiryDate ? new Date(expiryDate) : null;
      const parsedRegistrationExpiry = registrationExpiry ? new Date(registrationExpiry) : null;
      
      // Validate that expiry date is after inspection date if both are provided
      if (parsedExpiryDate && parsedInspectionDate && parsedExpiryDate <= parsedInspectionDate) {
        return {
          success: false,
          error: "Expiry date must be after the inspection date",
          validationError: true
        };
      }
      
      vehicle = await prisma.vehicle.create({
        data: {
          brand: brand.trim(),
          model: model.trim(),
          type: type.trim(),
          plate_number: plateNumber.trim().toUpperCase(),
          owner: owner.trim(),
          status: status as "OPERATIONAL" | "NON_OPERATIONAL",
          inspection_date: parsedInspectionDate,
          expiry_date: parsedExpiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default to 1 year from now
          registration_expiry: parsedRegistrationExpiry,
          before: before ? parseInt(before) : 30, // Default to 30 days before expiry
          remarks: remarks?.trim() || null,
          project: { connect: { id: projectId } },
          user: { connect: { id: userProfile.id } },
        },
      });
    } catch (dbError) {
      console.error("Database error creating vehicle:", dbError);
      
      // Check for specific database errors with more detailed handling
      if (dbError instanceof Error) {
        const errorMessage = dbError.message.toLowerCase();
        
        if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
          if (errorMessage.includes('plate_number')) {
            return {
              success: false,
              error: `A vehicle with plate number "${plateNumber}" already exists. Please use a different plate number.`,
              validationError: true
            };
          }
          return {
            success: false,
            error: "A vehicle with this information already exists.",
            validationError: true
          };
        }
        
        if (errorMessage.includes('foreign key constraint') || errorMessage.includes('violates foreign key')) {
          if (errorMessage.includes('project_id')) {
            return {
              success: false,
              error: "Selected project is no longer available. Please refresh and try again.",
              validationError: true
            };
          }
          if (errorMessage.includes('created_by')) {
            return {
              success: false,
              error: "User authentication issue. Please log out and log back in.",
              authError: true
            };
          }
          return {
            success: false,
            error: "Referenced data is no longer available. Please refresh and try again.",
            validationError: true
          };
        }
        
        if (errorMessage.includes('not null constraint') || errorMessage.includes('null value')) {
          return {
            success: false,
            error: "Missing required information. Please fill in all required fields and try again.",
            validationError: true
          };
        }
        
        if (errorMessage.includes('check constraint') || errorMessage.includes('invalid input')) {
          return {
            success: false,
            error: "Invalid data format. Please check your input and try again.",
            validationError: true
          };
        }
      }
      
      return {
        success: false,
        error: "Unable to create vehicle. Please check your data and try again.",
        dbError: true
      };
    }

    // 🔥 HANDLE FILE UPLOADS
    const fileUploads: Record<string, string> = {};
    
    // Process each potential file
    const fileFields = [
      { formKey: 'frontImg', prefix: 'front' },
      { formKey: 'backImg', prefix: 'back' },
      { formKey: 'side1Img', prefix: 'side1' },
      { formKey: 'side2Img', prefix: 'side2' },
      { formKey: 'originalReceipt', prefix: 'receipt' },
      { formKey: 'carRegistration', prefix: 'registration' },
      { formKey: 'pgpcInspection', prefix: 'pgpc_inspection' },
    ];

    for (const { formKey, prefix } of fileFields) {
      const file = formData.get(formKey) as File | null;
      
      if (file && file.size > 0) {
        try {
          const uploadResult = await uploadFileToSupabase(
            file,
            projectId,
            vehicle.id,
            prefix,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          );
          
          fileUploads[uploadResult.field] = uploadResult.url;
        } catch (error) {
          console.error(`❌ Failed to upload ${prefix}:`, error);
          // Continue with other files, don't fail the entire creation
        }
      }
    }

    // 🔥 HANDLE PARTS UPLOADS - Preserve folder structure
    const partsStructureString = formData.get("partsStructure") as string;
    let finalPartsStructure = null;
    
    if (partsStructureString) {
      try {
        const partsStructure = JSON.parse(partsStructureString);
        
        // Create the final structure with uploaded URLs
        const processedStructure = {
          rootFiles: [] as any[],
          folders: [] as any[]
        };
        
        // Process root files
        if (partsStructure.rootFiles && Array.isArray(partsStructure.rootFiles)) {
          for (let i = 0; i < partsStructure.rootFiles.length; i++) {
            const partFile = formData.get(`partsFile_root_${i}`) as File;
            const partName = formData.get(`partsFile_root_${i}_name`) as string;
            const originalFile = partsStructure.rootFiles[i];
            
            // Check if this is a new file upload
            if (partFile && partFile.size > 0) {
              try {
                const timestamp = Date.now();
                const ext = partName.split('.').pop();
                const filename = `part_${i}_${timestamp}.${ext}`;
                const filepath = `vehicle-${vehicle.id}/vehicle-parts/root/${filename}`;
                const buffer = Buffer.from(await partFile.arrayBuffer());

                const { data: uploadData, error: uploadErr } = await supabase
                  .storage
                  .from('vehicles')
                  .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

                if (uploadErr || !uploadData) {
                  console.error(`❌ Failed to upload part ${i}:`, uploadErr);
                } else {
                  const { data: urlData } = supabase
                    .storage
                    .from('vehicles')
                    .getPublicUrl(uploadData.path);
                  
                  // Add to processed structure with URL
                  processedStructure.rootFiles.push({
                    id: originalFile.id,
                    name: partName,
                    url: urlData.publicUrl,
                    preview: urlData.publicUrl,
                    type: partFile.type.startsWith('image/') ? 'image' : 'document'
                  });
                }
              } catch (error) {
                console.error(`❌ Failed to upload part ${i}:`, error);
              }
            } else if (originalFile && originalFile.url) {
              // Preserve existing file that wasn't re-uploaded
              processedStructure.rootFiles.push({
                id: originalFile.id,
                name: originalFile.name,
                url: originalFile.url,
                preview: originalFile.preview || originalFile.url,
                type: originalFile.type || (originalFile.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
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
                const partFile = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
                const partName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_name`) as string;
                const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
                const originalFile = folder.files[fileIndex];
                
                // Check if this is a new file upload
                if (partFile && partFile.size > 0) {
                  try {
                    const timestamp = Date.now();
                    const ext = partName.split('.').pop();
                    const filename = `part_${folderIndex}_${fileIndex}_${timestamp}.${ext}`;
                    const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_');
                    const filepath = `vehicle-${vehicle.id}/vehicle-parts/${sanitizedFolderName}/${filename}`;
                    const buffer = Buffer.from(await partFile.arrayBuffer());

                    const { data: uploadData, error: uploadErr } = await supabase
                      .storage
                      .from('vehicles')
                      .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

                    if (uploadErr || !uploadData) {
                      console.error(`❌ Failed to upload folder part ${folderIndex}_${fileIndex}:`, uploadErr);
                    } else {
                      const { data: urlData } = supabase
                        .storage
                        .from('vehicles')
                        .getPublicUrl(uploadData.path);
                      
                      // Add to processed folder with URL
                      processedFolder.files.push({
                        id: originalFile.id,
                        name: partName,
                        url: urlData.publicUrl,
                        preview: urlData.publicUrl,
                        type: partFile.type.startsWith('image/') ? 'image' : 'document'
                      });
                    }
                  } catch (error) {
                    console.error(`❌ Failed to upload folder part ${folderIndex}_${fileIndex}:`, error);
                  }
                } else if (originalFile && originalFile.url) {
                  // Preserve existing file that wasn't re-uploaded
                  processedFolder.files.push({
                    id: originalFile.id,
                    name: originalFile.name,
                    url: originalFile.url,
                    preview: originalFile.preview || originalFile.url,
                    type: originalFile.type || (originalFile.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
                  });
                }
              }
            }
            
            // Only add folder if it has files
            if (processedFolder.files.length > 0) {
              processedStructure.folders.push(processedFolder);
            }
          }
        }
        
        // Only set final structure if there are files
        if (processedStructure.rootFiles.length > 0 || processedStructure.folders.length > 0) {
          finalPartsStructure = processedStructure;
        }
      } catch (error) {
        console.error("❌ Failed to process parts structure:", error);
      }
    }

    // Update vehicle with file URLs and parts if any were uploaded
    const updateData = { ...fileUploads };
    if (finalPartsStructure) {
      // Store structured parts data as JSON string in a single array element for now
      // This maintains compatibility while preserving folder structure
      updateData.vehicle_parts = [JSON.stringify(finalPartsStructure)] as any;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: updateData,
      });
    }

    // 🔥 HANDLE MAINTENANCE REPORT CREATION (if provided)
    let maintenanceReportId = null;
    const maintenanceDataString = formData.get("maintenanceData") as string;
    
    if (maintenanceDataString) {
      try {
        const maintenanceData = JSON.parse(maintenanceDataString);
        const dateRepaired = formData.get("dateRepaired") as string;
        
        // Only create maintenance report if there's meaningful data
        if (maintenanceData.issueDescription?.trim() || 
            maintenanceData.remarks?.trim() || 
            maintenanceData.inspectionDetails?.trim() || 
            maintenanceData.actionTaken?.trim()) {
          
          // Upload maintenance attachments
          const attachmentUrls: string[] = [];
          for (let i = 0; formData.get(`maintenanceAttachment_${i}`); i++) {
            const file = formData.get(`maintenanceAttachment_${i}`) as File;
            if (file && file.size > 0) {
              try {
                const timestamp = Date.now();
                const ext = file.name.split('.').pop();
                const filename = `maintenance_attachment_${i}_${timestamp}.${ext}`;
                const filepath = `vehicle-${vehicle.id}/vehicle-maintenance/${filename}`;
                const buffer = Buffer.from(await file.arrayBuffer());

                const { data: uploadData, error: uploadErr } = await supabase
                  .storage
                  .from('vehicles')
                  .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

                if (!uploadErr && uploadData) {
                  const { data: urlData } = supabase.storage
                    .from('vehicles')
                    .getPublicUrl(uploadData.path);
                  attachmentUrls.push(urlData.publicUrl);
                }
              } catch (error) {
                console.error(`❌ Failed to upload maintenance attachment ${i}:`, error);
              }
            }
          }
          
          // Upload parts replaced images and build parts array
          const partsReplaced: string[] = [];
          for (let i = 0; formData.get(`partReplacedImage_${i}`); i++) {
            const partImage = formData.get(`partReplacedImage_${i}`) as File;
            const partName = formData.get(`partReplacedName_${i}`) as string;
            
            if (partName?.trim()) {
              if (partImage && partImage.size > 0) {
                try {
                  const timestamp = Date.now();
                  const ext = partImage.name.split('.').pop();
                  const filename = `part_${i}_${timestamp}.${ext}`;
                  const filepath = `vehicle-${vehicle.id}/vehicle-maintenance/parts/${filename}`;
                  const buffer = Buffer.from(await partImage.arrayBuffer());

                  const { data: uploadData, error: uploadErr } = await supabase
                    .storage
                    .from('vehicles')
                    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

                  if (!uploadErr && uploadData) {
                    const { data: urlData } = supabase.storage
                      .from('vehicles')
                      .getPublicUrl(uploadData.path);
                    partsReplaced.push(`${partName} [${urlData.publicUrl}]`);
                  } else {
                    partsReplaced.push(partName);
                  }
                } catch (error) {
                  console.error(`❌ Failed to upload part image ${i}:`, error);
                  partsReplaced.push(partName);
                }
              } else {
                partsReplaced.push(partName);
              }
            }
          }
          
          // Create maintenance report
          try {
            const maintenanceReport = await prisma.maintenance_vehicle_report.create({
              data: {
                vehicle_id: vehicle.id,
                location_id: project.client.location.id,
                issue_description: maintenanceData.issueDescription || '',
                remarks: maintenanceData.remarks || null,
                inspection_details: maintenanceData.inspectionDetails || null,
                action_taken: maintenanceData.actionTaken || null,
                parts_replaced: partsReplaced,
                priority: maintenanceData.priority || 'MEDIUM',
                status: maintenanceData.status || 'REPORTED',
                downtime_hours: maintenanceData.downtimeHours || null,
                date_repaired: dateRepaired ? new Date(dateRepaired) : null,
                date_reported: maintenanceData.dateReported ? new Date(maintenanceData.dateReported) : new Date(),
                attachment_urls: attachmentUrls,
                reported_by: userProfile.id,
                repaired_by: dateRepaired ? userProfile.id : null,
              },
            });
            
            maintenanceReportId = maintenanceReport.id;
          } catch (error) {
            console.error("❌ Failed to create maintenance report:", error);
            // Don't fail vehicle creation if maintenance report fails
          }
        }
      } catch (error) {
        console.error("❌ Failed to process maintenance data:", error);
        // Don't fail vehicle creation if maintenance processing fails
      }
    }

    // Revalidate the vehicles page
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    // Calculate parts count from finalPartsStructure
    const partsCount = finalPartsStructure 
      ? (finalPartsStructure.rootFiles?.length || 0) + 
        (finalPartsStructure.folders?.reduce((total, folder) => total + (folder.files?.length || 0), 0) || 0)
      : 0;

    return { 
      success: true, 
      vehicleId: vehicle.id,
      filesUploaded: Object.keys(fileUploads).length,
      partsUploaded: partsCount,
      maintenanceReportCreated: !!maintenanceReportId,
      maintenanceReportId: maintenanceReportId
    };

  } catch (error) {
    console.error("Unexpected error creating vehicle:", error);
    return {
      success: false,
      error: "An unexpected error occurred. Please try again or contact support if the problem persists.",
      unexpectedError: true
    };
  }
}

export async function updateVehicleAction(formData: FormData) {
  try {
    // Get form data
    const vehicleId = formData.get("vehicleId") as string;
    const brand = formData.get("brand") as string;
    const model = formData.get("model") as string;
    const type = formData.get("type") as string;
    const plateNumber = formData.get("plateNumber") as string;
    const owner = formData.get("owner") as string;
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as string;
    const inspectionDate = formData.get("inspectionDate") as string;
    const expiryDate = formData.get("expiryDate") as string;
    const before = formData.get("before") as string;
    const remarks = formData.get("remarks") as string;

    // Basic validation with specific error messages
    const missingFields = [];
    if (!vehicleId) missingFields.push("Vehicle ID");
    if (!brand) missingFields.push("Brand");
    if (!model) missingFields.push("Model");
    if (!type) missingFields.push("Vehicle Type");
    if (!plateNumber) missingFields.push("Plate Number");
    if (!owner) missingFields.push("Owner");
    if (!projectId) missingFields.push("Project");
    
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Please fill in the following required fields: ${missingFields.join(", ")}`,
        validationError: true
      };
    }

    // Additional validation
    if (inspectionDate && isNaN(Date.parse(inspectionDate))) {
      return {
        success: false,
        error: "Please enter a valid inspection date",
        validationError: true
      };
    }

    if (expiryDate && isNaN(Date.parse(expiryDate))) {
      return {
        success: false,
        error: "Please enter a valid expiry date",
        validationError: true
      };
    }

    if (before && (isNaN(parseInt(before)) || parseInt(before) < 0)) {
      return {
        success: false,
        error: "Days before expiry must be a valid positive number",
        validationError: true
      };
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return {
        success: false,
        error: "Authentication required. Please log in and try again.",
        authError: true
      };
    }

    // Get user profile
    let userProfile;
    try {
      userProfile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          role: true,
          user_status: true,
        },
      });
    } catch (dbError) {
      console.error("Database error fetching user profile:", dbError);
      return {
        success: false,
        error: "Unable to verify user permissions. Please try again.",
        dbError: true
      };
    }

    if (!userProfile) {
      return {
        success: false,
        error: "User profile not found. Please contact support.",
        authError: true
      };
    }

    if (userProfile.user_status !== 'ACTIVE') {
      return {
        success: false,
        error: "Your account is inactive. Please contact an administrator.",
        authError: true
      };
    }

    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      return {
        success: false,
        error: "You don't have permission to update vehicles. Admin access required.",
        permissionError: true
      };
    }

    // Check if vehicle exists
    let existingVehicle;
    try {
      existingVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });
    } catch (dbError) {
      console.error("Database error fetching vehicle:", dbError);
      return {
        success: false,
        error: "Unable to find vehicle. Please try again.",
        dbError: true
      };
    }

    if (!existingVehicle) {
      return {
        success: false,
        error: "Vehicle not found. It may have been deleted by another user.",
        validationError: true
      };
    }

    // Validate project exists
    let project;
    try {
      project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          client: {
            include: {
              location: true
            }
          }
        }
      });
    } catch (dbError) {
      console.error("Database error fetching project:", dbError);
      return {
        success: false,
        error: "Unable to validate project. Please try again.",
        dbError: true
      };
    }

    if (!project) {
      return {
        success: false,
        error: "Selected project not found. Please refresh the page and try again.",
        validationError: true
      };
    }

    // Update vehicle basic data
    let updatedVehicle;
    try {
      updatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          brand,
          model,
          type,
          plate_number: plateNumber,
          owner,
          status: status as "OPERATIONAL" | "NON_OPERATIONAL",
          inspection_date: inspectionDate ? new Date(inspectionDate) : existingVehicle.inspection_date,
          expiry_date: expiryDate ? new Date(expiryDate) : existingVehicle.expiry_date,
          before: before ? parseInt(before) : existingVehicle.before,
          remarks: remarks || null,
          project: { connect: { id: projectId } },
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
        },
        user: {
          select: {
            id: true,
            username: true,
            full_name: true
          }
        }
      },
    });
    } catch (dbError) {
      console.error("Database error updating vehicle:", dbError);
      
      // Check for specific database errors
      if (dbError instanceof Error) {
        if (dbError.message.includes('Unique constraint')) {
          return {
            success: false,
            error: "A vehicle with this plate number already exists in this project.",
            validationError: true
          };
        }
        if (dbError.message.includes('Foreign key constraint')) {
          return {
            success: false,
            error: "Selected project is no longer available. Please refresh and try again.",
            validationError: true
          };
        }
      }
      
      return {
        success: false,
        error: "Unable to update vehicle. Please check your data and try again.",
        dbError: true
      };
    }

    // 🔥 HANDLE FILE UPLOADS AND REMOVALS
    const fileUploads: Record<string, string | null> = {};
    
    const fileFields = [
      { formKey: 'frontImg', prefix: 'front' },
      { formKey: 'backImg', prefix: 'back' },
      { formKey: 'side1Img', prefix: 'side1' },
      { formKey: 'side2Img', prefix: 'side2' },
      { formKey: 'originalReceipt', prefix: 'receipt' },
      { formKey: 'carRegistration', prefix: 'registration' },
      { formKey: 'pgpcInspection', prefix: 'pgpc_inspection' },
    ];

    for (const { formKey, prefix } of fileFields) {
      const file = formData.get(formKey) as File | null;
      const shouldRemove = formData.get(`remove_${formKey}`) === 'true';
      
      if (file && file.size > 0) {
        // Upload new file
        try {
          const uploadResult = await uploadFileToSupabase(
            file,
            projectId,
            vehicleId,
            prefix,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          );
          
          fileUploads[uploadResult.field] = uploadResult.url;
        } catch (error) {
          console.error(`❌ Failed to upload ${prefix}:`, error);
          // Continue with other files, don't fail the entire update
        }
      } else if (shouldRemove) {
        // Mark field for removal (set to null)
        const fieldName = getFieldName(prefix);
        fileUploads[fieldName] = null;
      }
    }

    // 🔥 HANDLE PARTS STRUCTURE UPDATES
    const partsStructureString = formData.get("partsStructure") as string;
    let finalPartsStructure = null;
    
    if (partsStructureString) {
      try {
        const partsStructure = JSON.parse(partsStructureString);
        
        // Process the parts structure to handle both new uploads and existing files
        const processedStructure = {
          rootFiles: [] as any[],
          folders: [] as any[]
        };
        
        // Process root files
        if (partsStructure.rootFiles && Array.isArray(partsStructure.rootFiles)) {
          for (let i = 0; i < partsStructure.rootFiles.length; i++) {
            const rootFile = partsStructure.rootFiles[i];
            
            const partFile = formData.get(`partsFile_root_${i}`) as File;
            const partName = formData.get(`partsFile_root_${i}_name`) as string || rootFile.name;
            
            // Check if this is a new file upload
            if (partFile && partFile.size > 0) {
              try {
                const timestamp = Date.now();
                const ext = partName.split('.').pop() || 'unknown';
                const filename = `part_${i}_${timestamp}.${ext}`;
                const filepath = `vehicle-${vehicleId}/vehicle-parts/root/${filename}`;
                const buffer = Buffer.from(await partFile.arrayBuffer());

                const { data: uploadData, error: uploadErr } = await supabase
                  .storage
                  .from('vehicles')
                  .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

                if (uploadErr || !uploadData) {
                  console.error(`❌ Failed to upload part ${i}:`, uploadErr);
                } else {
                  const { data: urlData } = supabase
                    .storage
                    .from('vehicles')
                    .getPublicUrl(uploadData.path);
                  
                  processedStructure.rootFiles.push({
                    id: rootFile.id,
                    name: partName,
                    url: urlData.publicUrl,
                    preview: urlData.publicUrl,
                    type: partFile.type.startsWith('image/') ? 'image' : 'document'
                  });
                }
              } catch (error) {
                console.error(`❌ Failed to upload part ${i}:`, error);
              }
            } else if (rootFile && (rootFile.url || rootFile.preview)) {
              // Preserve existing file that wasn't re-uploaded
              const fileUrl = rootFile.url || rootFile.preview;
              processedStructure.rootFiles.push({
                id: rootFile.id,
                name: rootFile.name,
                url: fileUrl,
                preview: rootFile.preview || fileUrl,
                type: rootFile.type || (fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
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
                const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string || folder.name;
                
                // Check if this is a new file upload
                if (partFile && partFile.size > 0) {
                  try {
                    const timestamp = Date.now();
                    const ext = partName.split('.').pop() || 'unknown';
                    const filename = `part_${folderIndex}_${fileIndex}_${timestamp}.${ext}`;
                    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
                    const sanitizedFolderName = sanitizeForPath(folderName);
                    const filepath = `vehicle-${vehicleId}/vehicle-parts/${sanitizedFolderName}/${filename}`;
                    const buffer = Buffer.from(await partFile.arrayBuffer());

                    const { data: uploadData, error: uploadErr } = await supabase
                      .storage
                      .from('vehicles')
                      .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

                    if (uploadErr || !uploadData) {
                      console.error(`❌ Failed to upload folder part ${folderIndex}_${fileIndex}:`, uploadErr);
                    } else {
                      const { data: urlData } = supabase
                        .storage
                        .from('vehicles')
                        .getPublicUrl(uploadData.path);
                      
                      processedFolder.files.push({
                          id: folderFile.id,
                          name: partName,
                          url: urlData.publicUrl,
                          preview: urlData.publicUrl,
                          type: partFile.type.startsWith('image/') ? 'image' : 'document'
                        });
                      }
                    } catch (error) {
                      console.error(`❌ Failed to upload folder part ${folderIndex}_${fileIndex}:`, error);
                    }
                  } else if (folderFile && (folderFile.url || folderFile.preview)) {
                    // Preserve existing file that wasn't re-uploaded
                    const fileUrl = folderFile.url || folderFile.preview;
                    processedFolder.files.push({
                      id: folderFile.id,
                      name: folderFile.name,
                      url: fileUrl,
                      preview: folderFile.preview || fileUrl,
                      type: folderFile.type || (fileUrl.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? 'image' : 'document')
                    });
                  }
              }
            }
            
            // Only add folder if it has files
            if (processedFolder.files.length > 0) {
              processedStructure.folders.push(processedFolder);
            }
          }
        }
        
        // Always set the processed structure, even if it's empty
        finalPartsStructure = processedStructure;
      } catch (error) {
        console.error("❌ Failed to process parts structure:", error);
        // Set empty structure on error to ensure database gets updated
        finalPartsStructure = { rootFiles: [], folders: [] };
      }
    }

    // Update vehicle with file URLs and parts structure
    const updateData: any = { ...fileUploads };
    if (finalPartsStructure !== null) {
      // Always update parts structure if it was processed (even if empty - indicating deletions)
      updateData.vehicle_parts = [JSON.stringify(finalPartsStructure)] as any;
    }
    
    // Update vehicle with new file URLs and/or parts structure if any changes were made
    let finalUpdatedVehicle: typeof updatedVehicle | null = updatedVehicle;
    if (Object.keys(updateData).length > 0) {
      finalUpdatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
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
          },
          user: {
            select: {
              id: true,
              username: true,
              full_name: true
            }
          }
        },
      });
    } else {
      // Get updated vehicle with all relations for consistency
      finalUpdatedVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              full_name: true
            }
          }
        },
      });
      
      if (!finalUpdatedVehicle) {
        return { 
          success: false, 
          error: "Vehicle not found after update" 
        };
      }
    }

    // Revalidate the vehicles page
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { 
      success: true, 
      vehicleId: vehicleId,
      filesUpdated: Object.keys(fileUploads).length,
      vehicle: finalUpdatedVehicle
    };

  } catch (error) {
    console.error("Unexpected error updating vehicle:", error);
    return {
      success: false,
      error: "An unexpected error occurred while updating the vehicle. Please try again or contact support if the problem persists.",
      unexpectedError: true
    };
  }
}
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// Helper to upload files to Supabase with folder structure
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
  const filename = `${prefix}_${timestamp}.${ext}`;
  
  // Create human-readable folder structure
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  let humanReadablePath = '';
  if (projectName && clientName && brand && model) {
    const readableProject = sanitizeForPath(`${projectName}_${clientName}`);
    const readableVehicle = sanitizeForPath(`${brand}_${model}_${plateNumber || 'Vehicle'}`);
    humanReadablePath = `${readableProject}/${readableVehicle}`;
  } else {
    // Fallback to UUID structure
    humanReadablePath = `${projectId}/${vehicleId}`;
  }
  
  const filepath = `vehicles/${humanReadablePath}/${filename}`;
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
    const before = formData.get("before") as string;
    const remarks = formData.get("remarks") as string;

    // Basic validation with specific error messages
    const missingFields = [];
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
      vehicle = await prisma.vehicle.create({
        data: {
          brand,
          model,
          type,
          plate_number: plateNumber,
          owner,
          status: status as "OPERATIONAL" | "NON_OPERATIONAL",
          inspection_date: inspectionDate ? new Date(inspectionDate) : new Date(),
          expiry_date: expiryDate ? new Date(expiryDate) : new Date(),
          before: before ? parseInt(before) : 0,
          remarks: remarks || null,
          project: { connect: { id: projectId } },
          user: { connect: { id: userProfile.id } },
        },
      });
    } catch (dbError) {
      console.error("Database error creating vehicle:", dbError);
      
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

    // 🔥 HANDLE PARTS UPLOADS
    const partsUrls: string[] = [];
    const partsStructureString = formData.get("partsStructure") as string;
    
    if (partsStructureString) {
      try {
        const partsStructure = JSON.parse(partsStructureString);
        
        // Process root files
        if (partsStructure.rootFiles && Array.isArray(partsStructure.rootFiles)) {
          for (let i = 0; i < partsStructure.rootFiles.length; i++) {
            const partFile = formData.get(`partsFile_root_${i}`) as File;
            const partName = formData.get(`partsFile_root_${i}_name`) as string;
            
            if (partFile && partFile.size > 0) {
              try {
                const timestamp = Date.now();
                const ext = partName.split('.').pop();
                const filename = `part_${i}_${timestamp}.${ext}`;
                const filepath = `vehicles/${project.name}/${brand}_${model}_${plateNumber}/parts/root/${filename}`;
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
                  partsUrls.push(urlData.publicUrl);
                }
              } catch (error) {
                console.error(`❌ Failed to upload part ${i}:`, error);
              }
            }
          }
        }
        
        // Process folder files
        if (partsStructure.folders && Array.isArray(partsStructure.folders)) {
          for (let folderIndex = 0; folderIndex < partsStructure.folders.length; folderIndex++) {
            const folder = partsStructure.folders[folderIndex];
            if (folder.files && Array.isArray(folder.files)) {
              for (let fileIndex = 0; fileIndex < folder.files.length; fileIndex++) {
                const partFile = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}`) as File;
                const partName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_name`) as string;
                const folderName = formData.get(`partsFile_folder_${folderIndex}_${fileIndex}_folder`) as string;
                
                if (partFile && partFile.size > 0) {
                  try {
                    const timestamp = Date.now();
                    const ext = partName.split('.').pop();
                    const filename = `part_${folderIndex}_${fileIndex}_${timestamp}.${ext}`;
                    const sanitizedFolderName = folderName.replace(/[^a-zA-Z0-9_\-]/g, '_');
                    const filepath = `vehicles/${project.name}/${brand}_${model}_${plateNumber}/parts/${sanitizedFolderName}/${filename}`;
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
                      partsUrls.push(urlData.publicUrl);
                    }
                  } catch (error) {
                    console.error(`❌ Failed to upload folder part ${folderIndex}_${fileIndex}:`, error);
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("❌ Failed to process parts structure:", error);
      }
    }

    // Update vehicle with file URLs and parts if any were uploaded
    const updateData = { ...fileUploads };
    if (partsUrls.length > 0) {
      updateData.vehicle_parts = partsUrls;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: updateData,
      });
    }

    // Revalidate the vehicles page
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { 
      success: true, 
      vehicleId: vehicle.id,
      filesUploaded: Object.keys(fileUploads).length,
      partsUploaded: partsUrls.length
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

    // Update vehicle with new file URLs if any were uploaded and get final updated vehicle
    let finalUpdatedVehicle: typeof updatedVehicle | null = updatedVehicle;
    if (Object.keys(fileUploads).length > 0) {
      finalUpdatedVehicle = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: fileUploads,
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
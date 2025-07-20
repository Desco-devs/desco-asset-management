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

    // Basic validation
    if (!brand || !model || !type || !plateNumber || !owner || !projectId) {
      throw new Error("Missing required fields");
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        user_status: true,
      },
    });

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    if (userProfile.user_status !== 'ACTIVE') {
      throw new Error("Account is inactive");
    }

    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions");
    }

    // Validate project exists and get project details for file organization
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

    // Create vehicle first (without files)
    const vehicle = await prisma.vehicle.create({
      data: {
        brand,
        model,
        type,
        plate_number: plateNumber,
        owner,
        status: status as any,
        inspection_date: new Date(inspectionDate),
        expiry_date: new Date(expiryDate),
        before: parseInt(before),
        remarks: remarks || null,
        project: { connect: { id: projectId } },
        user: { connect: { id: userProfile.id } },
      },
    });

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
          console.log(`✅ Uploaded ${prefix}:`, uploadResult.url);
        } catch (error) {
          console.error(`❌ Failed to upload ${prefix}:`, error);
          // Continue with other files, don't fail the entire creation
        }
      }
    }

    // Update vehicle with file URLs if any were uploaded
    if (Object.keys(fileUploads).length > 0) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: fileUploads,
      });
      console.log(`📁 Updated vehicle ${vehicle.id} with ${Object.keys(fileUploads).length} files`);
    }

    // Revalidate the vehicles page
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { 
      success: true, 
      vehicleId: vehicle.id,
      filesUploaded: Object.keys(fileUploads).length
    };

  } catch (error) {
    console.error("Error creating vehicle:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create vehicle");
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

    // Basic validation
    if (!vehicleId || !brand || !model || !type || !plateNumber || !owner || !projectId) {
      throw new Error("Missing required fields");
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        user_status: true,
      },
    });

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    if (userProfile.user_status !== 'ACTIVE') {
      throw new Error("Account is inactive");
    }

    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions");
    }

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!existingVehicle) {
      throw new Error("Vehicle not found");
    }

    // Validate project exists
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

    // Update vehicle basic data
    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        brand,
        model,
        type,
        plate_number: plateNumber,
        owner,
        status: status as any,
        inspection_date: new Date(inspectionDate),
        expiry_date: new Date(expiryDate),
        before: parseInt(before),
        remarks: remarks || null,
        project: { connect: { id: projectId } },
      },
    });

    // 🔥 HANDLE FILE UPLOADS (similar to create)
    const fileUploads: Record<string, string> = {};
    
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
            vehicleId,
            prefix,
            project.name,
            project.client.name,
            brand,
            model,
            plateNumber
          );
          
          fileUploads[uploadResult.field] = uploadResult.url;
          console.log(`✅ Updated ${prefix}:`, uploadResult.url);
        } catch (error) {
          console.error(`❌ Failed to upload ${prefix}:`, error);
          // Continue with other files, don't fail the entire update
        }
      }
    }

    // Update vehicle with new file URLs if any were uploaded
    if (Object.keys(fileUploads).length > 0) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: fileUploads,
      });
      console.log(`📁 Updated vehicle ${vehicleId} with ${Object.keys(fileUploads).length} new files`);
    }

    // Revalidate the vehicles page
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { 
      success: true, 
      vehicleId: vehicleId,
      filesUpdated: Object.keys(fileUploads).length
    };

  } catch (error) {
    console.error("Error updating vehicle:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update vehicle");
  }
}
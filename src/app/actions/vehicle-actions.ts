"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { status as VehicleStatus } from "@prisma/client";

// Helper to upload files to Supabase with folder structure
// Currently unused but kept for future use
/* 
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

  return { field: 'getFieldName(prefix)', url: urlData.publicUrl };
};
*/

// Map file prefix to Prisma field name
// Currently unused but kept for future use
/*
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
*/

interface CreateVehicleData {
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  owner: string;
  projectId: string;
  status: keyof typeof VehicleStatus;
  remarks?: string;
  inspectionDate: string;
  expiryDate: string;
  before: number;
  // File URLs from client-side upload
  fileUrls?: Record<string, string>;
}

export async function createVehicle(data: CreateVehicleData) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile from database
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        full_name: true,
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

    // Check if user has permission to create vehicles (ADMIN or SUPERADMIN)
    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions to create vehicles");
    }

    // Validate required fields
    if (!data.brand || !data.model || !data.type || !data.plateNumber || !data.owner || !data.projectId) {
      throw new Error("Missing required fields");
    }

    if (!data.inspectionDate || !data.expiryDate) {
      throw new Error("Inspection date and expiry date are required");
    }

    // Validate project exists
    const projectInfo = await prisma.project.findUnique({
      where: { id: data.projectId },
      include: {
        client: {
          include: {
            location: true
          }
        }
      }
    });

    if (!projectInfo) {
      throw new Error("Project not found");
    }

    // Create vehicle record with file URLs
    const createData = {
      brand: data.brand,
      model: data.model,
      type: data.type,
      plate_number: data.plateNumber,
      inspection_date: new Date(data.inspectionDate),
      before: data.before,
      expiry_date: new Date(data.expiryDate),
      status: data.status,
      remarks: data.remarks || null,
      owner: data.owner,
      project: { connect: { id: data.projectId } },
      user: { connect: { id: userProfile.id } },
      // Add file URLs directly
      ...data.fileUrls,
    };

    const vehicle = await prisma.vehicle.create({ data: createData });

    // Fetch the complete vehicle record with relations
    const result = await prisma.vehicle.findUnique({
      where: { id: vehicle.id },
      include: {
        project: {
          include: { 
            client: { 
              include: { location: true } 
            } 
          }
        }
      }
    });

    // Revalidate multiple paths to update all dashboard components
    revalidatePath("/dashboard");
    revalidatePath("/vehicles");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/", "layout");

    return {
      success: true,
      data: result,
      message: "Vehicle created successfully"
    };

  } catch (error) {
    console.error("Error creating vehicle:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create vehicle");
  }
}

export async function getAllVehicles() {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile from database
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

    // First check the total count
    const vehicleCount = await prisma.vehicle.count();
    console.log("🚗 getAllVehicles: Current vehicle count in DB:", vehicleCount);

    // Fetch all vehicles with relations
    const vehicles = await prisma.vehicle.findMany({
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
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log("🚗 getAllVehicles: Fetched vehicles count:", vehicles.length);
    console.log("🚗 getAllVehicles: Vehicle IDs:", vehicles.map(v => v.id));

    return {
      success: true,
      data: vehicles,
      message: "Vehicles fetched successfully"
    };

  } catch (error) {
    console.error("Error fetching vehicles:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fetch vehicles");
  }
}
"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { status as EquipmentStatus, Prisma } from "@prisma/client";

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
  type?: string
): Promise<{ field: string; url: string }> => {
  const supabase = await createServerSupabaseClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const filename = `${prefix}_${timestamp}.${ext}`;
  
  // Create human-readable folder structure
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  let humanReadablePath = '';
  if (projectName && clientName && brand && model && type) {
    const readableProject = sanitizeForPath(`${projectName}_${clientName}`);
    const readableEquipment = sanitizeForPath(`${brand}_${model}_${type}`);
    humanReadablePath = `${readableProject}/${readableEquipment}`;
  } else {
    // Fallback to UUID structure
    humanReadablePath = `${projectId}/${equipmentId}`;
  }
  
  const filepath = `${humanReadablePath}/${filename}`;
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

// Upload equipment part with folder support
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
  const supabase = await createServerSupabaseClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const filename = `${partNumber}_${file.name.replace(/\.[^/.]+$/, "")}_${timestamp}.${ext}`;
  
  // Create human-readable folder structure
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, '_');
  
  let humanReadablePath = '';
  if (projectName && clientName && brand && model && type) {
    const readableProject = sanitizeForPath(`${projectName}_${clientName}`);
    const readableEquipment = sanitizeForPath(`${brand}_${model}_${type}`);
    humanReadablePath = `${readableProject}/${readableEquipment}`;
  } else {
    // Fallback to UUID structure
    humanReadablePath = `${projectId}/${equipmentId}`;
  }
  
  const sanitizedFolderPath = folderPath.replace(/[^a-zA-Z0-9_\-\/]/g, '_');
  const filepath = `${humanReadablePath}/${sanitizedFolderPath}/${filename}`;
  
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('equipments')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload part ${partNumber} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase
    .storage
    .from('equipments')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
};

// Map file prefix to Prisma field name
const getFieldName = (prefix: string): string => {
  switch (prefix) {
    case 'image': return 'image_url';
    case 'receipt': return 'original_receipt_url';
    case 'registration': return 'equipment_registration_url';
    case 'thirdparty_inspection': return 'thirdparty_inspection_image';
    case 'pgpc_inspection': return 'pgpc_inspection_image';
    default: throw new Error(`Unknown prefix: ${prefix}`);
  }
};

interface CreateEquipmentData {
  brand: string;
  model: string;
  type: string;
  owner: string;
  projectId: string;
  status: keyof typeof EquipmentStatus;
  remarks?: string;
  plateNumber?: string;
  inspectionDate?: string;
  insuranceExpirationDate?: string;
  before?: number;
  // File data
  files?: {
    image?: File;
    originalReceipt?: File;
    equipmentRegistration?: File;
    thirdpartyInspection?: File;
    pgpcInspection?: File;
  };
  equipmentParts?: {
    file: File;
    folderPath?: string;
  }[];
}

// Form state interface for progressive enhancement
interface FormState {
  success: boolean | null;
  message: string;
  fieldErrors: Record<string, string>;
  data?: unknown;
}

// Modern progressive enhancement action
export async function createEquipmentAction(prevState: FormState, formData: FormData): Promise<FormState> {
  try {
    // Extract form data with proper null handling
    const data: CreateEquipmentData = {
      brand: (formData.get('brand') as string) || '',
      model: (formData.get('model') as string) || '',
      type: (formData.get('type') as string) || '',
      owner: (formData.get('owner') as string) || '',
      projectId: (formData.get('projectId') as string) || '',
      status: (formData.get('status') as keyof typeof EquipmentStatus) || 'OPERATIONAL',
      remarks: (formData.get('remarks') as string) || undefined,
      plateNumber: (formData.get('plateNumber') as string) || undefined,
      inspectionDate: (formData.get('inspectionDate') as string) || undefined,
      insuranceExpirationDate: (formData.get('insuranceExpirationDate') as string) || undefined,
      before: formData.get('before') ? Number(formData.get('before')) : undefined,
      files: {
        image: formData.get('image') as File || undefined,
        originalReceipt: formData.get('originalReceipt') as File || undefined,
        equipmentRegistration: formData.get('equipmentRegistration') as File || undefined,
        thirdpartyInspection: formData.get('thirdpartyInspection') as File || undefined,
        pgpcInspection: formData.get('pgpcInspection') as File || undefined,
      }
    };

    // Extract equipment parts from FormData
    const equipmentPartsCount = parseInt(formData.get('equipmentPartsCount') as string || '0');
    const equipmentParts: { file: File; folderPath: string }[] = [];
    
    for (let i = 0; i < equipmentPartsCount; i++) {
      const file = formData.get(`equipmentPart_${i}`) as File;
      const folderPath = formData.get(`equipmentPartPath_${i}`) as string;
      
      if (file && folderPath) {
        equipmentParts.push({ file, folderPath });
      }
    }
    
    data.equipmentParts = equipmentParts;

    // Validate required fields
    if (!data.brand?.trim()) {
      return { success: false, message: "Brand is required", fieldErrors: { brand: "Brand is required" } };
    }
    if (!data.model?.trim()) {
      return { success: false, message: "Model is required", fieldErrors: { model: "Model is required" } };
    }
    if (!data.type?.trim()) {
      return { success: false, message: "Type is required", fieldErrors: { type: "Type is required" } };
    }
    if (!data.owner?.trim()) {
      return { success: false, message: "Owner is required", fieldErrors: { owner: "Owner is required" } };
    }
    if (!data.projectId) {
      return { success: false, message: "Project selection is required", fieldErrors: { projectId: "Please select a project" } };
    }

    const result = await createEquipment(data);
    return { 
      success: true, 
      message: "Equipment created successfully",
      data: result.data,
      fieldErrors: {}
    };

  } catch (error) {
    console.error("Error in createEquipmentAction:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to create equipment",
      fieldErrors: {}
    };
  }
}

export async function createEquipment(data: CreateEquipmentData) {
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

    // Check if user has permission to create equipment (ADMIN or SUPERADMIN)
    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions to create equipment");
    }

    // Validate required fields
    if (!data.brand || !data.model || !data.type || !data.owner || !data.projectId) {
      throw new Error("Missing required fields");
    }

    // Fetch project and client info for human-readable paths
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

    const projectName = projectInfo.name;
    const clientName = projectInfo.client.name;

    // Create equipment record first
    const createData: Prisma.equipmentCreateInput = {
      brand: data.brand,
      model: data.model,
      type: data.type,
      status: data.status,
      remarks: data.remarks || null,
      owner: data.owner,
      plate_number: data.plateNumber || null,
      project: { connect: { id: data.projectId } },
      user: { connect: { id: userProfile.id } },
      equipment_parts: [], // Initialize empty array
    };

    if (data.before !== undefined) {
      createData.before = data.before;
    }

    if (data.inspectionDate) {
      createData.inspection_date = new Date(data.inspectionDate);
    }

    if (data.insuranceExpirationDate) {
      createData.insurance_expiration_date = new Date(data.insuranceExpirationDate);
    }

    const equipment = await prisma.equipment.create({ data: createData });

    // Handle file uploads if any
    const updateData: Record<string, unknown> = {};

    // Upload regular files
    if (data.files) {
      const fileJobs = [
        { file: data.files.image, prefix: 'image' },
        { file: data.files.originalReceipt, prefix: 'receipt' },
        { file: data.files.equipmentRegistration, prefix: 'registration' },
        { file: data.files.thirdpartyInspection, prefix: 'thirdparty_inspection' },
        { file: data.files.pgpcInspection, prefix: 'pgpc_inspection' },
      ]
        .filter(f => f.file && f.file.size > 0)
        .map(f => uploadFileToSupabase(
          f.file!, 
          data.projectId, 
          equipment.id, 
          f.prefix, 
          projectName, 
          clientName, 
          data.brand, 
          data.model, 
          data.type
        ));

      if (fileJobs.length > 0) {
        try {
          const uploads = await Promise.all(fileJobs);
          uploads.forEach(u => { updateData[u.field] = u.url; });
        } catch (e) {
          console.error('Upload error:', e);
          await prisma.equipment.delete({ where: { id: equipment.id } });
          throw new Error('File upload failed');
        }
      }
    }

    // Upload equipment parts with folder structure
    if (data.equipmentParts && data.equipmentParts.length > 0) {
      try {
        const partUrls: string[] = [];
        for (let i = 0; i < data.equipmentParts.length; i++) {
          const part = data.equipmentParts[i];
          const partUrl = await uploadEquipmentPart(
            part.file,
            data.projectId,
            equipment.id,
            i + 1,
            part.folderPath || "main",
            projectName,
            clientName,
            data.brand,
            data.model,
            data.type
          );
          partUrls.push(partUrl);
        }
        updateData.equipment_parts = partUrls;
      } catch (e) {
        console.error('Part upload error:', e);
        await prisma.equipment.delete({ where: { id: equipment.id } });
        throw new Error('Equipment parts upload failed');
      }
    }

    // Update equipment with file URLs if any were uploaded
    if (Object.keys(updateData).length > 0) {
      await prisma.equipment.update({ 
        where: { id: equipment.id }, 
        data: updateData 
      });
    }

    // Fetch the complete equipment record with relations
    const result = await prisma.equipment.findUnique({
      where: { id: equipment.id },
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
    revalidatePath("/equipments");
    revalidatePath("/(admin-dashboard)/equipments");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/", "layout");

    return {
      success: true,
      data: result,
      message: "Equipment created successfully"
    };

  } catch (error) {
    console.error("Error creating equipment:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create equipment");
  }
}
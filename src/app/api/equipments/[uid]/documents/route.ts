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

// Upload a file to Supabase storage with human-readable paths
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
): Promise<string> => {
  const timestamp = Date.now();
  const ext = file.name.split(".").pop();
  const filename = `${prefix}_${timestamp}.${ext}`;

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

  const filepath = `${humanReadablePath}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("equipments")
    .upload(filepath, buffer, { cacheControl: "3600", upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload ${prefix} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("equipments")
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
};

/**
 * PATCH /api/equipments/[uid]/documents
 * Updates equipment documents with file upload support
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

      // Process document uploads
      const documentConfigs = [
        {
          formKey: 'originalReceipt',
          keepKey: 'keepExistingReceipt',
          existingUrl: existing.original_receipt_url,
          prefix: 'receipt',
          field: 'original_receipt_url' as const,
          tag: 'original receipt',
        },
        {
          formKey: 'equipmentRegistration',
          keepKey: 'keepExistingRegistration',
          existingUrl: existing.equipment_registration_url,
          prefix: 'registration',
          field: 'equipment_registration_url' as const,
          tag: 'equipment registration',
        },
      ]

      const updateData: Record<string, string | null> = {}

      for (const config of documentConfigs) {
        const newFile = formData.get(config.formKey) as File | null
        const keepExisting = formData.get(config.keepKey) as string

        if (newFile && newFile.size > 0) {
          // Delete old file if exists
          if (config.existingUrl) {
            try {
              await deleteFileFromSupabase(config.existingUrl, config.tag)
            } catch (error) {
              console.warn(`Failed to delete old ${config.tag}:`, error)
            }
          }

          // Upload new file
          try {
            const newUrl = await uploadFileToSupabase(
              newFile,
              existing.project_id,
              uid,
              config.prefix,
              projectName,
              clientName,
              brand,
              model,
              type
            )
            updateData[config.field] = newUrl
          } catch (error) {
            return NextResponse.json(
              { error: `Failed to upload ${config.tag}` },
              { status: 500 }
            )
          }
        } else if (keepExisting !== 'true') {
          // User wants to remove the existing document
          if (config.existingUrl) {
            try {
              await deleteFileFromSupabase(config.existingUrl, config.tag)
            } catch (error) {
              console.warn(`Failed to delete ${config.tag}:`, error)
            }
          }
          updateData[config.field] = null
        }
        // If keepExisting === 'true' and no new file, do nothing (keep existing)
      }

      // Update the equipment only if there are changes
      let updatedEquipment = existing
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
        })
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
        // Keep existing image URLs (not modified in documents tab)
        image_url: updatedEquipment.image_url || null,
        thirdpartyInspectionImage: updatedEquipment.thirdparty_inspection_image || null,
        pgpcInspectionImage: updatedEquipment.pgpc_inspection_image || null,
        // Updated document URLs
        originalReceiptUrl: updatedEquipment.original_receipt_url || null,
        equipmentRegistrationUrl: updatedEquipment.equipment_registration_url || null,
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
      console.error('Equipment documents update error:', error)
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
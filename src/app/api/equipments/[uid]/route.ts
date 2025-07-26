// File: app/api/equipments/[uid]/route.ts

import { NextResponse } from 'next/server'
import { status as EquipmentStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createServiceRoleClient } from '@/lib/supabase-server'

const supabase = createServiceRoleClient()

export async function GET(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uid)) {
      return NextResponse.json({ error: 'Invalid equipment ID format' }, { status: 400 })
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: uid },
      include: {
        user: true, // Include created_by user info
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

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // Transform to match the expected interface format
    const transformedEquipment = {
      uid: equipment.id,
      brand: equipment.brand,
      model: equipment.model,
      type: equipment.type,
      insuranceExpirationDate: equipment.insurance_expiration_date?.toISOString() || "",
      registrationExpiry: equipment.registration_expiry?.toISOString() || undefined,
      status: equipment.status,
      remarks: equipment.remarks || undefined,
      owner: equipment.owner,
      image_url: equipment.image_url || undefined,
      inspectionDate: equipment.inspection_date?.toISOString() || undefined,
      plateNumber: equipment.plate_number || undefined,
      originalReceiptUrl: equipment.original_receipt_url || undefined,
      equipmentRegistrationUrl: equipment.equipment_registration_url || undefined,
      thirdpartyInspectionImage: equipment.thirdparty_inspection_image || undefined,
      pgpcInspectionImage: equipment.pgpc_inspection_image || undefined,
      equipmentParts: equipment.equipment_parts && equipment.equipment_parts.length > 0 
        ? (() => {
            try {
              const rawParts = equipment.equipment_parts[0];
              
              // Check if it's a URL (legacy format)
              if (typeof rawParts === 'string' && rawParts.startsWith('http')) {
                // Legacy format: convert URL array to modern format
                return {
                  rootFiles: equipment.equipment_parts.map((url, index) => ({
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
              // If parsing fails but we have data, treat as legacy URL format
              if (equipment.equipment_parts.length > 0) {
                return {
                  rootFiles: equipment.equipment_parts.map((url, index) => ({
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
        : undefined,
      before: equipment.before || undefined,
      created_at: equipment.created_at?.toISOString() || undefined,
      created_by: equipment.user?.full_name || undefined,
      project: {
        uid: equipment.project.id,
        name: equipment.project.name,
        client: {
          uid: equipment.project.client.id,
          name: equipment.project.client.name,
          location: {
            uid: equipment.project.client.location.id,
            address: equipment.project.client.location.address,
          },
        },
      },
    }

    return NextResponse.json(transformedEquipment)
  } catch (err) {
    const { uid } = await context.params
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uid)) {
      return NextResponse.json({ error: 'Invalid equipment ID format' }, { status: 400 })
    }

    const equipment = await prisma.equipment.findUnique({
      where: { id: uid }
    })
    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    if (equipment.image_url) {
      const match = equipment.image_url.match(/\/public\/equipments\/(.+)$/)
      if (match) {
        const fullPath = match[1]
        await supabase
          .storage
          .from('equipments')
          .remove([fullPath])
      }
    }

    await prisma.equipment.delete({ where: { id: uid } })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (err) {
    const { uid } = await context.params
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params
    const body = await request.json()
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uid)) {
      return NextResponse.json({ error: 'Invalid equipment ID format' }, { status: 400 })
    }

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

    // Build update payload from JSON body
    const updateData: Prisma.equipmentUpdateInput = {}
    
    if (body.brand !== undefined) updateData.brand = body.brand
    if (body.model !== undefined) updateData.model = body.model
    if (body.type !== undefined) updateData.type = body.type
    if (body.owner !== undefined) updateData.owner = body.owner
    if (body.status !== undefined) updateData.status = body.status
    if (body.before !== undefined) updateData.before = parseInt(body.before) || null
    if (body.remarks !== undefined) updateData.remarks = body.remarks
    if (body.plateNumber !== undefined) updateData.plate_number = body.plateNumber
    if (body.equipmentParts !== undefined) {
      // Convert parts structure to JSON string for storage in String[] field
      try {
        const partsData = typeof body.equipmentParts === 'string' 
          ? body.equipmentParts 
          : JSON.stringify(body.equipmentParts);
        updateData.equipment_parts = [partsData]; // Store as array with single JSON string
      } catch (error) {
        updateData.equipment_parts = [JSON.stringify({ rootFiles: [], folders: [] })];
      }
    }
    
    // Handle project assignment
    if (body.projectId !== undefined) {
      updateData.project = {
        connect: { id: body.projectId }
      }
    }
    
    // Handle dates
    if (body.inspectionDate) {
      updateData.inspection_date = new Date(body.inspectionDate)
    }
    if (body.insuranceExpirationDate) {
      updateData.insurance_expiration_date = new Date(body.insuranceExpirationDate)
    }
    if (body.registrationExpiry) {
      updateData.registration_expiry = new Date(body.registrationExpiry)
    }
    
    
    // Handle file URLs (for now just keep existing ones - file upload will be handled later)
    if (body.image_url !== undefined) updateData.image_url = body.image_url
    if (body.thirdpartyInspectionImage !== undefined) updateData.thirdparty_inspection_image = body.thirdpartyInspectionImage
    if (body.pgpcInspectionImage !== undefined) updateData.pgpc_inspection_image = body.pgpcInspectionImage
    if (body.originalReceiptUrl !== undefined) updateData.original_receipt_url = body.originalReceiptUrl
    if (body.equipmentRegistrationUrl !== undefined) updateData.equipment_registration_url = body.equipmentRegistrationUrl


    // Update the equipment
    const updatedEquipment = await prisma.equipment.update({
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

    // Transform response to match the expected interface format
    const transformedEquipment = {
      uid: updatedEquipment.id,
      brand: updatedEquipment.brand,
      model: updatedEquipment.model,
      type: updatedEquipment.type,
      insuranceExpirationDate: updatedEquipment.insurance_expiration_date?.toISOString() || "",
      registrationExpiry: updatedEquipment.registration_expiry?.toISOString() || undefined,
      before: updatedEquipment.before || undefined,
      status: updatedEquipment.status,
      remarks: updatedEquipment.remarks || undefined,
      owner: updatedEquipment.owner,
      image_url: updatedEquipment.image_url || undefined,
      inspectionDate: updatedEquipment.inspection_date?.toISOString() || undefined,
      plateNumber: updatedEquipment.plate_number || undefined,
      originalReceiptUrl: updatedEquipment.original_receipt_url || undefined,
      equipmentRegistrationUrl: updatedEquipment.equipment_registration_url || undefined,
      thirdpartyInspectionImage: updatedEquipment.thirdparty_inspection_image || undefined,
      pgpcInspectionImage: updatedEquipment.pgpc_inspection_image || undefined,
      equipmentParts: updatedEquipment.equipment_parts && updatedEquipment.equipment_parts.length > 0 
        ? (() => {
            try {
              const rawParts = updatedEquipment.equipment_parts[0];
              
              // Check if it's a URL (legacy format)
              if (typeof rawParts === 'string' && rawParts.startsWith('http')) {
                // Legacy format: convert URL array to modern format
                const legacyParts = {
                  rootFiles: updatedEquipment.equipment_parts.map((url, index) => ({
                    id: `legacy_${index}`,
                    name: url.split('/').pop() || `image_${index}`,
                    preview: url
                  })),
                  folders: []
                };
                return legacyParts;
              }
              
              // Try to parse as JSON (modern format)
              const parsed = JSON.parse(rawParts);
              return parsed;
            } catch (error) {
              // If parsing fails but we have data, treat as legacy URL format
              if (updatedEquipment.equipment_parts.length > 0) {
                const fallbackParts = {
                  rootFiles: updatedEquipment.equipment_parts.map((url, index) => ({
                    id: `legacy_${index}`,
                    name: url.split('/').pop() || `image_${index}`,
                    preview: url
                  })),
                  folders: []
                };
                return fallbackParts;
              }
              return { rootFiles: [], folders: [] };
            }
          })()
        : undefined,
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
  } catch (err) {
    const { uid } = await context.params
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uid)) {
      return NextResponse.json({ error: 'Invalid equipment ID format' }, { status: 400 })
    }
    
    const formData = await request.formData()
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const type = formData.get('type') as string
    const expirationDate = formData.get('expirationDate') as string
    const status = formData.get('status') as keyof typeof EquipmentStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner = formData.get('owner') as string
    const inspectionDateStr = formData.get('inspectionDate') as string | null
    const imageFile = formData.get('image') as File | null

    const existing = await prisma.equipment.findUnique({
      where: { id: uid }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // build update payload
    const updateData: Prisma.equipmentUpdateInput = {
      brand,
      model,
      type,
      insurance_expiration_date: new Date(expirationDate),
      status,
      remarks,
      owner,
    }
    if (inspectionDateStr) {
      updateData.inspection_date = new Date(inspectionDateStr)
    } else {
      updateData.inspection_date = null
    }

    // update fields first
    await prisma.equipment.update({
      where: { id: uid },
      data: updateData
    })

    // handle image replacement if provided
    if (imageFile && imageFile.size > 0) {
      // remove old file
      if (existing.image_url) {
        const match = existing.image_url.match(/\/public\/equipments\/(.+)$/)
        if (match) {
          await supabase
            .storage
            .from('equipments')
            .remove([match[1]])
        }
      }

      // upload new file
      const timestamp = Date.now()
      const fileName = `${timestamp}_${imageFile.name}`
      const filePath = `${existing.project_id}/${uid}/${fileName}`
      const buffer = Buffer.from(await imageFile.arrayBuffer())

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('equipments')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        return NextResponse.json({ error: 'Image upload failed' }, { status: 500 })
      }

      const { data: urlData } = supabase
        .storage
        .from('equipments')
        .getPublicUrl(uploadData.path)

      await prisma.equipment.update({
        where: { id: uid },
        data: { image_url: urlData.publicUrl }
      })
    }

    const updated = await prisma.equipment.findUnique({
      where: { id: uid }
    })
    return NextResponse.json(updated)
  } catch (err) {
    const { uid } = await context.params
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

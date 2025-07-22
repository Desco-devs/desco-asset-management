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

    const equipment = await prisma.equipment.findUnique({
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
    console.error(`GET /api/equipments/${uid} error:`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params

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
    console.error(`DELETE /api/equipments/${uid} error:`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params
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
        console.error('Supabase upload error:', uploadError)
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
    console.error(`PATCH /api/equipments/${uid} error:`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// File: app/api/equipments/[uid]/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient, Status as EquipmentStatus } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
)

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params

    const equipment = await prisma.equipment.findUnique({
      where: { uid }
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

    await prisma.equipment.delete({ where: { uid } })

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
      where: { uid }
    })
    if (!existing) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // build update payload
    const updateData: any = {
      brand,
      model,
      type,
      expirationDate: new Date(expirationDate),
      status,
      remarks,
      owner,
    }
    if (inspectionDateStr) {
      updateData.inspectionDate = new Date(inspectionDateStr)
    } else {
      updateData.inspectionDate = null
    }

    // update fields first
    await prisma.equipment.update({
      where: { uid },
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
      const filePath = `${existing.projectId}/${uid}/${fileName}`
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
        where: { uid },
        data: { image_url: urlData.publicUrl }
      })
    }

    const updated = await prisma.equipment.findUnique({
      where: { uid }
    })
    return NextResponse.json(updated)
  } catch (err) {
    const { uid } = await context.params
    console.error(`PATCH /api/equipments/${uid} error:`, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

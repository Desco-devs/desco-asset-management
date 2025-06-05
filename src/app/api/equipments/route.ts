// File: app/api/equipments/route.ts

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const type = formData.get('type') as string
    const expirationDate = formData.get('expirationDate') as string
    const status = formData.get('status') as keyof typeof EquipmentStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner = formData.get('owner') as string
    const projectId = formData.get('projectId') as string
    const inspectionDateStr = formData.get('inspectionDate') as string | null
    const imageFile = formData.get('image') as File | null

    if (!brand || !model || !type || !expirationDate || !owner || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1) create equipment record (without image_url for now)
    const createData: any = {
      brand,
      model,
      type,
      expirationDate: new Date(expirationDate),
      status,
      remarks,
      owner,
      project: { connect: { uid: projectId } },
    }
    if (inspectionDateStr) {
      createData.inspectionDate = new Date(inspectionDateStr)
    }

    const equipment = await prisma.equipment.create({
      data: createData,
    })

    // 2) if an image was uploaded, push to Supabase and update the record
    if (imageFile && imageFile.size > 0) {
      const timestamp = Date.now()
      const fileName = `${timestamp}_${imageFile.name}`
      const filePath = `${projectId}/${equipment.uid}/${fileName}`
      const buffer = Buffer.from(await imageFile.arrayBuffer())

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('equipments')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError || !uploadData) {
        console.error('Supabase upload error:', uploadError)
        // optional: rollback the record
        await prisma.equipment.delete({ where: { uid: equipment.uid } })
        return NextResponse.json(
          { error: 'Image upload failed' },
          { status: 500 }
        )
      }

      const { data: urlData } = supabase
        .storage
        .from('equipments')
        .getPublicUrl(uploadData.path)

      await prisma.equipment.update({
        where: { uid: equipment.uid },
        data: { image_url: urlData.publicUrl },
      })
    }

    // 3) return the equipment (with or without image_url)
    const result = await prisma.equipment.findUnique({
      where: { uid: equipment.uid },
    })
    return NextResponse.json(result)
  } catch (err) {
    console.error('POST /api/equipments error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const formData = await request.formData()
    const equipmentId = formData.get('equipmentId') as string
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const type = formData.get('type') as string
    const expirationDate = formData.get('expirationDate') as string
    const status = formData.get('status') as keyof typeof EquipmentStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner = formData.get('owner') as string
    const projectId = formData.get('projectId') as string
    const inspectionDateStr = formData.get('inspectionDate') as string | null
    const imageFile = formData.get('image') as File | null
    const keepExistingImage = formData.get('keepExistingImage') as string

    if (!equipmentId || !brand || !model || !type || !expirationDate || !owner || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Check if equipment exists
    const existingEquipment = await prisma.equipment.findUnique({
      where: { uid: equipmentId }
    })

    if (!existingEquipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      brand,
      model,
      type,
      expirationDate: new Date(expirationDate),
      status,
      remarks,
      owner,
      project: { connect: { uid: projectId } },
    }

    if (inspectionDateStr) {
      updateData.inspectionDate = new Date(inspectionDateStr)
    } else {
      updateData.inspectionDate = null
    }

    // Handle image upload if new image provided
    if (imageFile && imageFile.size > 0) {
      // Delete old image from Supabase if it exists
      if (existingEquipment.image_url) {
        try {
          const oldImagePath = existingEquipment.image_url.split('/').slice(-3).join('/')
          await supabase.storage.from('equipments').remove([oldImagePath])
        } catch (error) {
          console.log('Old image deletion failed (non-critical):', error)
        }
      }

      // Upload new image
      const timestamp = Date.now()
      const fileName = `${timestamp}_${imageFile.name}`
      const filePath = `${projectId}/${equipmentId}/${fileName}`
      const buffer = Buffer.from(await imageFile.arrayBuffer())

      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('equipments')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError || !uploadData) {
        console.error('Supabase upload error:', uploadError)
        return NextResponse.json(
          { error: 'Image upload failed' },
          { status: 500 }
        )
      }

      const { data: urlData } = supabase
        .storage
        .from('equipments')
        .getPublicUrl(uploadData.path)

      updateData.image_url = urlData.publicUrl
    } else if (keepExistingImage !== 'true') {
      // If no new image and not keeping existing, remove the image
      if (existingEquipment.image_url) {
        try {
          const oldImagePath = existingEquipment.image_url.split('/').slice(-3).join('/')
          await supabase.storage.from('equipments').remove([oldImagePath])
        } catch (error) {
          console.log('Old image deletion failed (non-critical):', error)
        }
      }
      updateData.image_url = null
    }
    // If keepExistingImage is 'true', don't update image_url (keep existing)

    // Update the equipment
    const equipment = await prisma.equipment.update({
      where: { uid: equipmentId },
      data: updateData,
    })

    // Return updated equipment with relations
    const result = await prisma.equipment.findUnique({
      where: { uid: equipment.uid },
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
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('PUT /api/equipments error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, status as VehicleStatus } from '@prisma/client'
import { createServiceRoleClient } from '@/lib/supabase-server'

const prisma = new PrismaClient()
const supabase = createServiceRoleClient()

// GET: Retrieve a single vehicle by UID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: uid },
      include: { project: true },
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    return NextResponse.json(vehicle, { status: 200 })
  } catch (err) {
    const { uid } = await context.params
    console.error(`GET /api/vehicles/${uid} error:`, err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH: Update a vehicle
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params
    const formData = await request.formData()
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const type = formData.get('type') as string
    const plateNumber = formData.get('plateNumber') as string
    const inspectionDate = formData.get('inspectionDate') as string
    const before = formData.get('before') as string
    const expiryDate = formData.get('expiryDate') as string
    const status = formData.get('status') as keyof typeof VehicleStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner = formData.get('owner') as string
    const frontImg = formData.get('frontImg') as File | null
    const backImg = formData.get('backImg') as File | null
    const side1Img = formData.get('side1Img') as File | null
    const side2Img = formData.get('side2Img') as File | null

    const existing = await prisma.vehicle.findUnique({
      where: { id: uid },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Build update payload
    const updateData: any = {
      brand,
      model,
      type,
      plate_number: plateNumber,
      inspection_date: new Date(inspectionDate),
      before: parseInt(before),
      expiry_date: new Date(expiryDate),
      status,
      remarks,
      owner,
    }

    // Update vehicle fields first (without images)
    await prisma.vehicle.update({
      where: { id: uid },
      data: updateData,
    })

    // Handle image uploads
    const imageFields: { formKey: string; urlKey: string; side: string }[] = [
      { formKey: 'frontImg', urlKey: 'front_img_url', side: 'front' },
      { formKey: 'backImg', urlKey: 'back_img_url', side: 'back' },
      { formKey: 'side1Img', urlKey: 'side1_img_url', side: 'side1' },
      { formKey: 'side2Img', urlKey: 'side2_img_url', side: 'side2' },
    ]

    for (const { formKey, urlKey, side } of imageFields) {
      const file = formData.get(formKey) as File | null
      if (file && file.size > 0) {
        // Remove old image if exists
        const oldUrl = existing[urlKey as keyof typeof existing] as string | null | undefined
        if (oldUrl) {
          const match = oldUrl.match(/\/public\/vehicles\/(.+)$/)
          if (match) {
            await supabase.storage.from('vehicles').remove([match[1]])
          }
        }

        // Upload new image
        const timestamp = Date.now()
        const fileName = `${timestamp}_${file.name}`
        // Include vehicleId folder in path
        const filePath = `vehicles/${existing.project_id}/${existing.id}/${side}/${fileName}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabase
          .storage
          .from('vehicles')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error(`Supabase upload error for ${side}:`, uploadError)
          return NextResponse.json(
            { error: `Failed to upload ${side} image` },
            { status: 500 }
          )
        }

        const { data: urlData } = supabase.storage
          .from('vehicles')
          .getPublicUrl(filePath)

        // Update vehicle record for this image url
        await prisma.vehicle.update({
          where: { id: uid },
          data: { [urlKey]: urlData.publicUrl },
        })
      }
    }

    const updated = await prisma.vehicle.findUnique({
      where: { id: uid },
      include: { project: true },
    })

    return NextResponse.json(updated, { status: 200 })
  } catch (err) {
    const { uid } = await context.params
    console.error(`PATCH /api/vehicles/${uid} error:`, err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Delete a vehicle and its images
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await context.params

    const vehicle = await prisma.vehicle.findUnique({
      where: { id: uid },
    })
    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Collect image paths to delete
    const imageUrls = [
      vehicle.front_img_url,
      vehicle.back_img_url,
      vehicle.side1_img_url,
      vehicle.side2_img_url,
    ]
    const pathsToDelete: string[] = []

    for (const url of imageUrls) {
      if (url) {
        const match = url.match(/\/public\/vehicles\/(.+)$/)
        if (match) {
          pathsToDelete.push(match[1])
        }
      }
    }

    if (pathsToDelete.length > 0) {
      await supabase.storage.from('vehicles').remove(pathsToDelete)
    }

    await prisma.vehicle.delete({ where: { id: uid } })

    return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 })
  } catch (err) {
    const { uid } = await context.params
    console.error(`DELETE /api/vehicles/${uid} error:`, err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

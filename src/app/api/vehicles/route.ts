import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient, Status as VehicleStatus } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
)

// GET: Retrieve vehicles by projectId
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      )
    }

    const vehicles = await prisma.vehicle.findMany({
      where: { projectId },
      include: { project: true },
    })

    return NextResponse.json(vehicles, { status: 200 })
  } catch (err) {
    console.error('GET /api/vehicles error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: Create a new vehicle with image uploads
export async function POST(request: NextRequest) {
  try {
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
    const projectId = formData.get('projectId') as string
    const frontImg = formData.get('frontImg') as File | null
    const backImg = formData.get('backImg') as File | null
    const side1Img = formData.get('side1Img') as File | null
    const side2Img = formData.get('side2Img') as File | null

    // Validate required fields
    const requiredFields = [
      'brand',
      'model',
      'type',
      'plateNumber',
      'inspectionDate',
      'before',
      'expiryDate',
      'status',
      'owner',
      'projectId',
    ]
    for (const field of requiredFields) {
      if (!formData.get(field)) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        )
      }
    }

    // Create vehicle record first without image URLs
    const vehicle = await prisma.vehicle.create({
      data: {
        brand,
        model,
        type,
        plateNumber,
        inspectionDate: new Date(inspectionDate),
        before: parseInt(before),
        expiryDate: new Date(expiryDate),
        status,
        remarks,
        owner,
        projectId,
      },
    })

    const vehicleId = vehicle.uid // Adjust if your PK differs

    // Image upload info array
    const imageFields: { file: File | null; dbField: string; side: string }[] = [
      { file: frontImg, dbField: 'frontImgUrl', side: 'front' },
      { file: backImg, dbField: 'backImgUrl', side: 'back' },
      { file: side1Img, dbField: 'side1ImgUrl', side: 'side1' },
      { file: side2Img, dbField: 'side2ImgUrl', side: 'side2' },
    ]

    const updateData: Record<string, string> = {}

    // Upload images one by one
    for (const { file, dbField, side } of imageFields) {
      if (file && file.size > 0) {
        const timestamp = Date.now()
        const fileName = `${timestamp}_${file.name}`
        // Path with vehicleId folder included:
        const filePath = `vehicles/${projectId}/${vehicleId}/${side}/${fileName}`
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

        updateData[dbField] = urlData.publicUrl
      }
    }

    // Update vehicle record with image URLs
    if (Object.keys(updateData).length > 0) {
      await prisma.vehicle.update({
        where: { uid: vehicleId },
        data: updateData,
      })
    }

    // Return the updated vehicle record
    const updatedVehicle = await prisma.vehicle.findUnique({
      where: { uid: vehicleId },
    })

    return NextResponse.json(updatedVehicle, { status: 201 })
  } catch (err) {
    console.error('POST /api/vehicles error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

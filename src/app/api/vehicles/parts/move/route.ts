// File: app/api/vehicles/parts/move/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createServiceRoleClient } from '@/lib/supabase-server'

const prisma = new PrismaClient()
const supabase = createServiceRoleClient()

// Function to move file in Supabase storage
const moveFileInSupabase = async (
  oldUrl: string,
  projectId: string,
  vehicleId: string,
  newFolderPath: string,
  partNumber: number,
  originalFilename: string
): Promise<string> => {
  try {
    // Extract the old file path from URL
    const urlParts = oldUrl.split('/storage/v1/object/public/vehicles/')
    if (urlParts.length !== 2) {
      throw new Error('Invalid file URL format')
    }
    const oldFilePath = urlParts[1]

    // Download the file
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('vehicles')
      .download(oldFilePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }

    // Create new file path
    const timestamp = Date.now()
    const ext = originalFilename.split('.').pop()
    const filename = `${partNumber}_${originalFilename.replace(/\.[^/.]+$/, "")}_${timestamp}.${ext}`
    const sanitizedFolderPath = newFolderPath.replace(/[^a-zA-Z0-9_\-\/]/g, '_')
    const newFilePath = `${projectId}/${vehicleId}/${sanitizedFolderPath}/${filename}`

    // Upload to new location
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('vehicles')
      .upload(newFilePath, fileData, { cacheControl: '3600', upsert: false })

    if (uploadError || !uploadData) {
      throw new Error(`Failed to upload file: ${uploadError?.message}`)
    }

    // Delete old file
    const { error: deleteError } = await supabase
      .storage
      .from('vehicles')
      .remove([oldFilePath])

    if (deleteError) {
      console.warn(`Failed to delete old file: ${deleteError.message}`)
    }

    // Get public URL for new file
    const { data: urlData } = supabase.storage
      .from('vehicles')
      .getPublicUrl(newFilePath)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error moving file in Supabase:', error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { vehicleId, partIndex, oldUrl, newFolderPath, originalFilename } = body

    // Validate required fields
    if (!vehicleId || partIndex === undefined || !oldUrl || !newFolderPath || !originalFilename) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get vehicle to find project
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { project: true }
    })

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    // Get current vehicle parts
    const currentParts = vehicle.vehicle_parts || []
    if (partIndex >= currentParts.length) {
      return NextResponse.json(
        { error: 'Part index out of range' },
        { status: 400 }
      )
    }

    // Move file in Supabase and get new URL
    const newUrl = await moveFileInSupabase(
      oldUrl,
      vehicle.project_id,
      vehicleId,
      newFolderPath,
      partIndex,
      originalFilename
    )

    // Update the part URL in database
    const updatedParts = [...currentParts]
    updatedParts[partIndex] = newUrl

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { vehicle_parts: updatedParts }
    })

    return NextResponse.json({
      success: true,
      newUrl,
      message: 'Part moved successfully'
    })

  } catch (error) {
    console.error('Error moving vehicle part:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
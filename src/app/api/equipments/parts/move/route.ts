// File: app/api/equipments/parts/move/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

// Function to move file in Supabase storage
const moveFileInSupabase = async (
  oldUrl: string,
  projectId: string,
  equipmentId: string,
  newFolderPath: string,
  partNumber: number,
  originalFilename: string
): Promise<string> => {
  try {
    // Extract the old file path from URL
    const urlParts = oldUrl.split('/storage/v1/object/public/equipments/')
    if (urlParts.length !== 2) {
      throw new Error('Invalid file URL format')
    }
    const oldFilePath = urlParts[1]

    // Download the file
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('equipments')
      .download(oldFilePath)

    if (downloadError || !fileData) {
      throw new Error(`Failed to download file: ${downloadError?.message}`)
    }

    // Create new file path
    const timestamp = Date.now()
    const ext = originalFilename.split('.').pop()
    const filename = `${partNumber}_${originalFilename.replace(/\.[^/.]+$/, "")}_${timestamp}.${ext}`
    const sanitizedFolderPath = newFolderPath.replace(/[^a-zA-Z0-9_\-\/]/g, '_')
    const newFilePath = `${projectId}/${equipmentId}/${sanitizedFolderPath}/${filename}`

    // Upload to new location
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('equipments')
      .upload(newFilePath, fileData, { cacheControl: '3600', upsert: false })

    if (uploadError || !uploadData) {
      throw new Error(`Failed to upload to new location: ${uploadError?.message}`)
    }

    // Delete old file
    const { error: deleteError } = await supabase
      .storage
      .from('equipments')
      .remove([oldFilePath])

    if (deleteError) {
      console.warn(`Warning: Failed to delete old file: ${deleteError.message}`)
    }

    // Get new public URL
    const { data: urlData } = supabase
      .storage
      .from('equipments')
      .getPublicUrl(uploadData.path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Error moving file:', error)
    throw error
  }
}

export async function POST(request: Request) {
  try {
    const { equipmentId, partUrl, newFolderPath, partIndex, originalFilename } = await request.json()

    if (!equipmentId || !partUrl || !newFolderPath || partIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get equipment details
    const equipment = await prisma.equipment.findUnique({
      where: { uid: equipmentId },
      include: { project: true }
    })

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
    }

    // Move the file
    const newUrl = await moveFileInSupabase(
      partUrl,
      equipment.project.uid,
      equipmentId,
      newFolderPath,
      partIndex + 1,
      originalFilename
    )

    // Update the equipment parts array
    const currentParts = equipment.equipmentParts || []
    const newParts = [...currentParts]
    newParts[partIndex] = newUrl

    await prisma.equipment.update({
      where: { uid: equipmentId },
      data: { equipmentParts: newParts }
    })

    return NextResponse.json({ success: true, newUrl })
  } catch (error) {
    console.error('Move file error:', error)
    return NextResponse.json({ error: 'Failed to move file' }, { status: 500 })
  }
}
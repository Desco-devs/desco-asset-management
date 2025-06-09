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
    const plateNumber = (formData.get('plateNumber') as string) || null

    // Get file uploads
    const imageFile = formData.get('image') as File | null
    const originalReceiptFile = formData.get('originalReceipt') as File | null
    const equipmentRegistrationFile = formData.get('equipmentRegistration') as File | null

    if (!brand || !model || !type || !expirationDate || !owner || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // 1) create equipment record (without file URLs for now)
    const createData: any = {
      brand,
      model,
      type,
      expirationDate: new Date(expirationDate),
      status,
      remarks,
      owner,
      plateNumber,
      project: { connect: { uid: projectId } },
    }
    if (inspectionDateStr) {
      createData.inspectionDate = new Date(inspectionDateStr)
    }

    const equipment = await prisma.equipment.create({
      data: createData,
    })

    // 2) Upload files to Supabase and update the record
    const fileUploads = []

    // Handle image upload
    if (imageFile && imageFile.size > 0) {
      const timestamp = Date.now()
      const fileName = `image_${timestamp}_${imageFile.name}`
      const filePath = `${projectId}/${equipment.uid}/${fileName}`
      const buffer = Buffer.from(await imageFile.arrayBuffer())

      fileUploads.push(
        supabase.storage
          .from('equipments')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(({ data: uploadData, error: uploadError }) => {
            if (uploadError || !uploadData) {
              throw new Error(`Image upload failed: ${uploadError?.message}`)
            }
            const { data: urlData } = supabase.storage
              .from('equipments')
              .getPublicUrl(uploadData.path)
            return { field: 'image_url', url: urlData.publicUrl }
          })
      )
    }

    // Handle original receipt upload
    if (originalReceiptFile && originalReceiptFile.size > 0) {
      const timestamp = Date.now()
      const fileName = `receipt_${timestamp}_${originalReceiptFile.name}`
      const filePath = `${projectId}/${equipment.uid}/${fileName}`
      const buffer = Buffer.from(await originalReceiptFile.arrayBuffer())

      fileUploads.push(
        supabase.storage
          .from('equipments')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(({ data: uploadData, error: uploadError }) => {
            if (uploadError || !uploadData) {
              throw new Error(`Original receipt upload failed: ${uploadError?.message}`)
            }
            const { data: urlData } = supabase.storage
              .from('equipments')
              .getPublicUrl(uploadData.path)
            return { field: 'originalReceiptUrl', url: urlData.publicUrl }
          })
      )
    }

    // Handle equipment registration upload
    if (equipmentRegistrationFile && equipmentRegistrationFile.size > 0) {
      const timestamp = Date.now()
      const fileName = `registration_${timestamp}_${equipmentRegistrationFile.name}`
      const filePath = `${projectId}/${equipment.uid}/${fileName}`
      const buffer = Buffer.from(await equipmentRegistrationFile.arrayBuffer())

      fileUploads.push(
        supabase.storage
          .from('equipments')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(({ data: uploadData, error: uploadError }) => {
            if (uploadError || !uploadData) {
              throw new Error(`Equipment registration upload failed: ${uploadError?.message}`)
            }
            const { data: urlData } = supabase.storage
              .from('equipments')
              .getPublicUrl(uploadData.path)
            return { field: 'equipmentRegistrationUrl', url: urlData.publicUrl }
          })
      )
    }

    // Wait for all file uploads to complete
    if (fileUploads.length > 0) {
      try {
        const uploadResults = await Promise.all(fileUploads)

        // Build update data with file URLs
        const updateData: any = {}
        uploadResults.forEach(result => {
          updateData[result.field] = result.url
        })

        await prisma.equipment.update({
          where: { uid: equipment.uid },
          data: updateData,
        })
      } catch (uploadError) {
        console.error('File upload error:', uploadError)
        // Rollback the equipment record
        await prisma.equipment.delete({ where: { uid: equipment.uid } })
        return NextResponse.json(
          { error: 'File upload failed' },
          { status: 500 }
        )
      }
    }

    // 3) return the equipment (with file URLs if uploaded)
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
    const plateNumber = (formData.get('plateNumber') as string) || null

    // Get file uploads
    const imageFile = formData.get('image') as File | null
    const originalReceiptFile = formData.get('originalReceipt') as File | null
    const equipmentRegistrationFile = formData.get('equipmentRegistration') as File | null

    // Get keep existing file flags
    const keepExistingImage = formData.get('keepExistingImage') as string
    const keepExistingReceipt = formData.get('keepExistingReceipt') as string
    const keepExistingRegistration = formData.get('keepExistingRegistration') as string

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
      plateNumber,
      project: { connect: { uid: projectId } },
    }

    if (inspectionDateStr) {
      updateData.inspectionDate = new Date(inspectionDateStr)
    } else {
      updateData.inspectionDate = null
    }

    // Handle file uploads and deletions
    const fileUploads = []

    // Handle image
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
      const fileName = `image_${timestamp}_${imageFile.name}`
      const filePath = `${projectId}/${equipmentId}/${fileName}`
      const buffer = Buffer.from(await imageFile.arrayBuffer())

      fileUploads.push(
        supabase.storage
          .from('equipments')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(({ data: uploadData, error: uploadError }) => {
            if (uploadError || !uploadData) {
              throw new Error(`Image upload failed: ${uploadError?.message}`)
            }
            const { data: urlData } = supabase.storage
              .from('equipments')
              .getPublicUrl(uploadData.path)
            return { field: 'image_url', url: urlData.publicUrl }
          })
      )
    } else if (keepExistingImage !== 'true') {
      // Remove existing image
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

    // Handle original receipt
    if (originalReceiptFile && originalReceiptFile.size > 0) {
      // Delete old receipt from Supabase if it exists
      if (existingEquipment.originalReceiptUrl) {
        try {
          const oldReceiptPath = existingEquipment.originalReceiptUrl.split('/').slice(-3).join('/')
          await supabase.storage.from('equipments').remove([oldReceiptPath])
        } catch (error) {
          console.log('Old receipt deletion failed (non-critical):', error)
        }
      }

      // Upload new receipt
      const timestamp = Date.now()
      const fileName = `receipt_${timestamp}_${originalReceiptFile.name}`
      const filePath = `${projectId}/${equipmentId}/${fileName}`
      const buffer = Buffer.from(await originalReceiptFile.arrayBuffer())

      fileUploads.push(
        supabase.storage
          .from('equipments')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(({ data: uploadData, error: uploadError }) => {
            if (uploadError || !uploadData) {
              throw new Error(`Original receipt upload failed: ${uploadError?.message}`)
            }
            const { data: urlData } = supabase.storage
              .from('equipments')
              .getPublicUrl(uploadData.path)
            return { field: 'originalReceiptUrl', url: urlData.publicUrl }
          })
      )
    } else if (keepExistingReceipt !== 'true') {
      // Remove existing receipt
      if (existingEquipment.originalReceiptUrl) {
        try {
          const oldReceiptPath = existingEquipment.originalReceiptUrl.split('/').slice(-3).join('/')
          await supabase.storage.from('equipments').remove([oldReceiptPath])
        } catch (error) {
          console.log('Old receipt deletion failed (non-critical):', error)
        }
      }
      updateData.originalReceiptUrl = null
    }

    // Handle equipment registration
    if (equipmentRegistrationFile && equipmentRegistrationFile.size > 0) {
      // Delete old registration from Supabase if it exists
      if (existingEquipment.equipmentRegistrationUrl) {
        try {
          const oldRegistrationPath = existingEquipment.equipmentRegistrationUrl.split('/').slice(-3).join('/')
          await supabase.storage.from('equipments').remove([oldRegistrationPath])
        } catch (error) {
          console.log('Old registration deletion failed (non-critical):', error)
        }
      }

      // Upload new registration
      const timestamp = Date.now()
      const fileName = `registration_${timestamp}_${equipmentRegistrationFile.name}`
      const filePath = `${projectId}/${equipmentId}/${fileName}`
      const buffer = Buffer.from(await equipmentRegistrationFile.arrayBuffer())

      fileUploads.push(
        supabase.storage
          .from('equipments')
          .upload(filePath, buffer, {
            cacheControl: '3600',
            upsert: false,
          })
          .then(({ data: uploadData, error: uploadError }) => {
            if (uploadError || !uploadData) {
              throw new Error(`Equipment registration upload failed: ${uploadError?.message}`)
            }
            const { data: urlData } = supabase.storage
              .from('equipments')
              .getPublicUrl(uploadData.path)
            return { field: 'equipmentRegistrationUrl', url: urlData.publicUrl }
          })
      )
    } else if (keepExistingRegistration !== 'true') {
      // Remove existing registration
      if (existingEquipment.equipmentRegistrationUrl) {
        try {
          const oldRegistrationPath = existingEquipment.equipmentRegistrationUrl.split('/').slice(-3).join('/')
          await supabase.storage.from('equipments').remove([oldRegistrationPath])
        } catch (error) {
          console.log('Old registration deletion failed (non-critical):', error)
        }
      }
      updateData.equipmentRegistrationUrl = null
    }

    // Wait for all file uploads to complete
    if (fileUploads.length > 0) {
      try {
        const uploadResults = await Promise.all(fileUploads)

        // Add file URLs to update data
        uploadResults.forEach(result => {
          updateData[result.field] = result.url
        })
      } catch (uploadError) {
        console.error('File upload error:', uploadError)
        return NextResponse.json(
          { error: 'File upload failed' },
          { status: 500 }
        )
      }
    }

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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const equipmentId = searchParams.get('equipmentId')

    if (!equipmentId) {
      return NextResponse.json(
        { error: 'equipmentId is required' },
        { status: 400 }
      )
    }

    // Get equipment data before deletion to access project info and file URLs
    const existingEquipment = await prisma.equipment.findUnique({
      where: { uid: equipmentId },
      include: {
        project: true // Include project to get projectId
      }
    })

    if (!existingEquipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      )
    }

    const projectId = existingEquipment.projectId;

    // Delete equipment from database first
    await prisma.equipment.delete({
      where: { uid: equipmentId }
    })

    // Handle file deletions from Supabase storage
    let fileDeletionResult = {
      attempted: false,
      successful: false,
      error: null as string | null
    };

    if (existingEquipment.image_url || existingEquipment.originalReceiptUrl || existingEquipment.equipmentRegistrationUrl) {
      try {
        fileDeletionResult.attempted = true;

        // Equipment storage structure: equipments/projectId/equipmentId/filename
        const equipmentFolderPath = `${projectId}/${equipmentId}`;
        console.log(`Attempting to delete equipment folder: ${equipmentFolderPath}`);

        // List all files in the equipment folder
        const { data: allFiles, error: listError } = await supabase.storage
          .from('equipments')
          .list(equipmentFolderPath, {
            limit: 100,
            offset: 0
          });

        if (listError) {
          console.error('Error listing equipment folder:', listError);
          throw new Error(`Failed to list equipment folder: ${listError.message}`);
        }

        if (allFiles && allFiles.length > 0) {
          // Delete all files in the equipment folder
          const filePaths = allFiles
            .filter(file => file.name && file.name !== '.emptyFolderPlaceholder')
            .map(file => `${equipmentFolderPath}/${file.name}`);

          if (filePaths.length > 0) {
            console.log(`Deleting ${filePaths.length} files:`, filePaths);

            const { error: deleteError } = await supabase.storage
              .from('equipments')
              .remove(filePaths);

            if (deleteError) {
              console.error('Failed to delete equipment files:', deleteError);
              fileDeletionResult.error = deleteError.message;
            } else {
              console.log(`Successfully deleted ${filePaths.length} equipment files`);
              fileDeletionResult.successful = true;
            }
          } else {
            console.log('No files found to delete in equipment folder');
            fileDeletionResult.successful = true;
          }
        } else {
          console.log('Equipment folder is empty or does not exist');
          fileDeletionResult.successful = true;
        }

      } catch (storageError) {
        console.error('Storage deletion failed, trying fallback method:', storageError);

        // Fallback: Try individual file deletion using URLs
        try {
          const urlsToDelete = [
            existingEquipment.image_url,
            existingEquipment.originalReceiptUrl,
            existingEquipment.equipmentRegistrationUrl
          ].filter(url => url !== null);

          for (const fileUrl of urlsToDelete) {
            try {
              const url = new URL(fileUrl!);
              const pathParts = url.pathname.split('/').filter(part => part !== '');

              // For equipment URL: /storage/v1/object/public/equipments/projectId/equipmentId/filename
              // Find 'equipments' and get path after it
              const equipmentsIndex = pathParts.findIndex(part => part === 'equipments');

              if (equipmentsIndex !== -1 && equipmentsIndex < pathParts.length - 1) {
                const filePath = pathParts.slice(equipmentsIndex + 1).join('/');

                console.log(`Fallback: Attempting to delete file: ${filePath}`);

                const { error } = await supabase.storage
                  .from('equipments')
                  .remove([filePath]);

                if (error) {
                  console.error('Fallback deletion failed for file:', filePath, error);
                } else {
                  console.log('Fallback deletion successful for file:', filePath);
                }
              }
            } catch (fileError) {
              console.error('Error deleting individual file:', fileError);
            }
          }

          fileDeletionResult.successful = true;
        } catch (fallbackError) {
          console.error('Fallback deletion error:', fallbackError);
          fileDeletionResult.error = `Primary and fallback deletion failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`;
        }
      }
    }

    const response = {
      message: 'Equipment deleted successfully',
      fileDeletionStatus: fileDeletionResult
    };

    return NextResponse.json(response, { status: 200 });

  } catch (err) {
    console.error('DELETE /api/equipments error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
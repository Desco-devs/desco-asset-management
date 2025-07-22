import { NextRequest, NextResponse } from 'next/server'
import { status as VehicleStatus } from '@prisma/client'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'
const supabase = createServiceRoleClient()

// GET: Retrieve vehicles with proper role-based access control
export const GET = withResourcePermission('vehicles', 'view', async (request: NextRequest, _user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Build query filters
    const where: any = {}
    if (projectId) {
      where.project_id = projectId
    }

    // Apply pagination if provided
    const queryOptions: any = {
      where,
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
      },
      orderBy: {
        created_at: 'desc'
      }
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }
    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    const vehicles = await prisma.vehicle.findMany(queryOptions)
    const total = await prisma.vehicle.count({ where })

    return NextResponse.json({
      data: vehicles,
      total,
      user_role: user.role,
      permissions: {
        can_create: user.role !== 'VIEWER',
        can_update: user.role !== 'VIEWER',
        can_delete: user.role === 'SUPERADMIN'
      }
    })
  } catch (err) {
    console.error('GET /api/vehicles error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

// POST: Create a new vehicle with image uploads
export const POST = withResourcePermission('vehicles', 'create', async (request: NextRequest, _user: AuthenticatedUser) => {
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
    const originalReceipt = formData.get('originalReceipt') as File | null
    const carRegistration = formData.get('carRegistration') as File | null
    const pgpcInspectionImg = formData.get('pgpcInspectionImg') as File | null

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
        plate_number: plateNumber,
        inspection_date: new Date(inspectionDate),
        before: parseInt(before),
        expiry_date: new Date(expiryDate),
        status,
        remarks,
        owner,
        project_id: projectId,
      },
    })

    const vehicleId = vehicle.id

    // Image upload info array
    const imageFields: { file: File | null; dbField: string; side: string }[] = [
      { file: frontImg, dbField: 'front_img_url', side: 'front' },
      { file: backImg, dbField: 'back_img_url', side: 'back' },
      { file: side1Img, dbField: 'side1_img_url', side: 'side1' },
      { file: side2Img, dbField: 'side2_img_url', side: 'side2' },
      { file: originalReceipt, dbField: 'original_receipt_url', side: 'original-receipt' },
      { file: carRegistration, dbField: 'car_registration_url', side: 'car-registration' },
      { file: pgpcInspectionImg, dbField: 'pgpc_inspection_image', side: 'pgpc-inspection' },
    ]

    const updateData: Record<string, string> = {}

    // Upload images one by one
    for (const { file, dbField, side } of imageFields) {
      if (file && file.size > 0) {
        const timestamp = Date.now()
        const fileName = `${timestamp}_${file.name}`
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
        where: { id: vehicleId },
        data: updateData,
      })
    }

    // Return the updated vehicle record
    const updatedVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
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

    return NextResponse.json(updatedVehicle, { status: 201 })
  } catch (err) {
    console.error('POST /api/vehicles error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})


export const PUT = withResourcePermission('vehicles', 'update', async (request: NextRequest, _user: AuthenticatedUser) => {
  try {
    const formData = await request.formData()
    const vehicleId = formData.get('vehicleId') as string
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

    const imageFields = [
      {
        newFile: formData.get('frontImg') as File | null,
        keepFlag: formData.get('keepFrontImg') === 'true',
        existingUrlKey: 'front_img_url',
        prefix: 'front',
        displayName: 'front image'
      },
      {
        newFile: formData.get('backImg') as File | null,
        keepFlag: formData.get('keepBackImg') === 'true',
        existingUrlKey: 'back_img_url',
        prefix: 'back',
        displayName: 'back image'
      },
      {
        newFile: formData.get('side1Img') as File | null,
        keepFlag: formData.get('keepSide1Img') === 'true',
        existingUrlKey: 'side1_img_url',
        prefix: 'side1',
        displayName: 'side1 image'
      },
      {
        newFile: formData.get('side2Img') as File | null,
        keepFlag: formData.get('keepSide2Img') === 'true',
        existingUrlKey: 'side2_img_url',
        prefix: 'side2',
        displayName: 'side2 image'
      },
      {
        newFile: formData.get('originalReceipt') as File | null,
        keepFlag: formData.get('keepOriginalReceipt') === 'true',
        existingUrlKey: 'original_receipt_url',
        prefix: 'original-receipt',
        displayName: 'original receipt'
      },
      {
        newFile: formData.get('carRegistration') as File | null,
        keepFlag: formData.get('keepCarRegistration') === 'true',
        existingUrlKey: 'car_registration_url',
        prefix: 'car-registration',
        displayName: 'car registration'
      },
      {
        newFile: formData.get('pgpcInspectionImg') as File | null,
        keepFlag: formData.get('keepPgpcInspectionImg') === 'true',
        existingUrlKey: 'pgpc_inspection_image',
        prefix: 'pgpc-inspection',
        displayName: 'PGPC inspection image'
      }
    ]

    if (!vehicleId || !brand || !model || !type || !plateNumber || !inspectionDate || !before || !expiryDate || !owner || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existingVehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!existingVehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

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
      project: { connect: { id: projectId } },
    }

    const extractPath = (url: string) => url?.replace("https://zlavplinpqkxivkbthag.supabase.co/storage/v1/object/public/", '')

    for (const config of imageFields) {
      const existingUrl = existingVehicle[config.existingUrlKey as keyof typeof existingVehicle] as string | null

      const folderPath = `vehicles/${projectId}/${vehicleId}/${config.prefix}`

      if (config.newFile && config.newFile.size > 0) {
        // Delete all files in the folder
        const { data: files, error: listError } = await supabase.storage.from('vehicles').list(folderPath)
        if (files) {
          const pathsToDelete = files.map(f => `${folderPath}/${f.name}`)
          if (pathsToDelete.length > 0) {
            await supabase.storage.from('vehicles').remove(pathsToDelete)
          }
        }

        // Upload new file
        const fileName = `${Date.now()}_${config.newFile.name}`
        const path = `${folderPath}/${fileName}`
        const buffer = Buffer.from(await config.newFile.arrayBuffer())
        const { error: uploadError } = await supabase.storage.from('vehicles').upload(path, buffer)
        if (uploadError) return NextResponse.json({ error: `Failed to upload ${config.displayName}` }, { status: 500 })
        const { data } = supabase.storage.from('vehicles').getPublicUrl(path)
        updateData[config.existingUrlKey] = data.publicUrl
      } else if (!config.keepFlag && existingUrl) {
        await supabase.storage.from('vehicles').remove([extractPath(existingUrl)])
        updateData[config.existingUrlKey] = null
      }
    }

    const vehicle = await prisma.vehicle.update({ where: { id: vehicleId }, data: updateData })
    const result = await prisma.vehicle.findUnique({
      where: { id: vehicle.id },
      include: { project: { include: { client: { include: { location: true } } } } }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('PUT /api/vehicles error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = withResourcePermission('vehicles', 'delete', async (request: NextRequest, _user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleId = searchParams.get('vehicleId')

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicleId is required' },
        { status: 400 }
      )
    }

    // Get vehicle data before deletion to access project info and image URLs
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        project: true // Include project to get projectId
      }
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      )
    }

    const projectId = existingVehicle.project_id;

    // Delete vehicle from database first
    await prisma.vehicle.delete({
      where: { id: vehicleId }
    })

    // Delete all vehicle files from storage
    try {
      const vehicleFolderPath = `vehicles/${projectId}/${vehicleId}`;
      console.log(`Attempting to delete entire vehicle folder: ${vehicleFolderPath}`);

      // List all files in the vehicle folder and its subfolders
      const { data: allFiles, error: listError } = await supabase.storage
        .from('vehicles')
        .list(vehicleFolderPath, {
          limit: 1000,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.error('Error listing vehicle folder:', listError);
        throw new Error(`Failed to list vehicle folder: ${listError.message}`);
      }

      if (!allFiles || allFiles.length === 0) {
        console.log('No files found in vehicle folder');
        return NextResponse.json(
          {
            message: 'Vehicle deleted successfully (no files in storage)',
            imagesDeletionStatus: {
              total: 0,
              successful: 0,
              failed: 0
            }
          },
          { status: 200 }
        );
      }

      // Get all files recursively from subfolders
      const allFilePaths: string[] = [];

      for (const item of allFiles) {
        if (item.name && !item.id) {
          // This is a folder, list its contents
          const subfolderPath = `${vehicleFolderPath}/${item.name}`;
          const { data: subFiles, error: subListError } = await supabase.storage
            .from('vehicles')
            .list(subfolderPath, {
              limit: 1000,
              offset: 0
            });

          if (!subListError && subFiles) {
            subFiles.forEach(subFile => {
              if (subFile.name) {
                allFilePaths.push(`${subfolderPath}/${subFile.name}`);
              }
            });
          }
        } else if (item.name) {
          // This is a file directly in the vehicle folder
          allFilePaths.push(`${vehicleFolderPath}/${item.name}`);
        }
      }

      console.log(`Found ${allFilePaths.length} files to delete:`, allFilePaths);

      // Delete all files
      let successfulDeletions = 0;
      let failedDeletions = 0;
      const errors: Array<{ batch: string[]; error: string }> = [];

      if (allFilePaths.length > 0) {
        // Split into batches if there are many files (Supabase has limits)
        const batchSize = 100;
        for (let i = 0; i < allFilePaths.length; i += batchSize) {
          const batch = allFilePaths.slice(i, i + batchSize);

          const { data, error } = await supabase.storage
            .from('vehicles')
            .remove(batch);

          if (error) {
            console.error(`Batch deletion failed:`, error);
            failedDeletions += batch.length;
            errors.push({ batch, error: error.message });
          } else {
            console.log(`Successfully deleted batch of ${batch.length} files`);
            successfulDeletions += batch.length;
          }
        }
      }

      console.log(`Deletion summary: ${successfulDeletions} successful, ${failedDeletions} failed out of ${allFilePaths.length} total`);

      return NextResponse.json(
        {
          message: 'Vehicle deleted successfully',
          imagesDeletionStatus: {
            total: allFilePaths.length,
            successful: successfulDeletions,
            failed: failedDeletions,
            errors: failedDeletions > 0 ? errors : undefined
          }
        },
        { status: 200 }
      );

    } catch (storageError) {
      console.error('Storage deletion failed:', storageError);

      // Fallback: Try individual file deletion using URLs
      console.log('Falling back to individual file deletion...');

      const imageUrls = [
        existingVehicle.front_img_url,
        existingVehicle.back_img_url,
        existingVehicle.side1_img_url,
        existingVehicle.side2_img_url,
        existingVehicle.original_receipt_url,
        existingVehicle.car_registration_url,
        existingVehicle.pgpc_inspection_image, // Added the new field
      ].filter((url): url is string => Boolean(url));

      const deletionPromises = imageUrls.map(async (imageUrl) => {
        try {
          if (!imageUrl) {
            return { success: false, error: 'URL is null' };
          }

          const url = new URL(imageUrl);
          const pathParts = url.pathname.split('/').filter(part => part !== '');

          // For your URL structure: /storage/v1/object/public/vehicles/vehicles/projectId/vehicleId/side1/filename
          // We need to find the path after the second "vehicles"
          const vehiclesIndices: number[] = [];
          pathParts.forEach((part, index) => {
            if (part === 'vehicles') {
              vehiclesIndices.push(index);
            }
          });

          // Get the path starting after the second "vehicles" (index 1)
          if (vehiclesIndices.length >= 2 && vehiclesIndices[1] < pathParts.length - 1) {
            const filePath = pathParts.slice(vehiclesIndices[1] + 1).join('/');

            console.log(`Attempting to delete file: ${filePath}`);

            const { error } = await supabase.storage
              .from('vehicles')
              .remove([filePath]);

            if (error) {
              return { success: false, error: error.message, path: filePath };
            } else {
              return { success: true, error: '', path: filePath };
            }
          } else {
            return { success: false, error: 'Could not extract path', url: imageUrl };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
          return { success: false, error: errorMessage, url: imageUrl };
        }
      });

      const deletionResults = await Promise.allSettled(deletionPromises);

      let successfulDeletions = 0;
      let failedDeletions = 0;
      const fallbackErrors: Array<{ success?: boolean; error: string; path?: string; url?: string }> = [];

      deletionResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.success) {
          successfulDeletions++;
        } else {
          failedDeletions++;
          if (result.status === 'fulfilled') {
            fallbackErrors.push(result.value);
          } else {
            fallbackErrors.push({
              error: result.reason instanceof Error ? result.reason.message : String(result.reason),
              url: imageUrls[index]
            });
          }
        }
      });

      return NextResponse.json(
        {
          message: 'Vehicle deleted successfully (with fallback method)',
          imagesDeletionStatus: {
            total: imageUrls.length,
            successful: successfulDeletions,
            failed: failedDeletions,
            errors: failedDeletions > 0 ? fallbackErrors : undefined,
            method: 'fallback'
          }
        },
        { status: 200 }
      );
    }

  } catch (err) {
    console.error('DELETE /api/vehicles error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
})
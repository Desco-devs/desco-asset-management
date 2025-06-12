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

// Helper function to extract file path from Supabase URL
const extractFilePathFromUrl = (fileUrl: string): string | null => {
  try {
    const url = new URL(fileUrl);
    const pathParts = url.pathname.split('/').filter(part => part !== '');

    // Expected URL structure: /storage/v1/object/public/equipments/projectId/equipmentId/filename
    const publicIndex = pathParts.findIndex(part => part === 'public');
    const equipmentsIndex = pathParts.findIndex(part => part === 'equipments');

    if (equipmentsIndex !== -1 && equipmentsIndex < pathParts.length - 1) {
      // Return path after 'equipments': projectId/equipmentId/filename
      return pathParts.slice(equipmentsIndex + 1).join('/');
    }

    return null;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

// Helper function to delete file from Supabase
const deleteFileFromSupabase = async (fileUrl: string, fileType: string): Promise<boolean> => {
  try {
    const filePath = extractFilePathFromUrl(fileUrl);

    if (!filePath) {
      console.error(`Could not extract file path from URL: ${fileUrl}`);
      return false;
    }

    console.log(`Deleting ${fileType} from Supabase: ${filePath}`);

    const { error } = await supabase.storage
      .from('equipments')
      .remove([filePath]);

    if (error) {
      console.error(`Failed to delete ${fileType}:`, error);
      return false;
    } else {
      console.log(`Successfully deleted ${fileType}: ${filePath}`);
      return true;
    }
  } catch (error) {
    console.error(`Error deleting ${fileType}:`, error);
    return false;
  }
};

// Helper function to upload file to Supabase
const uploadFileToSupabase = async (
  file: File,
  projectId: string,
  equipmentId: string,
  filePrefix: string
): Promise<{ field: string; url: string }> => {
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const fileName = `${filePrefix}_${timestamp}.${fileExtension}`;
  const filePath = `${projectId}/${equipmentId}/${fileName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('equipments')
    .upload(filePath, buffer, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError || !uploadData) {
    throw new Error(`${filePrefix} upload failed: ${uploadError?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from('equipments')
    .getPublicUrl(uploadData.path);

  return {
    field: getFieldName(filePrefix),
    url: urlData.publicUrl
  };
};

// Helper function to get database field name from file prefix
const getFieldName = (filePrefix: string): string => {
  switch (filePrefix) {
    case 'image': return 'image_url';
    case 'receipt': return 'originalReceiptUrl';
    case 'registration': return 'equipmentRegistrationUrl';
    case 'thirdparty_inspection': return 'thirdpartyInspectionImage';
    case 'pgpc_inspection': return 'pgpcInspectionImage';
    default: throw new Error(`Unknown file prefix: ${filePrefix}`);
  }
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const type = formData.get('type') as string
    const insuranceExpirationDate = formData.get('insuranceExpirationDate') as string
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
    const thirdpartyInspectionFile = formData.get('thirdpartyInspection') as File | null
    const pgpcInspectionFile = formData.get('pgpcInspection') as File | null

    if (!brand || !model || !type || !insuranceExpirationDate || !owner || !projectId) {
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
      insuranceExpirationDate: new Date(insuranceExpirationDate),
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

    // Define file mappings
    const fileMappings = [
      { file: imageFile, prefix: 'image' },
      { file: originalReceiptFile, prefix: 'receipt' },
      { file: equipmentRegistrationFile, prefix: 'registration' },
      { file: thirdpartyInspectionFile, prefix: 'thirdparty_inspection' },
      { file: pgpcInspectionFile, prefix: 'pgpc_inspection' }
    ];

    // Process each file
    for (const mapping of fileMappings) {
      if (mapping.file && mapping.file.size > 0) {
        fileUploads.push(
          uploadFileToSupabase(mapping.file, projectId, equipment.uid, mapping.prefix)
        );
      }
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
    const insuranceExpirationDate = formData.get('insuranceExpirationDate') as string
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
    const thirdpartyInspectionFile = formData.get('thirdpartyInspection') as File | null
    const pgpcInspectionFile = formData.get('pgpcInspection') as File | null

    // Get keep existing file flags
    const keepExistingImage = formData.get('keepExistingImage') as string
    const keepExistingReceipt = formData.get('keepExistingReceipt') as string
    const keepExistingRegistration = formData.get('keepExistingRegistration') as string
    const keepExistingThirdpartyInspection = formData.get('keepExistingThirdpartyInspection') as string
    const keepExistingPgpcInspection = formData.get('keepExistingPgpcInspection') as string

    if (!equipmentId || !brand || !model || !type || !insuranceExpirationDate || !owner || !projectId) {
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
      insuranceExpirationDate: new Date(insuranceExpirationDate),
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

    // File handling configuration
    const fileConfigs = [
      {
        newFile: imageFile,
        keepFlag: keepExistingImage,
        existingUrl: existingEquipment.image_url,
        prefix: 'image',
        fieldName: 'image_url',
        displayName: 'image'
      },
      {
        newFile: originalReceiptFile,
        keepFlag: keepExistingReceipt,
        existingUrl: existingEquipment.originalReceiptUrl,
        prefix: 'receipt',
        fieldName: 'originalReceiptUrl',
        displayName: 'original receipt'
      },
      {
        newFile: equipmentRegistrationFile,
        keepFlag: keepExistingRegistration,
        existingUrl: existingEquipment.equipmentRegistrationUrl,
        prefix: 'registration',
        fieldName: 'equipmentRegistrationUrl',
        displayName: 'equipment registration'
      },
      {
        newFile: thirdpartyInspectionFile,
        keepFlag: keepExistingThirdpartyInspection,
        existingUrl: existingEquipment.thirdpartyInspectionImage,
        prefix: 'thirdparty_inspection',
        fieldName: 'thirdpartyInspectionImage',
        displayName: 'third-party inspection image'
      },
      {
        newFile: pgpcInspectionFile,
        keepFlag: keepExistingPgpcInspection,
        existingUrl: existingEquipment.pgpcInspectionImage,
        prefix: 'pgpc_inspection',
        fieldName: 'pgpcInspectionImage',
        displayName: 'PGPC inspection image'
      }
    ];

    const fileUploads = []

    // Process each file configuration
    for (const config of fileConfigs) {
      if (config.newFile && config.newFile.size > 0) {
        // User is uploading a new file - delete old one if it exists
        if (config.existingUrl) {
          console.log(`Deleting existing ${config.displayName} before uploading new one`);
          await deleteFileFromSupabase(config.existingUrl, config.displayName);
        }

        // Upload new file
        fileUploads.push(
          uploadFileToSupabase(config.newFile, projectId, equipmentId, config.prefix)
        );
      } else if (config.keepFlag !== 'true') {
        // User chose to remove the file - delete from storage and set to null
        if (config.existingUrl) {
          console.log(`Removing ${config.displayName} as requested by user`);
          await deleteFileFromSupabase(config.existingUrl, config.displayName);
        }
        updateData[config.fieldName] = null;
      }
      // If keepFlag === 'true' and no new file, do nothing (keep existing)
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

    const fileUrls = [
      existingEquipment.image_url,
      existingEquipment.originalReceiptUrl,
      existingEquipment.equipmentRegistrationUrl,
      existingEquipment.thirdpartyInspectionImage,
      existingEquipment.pgpcInspectionImage
    ].filter(url => url !== null);

    if (fileUrls.length > 0) {
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
          let successCount = 0;
          for (const fileUrl of fileUrls) {
            const success = await deleteFileFromSupabase(fileUrl!, 'equipment file');
            if (success) successCount++;
          }

          fileDeletionResult.successful = successCount === fileUrls.length;
          if (!fileDeletionResult.successful) {
            fileDeletionResult.error = `Only ${successCount}/${fileUrls.length} files deleted successfully`;
          }
        } catch (fallbackError) {
          console.error('Fallback deletion error:', fallbackError);
          fileDeletionResult.error = `Primary and fallback deletion failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`;
        }
      }
    } else {
      fileDeletionResult.successful = true;
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
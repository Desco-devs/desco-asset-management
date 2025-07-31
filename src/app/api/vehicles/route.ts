import { NextRequest, NextResponse } from 'next/server'
import { status as VehicleStatus, Prisma } from '@prisma/client'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'
const supabase = createServiceRoleClient()

// Helper to extract storage path from a Supabase URL
const extractFilePathFromUrl = (fileUrl: string): string | null => {
  try {
    const url = new URL(fileUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "vehicles");
    if (idx !== -1 && idx < parts.length - 1) {
      return parts.slice(idx + 1).join("/");
    }
    return null;
  } catch (err) {
    return null;
  }
};

// Delete a file from Supabase storage with improved error handling
const deleteFileFromSupabase = async (
  fileUrl: string,
  tag: string
): Promise<void> => {
  if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.trim() === '') {
    throw new Error(`Invalid file URL provided for ${tag}`);
  }
  
  const path = extractFilePathFromUrl(fileUrl);
  
  if (!path) { 
    throw new Error(`Cannot parse storage path from URL for ${tag}: ${fileUrl}`);
  }
  
  if (path.endsWith('/') || !path.includes('.')) {
    throw new Error(`Invalid file path detected for ${tag} - appears to be a directory: ${path}`);
  }
  
  const { error } = await supabase.storage.from("vehicles").remove([path]);
  
  if (error) {
    throw new Error(`Failed to delete file from storage for ${tag}: ${error.message} (Path: ${path})`);
  }
};

// Ensure directory exists in Supabase storage by creating a placeholder file
const ensureDirectoryExists = async (directoryPath: string): Promise<void> => {
  try {
    const { data: files, error } = await supabase.storage
      .from("vehicles")
      .list(directoryPath);
    
    if (error && error.message.includes('not found')) {
      const placeholderPath = `${directoryPath}/.placeholder`;
      const { error: uploadError } = await supabase.storage
        .from("vehicles")
        .upload(placeholderPath, new Blob([''], { type: 'text/plain' }), {
          cacheControl: '3600',
          upsert: false
        });
      
      if (uploadError && !uploadError.message.includes('already exists')) {
        // Ignore upload errors - directory creation is best effort
      }
    }
  } catch (error) {
    // Ignore errors - directory creation is best effort
  }
};

// Upload a file to Supabase storage with vehicle-{vehicleId} structure
const uploadFileToSupabase = async (
  file: File,
  projectId: string,
  vehicleId: string,
  prefix: string,
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  plateNumber?: string
): Promise<{ field: string; url: string }> => {
  const timestamp = Date.now();
  const ext = file.name.split(".").pop();
  
  // Generate unique filename with timestamp to prevent browser caching issues
  const getFilename = (prefix: string) => {
    switch (prefix) {
      case 'front':
        return `front_view_${timestamp}.${ext}`;
      case 'back':
        return `back_view_${timestamp}.${ext}`;
      case 'side1':
        return `side1_view_${timestamp}.${ext}`;
      case 'side2':
        return `side2_view_${timestamp}.${ext}`;
      case 'receipt':
        return `original_receipt_${timestamp}.${ext}`;
      case 'registration':
        return `car_registration_${timestamp}.${ext}`;
      case 'pgpc_inspection':
        return `pgpc_inspection_${timestamp}.${ext}`;
      default:
        return `${prefix}_${timestamp}.${ext}`;
    }
  };

  const filename = getFilename(prefix);

  // NEW STRUCTURE: vehicle-{vehicleId}/vehicle-images/ or vehicle-documents/
  const getSubfolder = (prefix: string) => {
    switch (prefix) {
      case 'front':
      case 'back':
      case 'side1':
      case 'side2':
        return 'vehicle-images';
      case 'receipt':
      case 'registration':
      case 'pgpc_inspection':
        return 'vehicle-documents';
      default:
        return 'vehicle-files';
    }
  };

  const subfolder = getSubfolder(prefix);
  const vehicleDir = `vehicle-${vehicleId}/${subfolder}`;
  
  // Ensure directory exists before uploading
  await ensureDirectoryExists(vehicleDir);
  
  const filepath = `${vehicleDir}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("vehicles")
    .upload(filepath, buffer, { cacheControl: "3600", upsert: true });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload ${prefix} failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("vehicles")
    .getPublicUrl(uploadData.path);

  return { field: getFieldName(prefix), url: urlData.publicUrl };
};

// Upload vehicle part with unique identifier for tracking
const uploadVehiclePart = async (
  file: File,
  projectId: string,
  vehicleId: string,
  fileId: string, // Unique identifier for tracking/deletion
  folderPath: string = "root",
  projectName?: string,
  clientName?: string,
  brand?: string,
  model?: string,
  plateNumber?: string
): Promise<{ id: string; url: string; name: string; type: string }> => {
  const ext = file.name.split(".").pop();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._\-]/g, "_");
  const filename = `${fileId}_${sanitizedFileName}`;

  // NEW STRUCTURE: vehicle-{vehicleId}/vehicle-parts/{folderPath}/
  const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
  const sanitizedFolderPath = sanitizeForPath(folderPath);
  const partsDir = `vehicle-${vehicleId}/vehicle-parts/${sanitizedFolderPath}`;
  
  // Ensure directory exists before uploading
  await ensureDirectoryExists(partsDir);
  
  const filepath = `${partsDir}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from("vehicles")
    .upload(filepath, buffer, { cacheControl: "3600", upsert: true });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload part file failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase.storage
    .from("vehicles")
    .getPublicUrl(uploadData.path);

  return {
    id: fileId,
    url: urlData.publicUrl,
    name: file.name,
    type: file.type.startsWith('image/') ? 'image' : 'document'
  };
};

// Delete individual part file by ID
const deleteVehiclePartFile = async (vehicleId: string, fileId: string, folderPath: string = "root"): Promise<void> => {
  try {
    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const sanitizedFolderPath = sanitizeForPath(folderPath);
    const partsDir = `vehicle-${vehicleId}/vehicle-parts/${sanitizedFolderPath}`;
    
    // List files in the folder to find the one with matching fileId
    const { data: files, error } = await supabase.storage
      .from("vehicles")
      .list(partsDir);
    
    if (error || !files) {
      console.warn(`Could not list files in ${partsDir}:`, error);
      return;
    }
    
    // Find file that starts with the fileId
    const targetFile = files.find(file => file.name.startsWith(`${fileId}_`));
    
    if (targetFile) {
      const filePath = `${partsDir}/${targetFile.name}`;
      const { error: deleteError } = await supabase.storage
        .from("vehicles")
        .remove([filePath]);
      
      if (deleteError) {
        console.warn(`Failed to delete vehicle part file ${filePath}:`, deleteError);
      }
    }
  } catch (error) {
    console.warn(`Error deleting vehicle part file ${fileId}:`, error);
  }
};

// Delete entire parts folder and all its contents
const deleteVehiclePartFolder = async (vehicleId: string, folderPath: string): Promise<void> => {
  try {
    const sanitizeForPath = (str: string) => str.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const sanitizedFolderPath = sanitizeForPath(folderPath);
    const partsDir = `vehicle-${vehicleId}/vehicle-parts/${sanitizedFolderPath}`;
    
    // List all files in the folder
    const { data: files, error } = await supabase.storage
      .from("vehicles")
      .list(partsDir);
    
    if (error || !files || files.length === 0) {
      return; // Nothing to delete
    }
    
    // Delete all files in the folder
    const filePaths = files
      .filter(file => file.name !== '.placeholder')
      .map(file => `${partsDir}/${file.name}`);
    
    if (filePaths.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from("vehicles")
        .remove(filePaths);
      
      if (deleteError) {
        console.warn(`Failed to delete vehicle part folder ${partsDir}:`, deleteError);
      }
    }
  } catch (error) {
    console.warn(`Error deleting vehicle part folder ${folderPath}:`, error);
  }
};

// Map file-prefix to Prisma field name
const getFieldName = (prefix: string): string => {
  switch (prefix) {
    case "front":
      return "front_img_url";
    case "back":
      return "back_img_url";
    case "side1":
      return "side1_img_url";
    case "side2":
      return "side2_img_url";
    case "receipt":
      return "original_receipt_url";
    case "registration":
      return "car_registration_url";
    case "pgpc_inspection":
      return "pgpc_inspection_image";
    default:
      throw new Error(`Unknown prefix: ${prefix}`);
  }
};

// GET: Retrieve vehicles with proper role-based access control
export const GET = withResourcePermission('vehicles', 'view', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Build query filters
    const where: Prisma.vehicleWhereInput = {}
    if (projectId) {
      where.project_id = projectId
    }

    // Apply pagination if provided
    const queryOptions: Prisma.vehicleFindManyArgs = {
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
        },
        user: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
        maintenance_reports: {
          orderBy: {
            date_reported: "desc",
          },
          take: 5, // Only include recent reports
        },
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
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    )
  }
})

// POST: Create a new vehicle with organized image uploads
export const POST = withResourcePermission('vehicles', 'create', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const formData = await request.formData()
    const brand = formData.get('brand') as string
    const model = formData.get('model') as string
    const type = formData.get('type') as string
    const plateNumber = formData.get('plateNumber') as string
    const inspectionDate = formData.get('inspectionDate') as string
    const before = formData.get('before') as string
    const expiryDate = formData.get('expiryDate') as string
    const registrationExpiry = formData.get('registrationExpiry') as string | null
    const status = formData.get('status') as keyof typeof VehicleStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner = formData.get('owner') as string
    const projectId = formData.get('projectId') as string

    // Validate required fields
    if (!brand || !model || !type || !plateNumber || !owner || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Fetch project and client info for human-readable paths
    const projectInfo = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        client: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!projectInfo) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    const projectName = projectInfo.name;
    const clientName = projectInfo.client.name;

    // Create vehicle record first without files
    const createData: any = {
      brand,
      model,
      type,
      status,
      remarks,
      owner,
      plate_number: plateNumber,
      project: { connect: { id: projectId } },
      vehicle_parts: [], // Initialize empty array
      user: { connect: { id: user.id } },
      // only include `before` if provided
      ...(before ? { before: parseInt(before, 10) } : {}),
      // only include registration expiry if provided
      ...(registrationExpiry ? { registration_expiry: new Date(registrationExpiry) } : {}),
    };

    if (inspectionDate) {
      createData.inspection_date = new Date(inspectionDate);
    }
    if (expiryDate) {
      createData.expiry_date = new Date(expiryDate);
    }

    const vehicle = await prisma.vehicle.create({ data: createData });

    // Handle file uploads with organized structure
    const fileJobs = [
      { file: formData.get("frontImg") as File | null, prefix: "front" },
      { file: formData.get("backImg") as File | null, prefix: "back" },
      { file: formData.get("side1Img") as File | null, prefix: "side1" },
      { file: formData.get("side2Img") as File | null, prefix: "side2" },
      { file: formData.get("originalReceipt") as File | null, prefix: "receipt" },
      { file: formData.get("carRegistration") as File | null, prefix: "registration" },
      { file: formData.get("pgpcInspection") as File | null, prefix: "pgpc_inspection" },
    ]
      .filter((f) => f.file && f.file.size > 0)
      .map((f) =>
        uploadFileToSupabase(
          f.file!,
          projectId,
          vehicle.id,
          f.prefix,
          projectName,
          clientName,
          brand,
          model,
          plateNumber
        )
      );

    // Handle vehicle parts as simple string array (aligned with equipment pattern)
    const vehiclePartsData = formData.get('vehicleParts') as string;
    let vehicleParts: string[] = [];
    
    if (vehiclePartsData) {
      try {
        const partsArray = JSON.parse(vehiclePartsData);
        if (Array.isArray(partsArray)) {
          // Filter and validate parts as strings
          vehicleParts = partsArray
            .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
            .map(part => part.trim())
            .slice(0, 50); // Reasonable limit
        }
      } catch (error) {
        // If parsing fails, try to handle as comma-separated string
        vehicleParts = vehiclePartsData
          .split(',')
          .map(part => part.trim())
          .filter(part => part.length > 0)
          .slice(0, 50);
      }
    }

    const updateData: Record<string, unknown> = {};

    if (fileJobs.length) {
      try {
        const uploads = await Promise.all(fileJobs);
        uploads.forEach((u) => {
          updateData[u.field] = u.url;
        });
      } catch (e) {
        await prisma.vehicle.delete({ where: { id: vehicle.id } });
        return NextResponse.json(
          { error: "File upload failed" },
          { status: 500 }
        );
      }
    }

    // Update vehicle parts if provided
    if (vehicleParts.length > 0) {
      updateData.vehicle_parts = vehicleParts;
    }

    // Update if we have any files or parts
    if (Object.keys(updateData).length > 0) {
      await prisma.vehicle.update({
        where: { id: vehicle.id },
        data: updateData,
      });
    }

    // Handle maintenance report creation if provided
    const maintenanceReportData = formData.get("maintenanceReport") as string;
    if (maintenanceReportData) {
      try {
        const maintenanceData = JSON.parse(maintenanceReportData);
        
        // Get project info for location_id
        const projectInfo = await prisma.project.findUnique({
          where: { id: projectId },
          include: { client: { include: { location: true } } },
        });
        
        if (projectInfo) {
          // Validate required fields for maintenance report
          if (!maintenanceData.issueDescription || maintenanceData.issueDescription.trim() === '') {
            // Skip maintenance report creation if issue description is empty
          } else {
          
          // FIRST: Create the maintenance report to get the ID
          const maintenanceReport = await prisma.maintenance_vehicle_report.create({
            data: {
              vehicle_id: vehicle.id,
              location_id: projectInfo.client.location.id,
              issue_description: maintenanceData.issueDescription || '',
              remarks: maintenanceData.remarks || null,
              inspection_details: maintenanceData.inspectionDetails || null,
              action_taken: maintenanceData.actionTaken || null,
              parts_replaced: maintenanceData.partsReplaced || [],
              priority: maintenanceData.priority || 'MEDIUM',
              status: maintenanceData.status || 'REPORTED',
              downtime_hours: maintenanceData.downtimeHours || null,
              date_reported: maintenanceData.dateReported ? new Date(maintenanceData.dateReported) : new Date(),
              date_repaired: maintenanceData.dateRepaired ? new Date(maintenanceData.dateRepaired) : null,
              reported_by: user.id,
              repaired_by: maintenanceData.status === 'COMPLETED' && maintenanceData.repairedBy ? maintenanceData.repairedBy : null,
              attachment_urls: [], // Will be updated after file uploads
            },
          });
          
          // THEN: Upload part images and collect attachment URLs
          const attachmentUrls: string[] = [];
          
          // Handle part images
          for (let i = 0; formData.get(`partImage_${i}`); i++) {
            const partImage = formData.get(`partImage_${i}`) as File;
            const partName = formData.get(`partImageName_${i}`) as string;
            
            if (partImage && partImage.size > 0) {
              try {
                // Ensure the parts directory exists
                const partsDir = `vehicle-${vehicle.id}/maintenance-reports/${maintenanceReport.id}/parts`;
                await ensureDirectoryExists(partsDir);
                
                // Use dedicated maintenance parts upload with correct report ID
                const timestamp = Date.now();
                const ext = partImage.name.split(".").pop();
                const sanitizedPartName = (partName || `part_${i + 1}`).replace(/[^a-zA-Z0-9_\-]/g, '_');
                const filename = `${sanitizedPartName}_${timestamp}.${ext}`;
                const filepath = `${partsDir}/${filename}`;
                const buffer = Buffer.from(await partImage.arrayBuffer());

                const { data: uploadData, error: uploadErr } = await supabase.storage
                  .from("vehicles")
                  .upload(filepath, buffer, { cacheControl: "3600", upsert: false });

                if (uploadErr || !uploadData) {
                  throw new Error(`Upload maintenance part image ${i + 1} failed: ${uploadErr?.message}`);
                }

                const { data: urlData } = supabase.storage
                  .from("vehicles")
                  .getPublicUrl(uploadData.path);

                const url = urlData.publicUrl;
                attachmentUrls.push(url);
              } catch (error) {
                // Continue if individual part image upload fails
              }
            }
          }
          
          // Handle maintenance attachments
          for (let i = 0; formData.get(`maintenanceAttachment_${i}`); i++) {
            const attachment = formData.get(`maintenanceAttachment_${i}`) as File;
            
            if (attachment && attachment.size > 0) {
              try {
                // Ensure the attachments directory exists
                const attachmentsDir = `vehicle-${vehicle.id}/maintenance-reports/${maintenanceReport.id}/attachments`;
                await ensureDirectoryExists(attachmentsDir);
                
                // Use dedicated maintenance attachment upload with correct report ID
                const timestamp = Date.now();
                const ext = attachment.name.split(".").pop();
                const filename = `maintenance_attachment_${i + 1}_${timestamp}.${ext}`;
                const filepath = `${attachmentsDir}/${filename}`;
                const buffer = Buffer.from(await attachment.arrayBuffer());

                const { data: uploadData, error: uploadErr } = await supabase.storage
                  .from("vehicles")
                  .upload(filepath, buffer, { cacheControl: "3600", upsert: false });

                if (uploadErr || !uploadData) {
                  throw new Error(`Upload maintenance attachment ${i + 1} failed: ${uploadErr?.message}`);
                }

                const { data: urlData } = supabase.storage
                  .from("vehicles")
                  .getPublicUrl(uploadData.path);

                const url = urlData.publicUrl;
                attachmentUrls.push(url);
              } catch (error) {
                // Continue if individual attachment upload fails
              }
            }
          }
          
          // Update maintenance report with attachment URLs if any files were uploaded
          if (attachmentUrls.length > 0) {
            await prisma.maintenance_vehicle_report.update({
              where: { id: maintenanceReport.id },
              data: { attachment_urls: attachmentUrls },
            });
          }
          }
        }
      } catch (error) {
        // Failed to create maintenance report, but vehicle was created successfully
        // Don't fail the whole request
      }
    }

    const result = await prisma.vehicle.findUnique({
      where: { id: vehicle.id },
      include: {
        project: {
          include: { client: { include: { location: true } } },
        },
        maintenance_reports: {
          orderBy: { date_reported: 'desc' },
          take: 5,
        },
      },
    });
    
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    console.error('POST /api/vehicles error:', err)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
})


export const PUT = withResourcePermission('vehicles', 'update', async (request: NextRequest, user: AuthenticatedUser) => {
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
    const registrationExpiry = formData.get('registrationExpiry') as string | null
    const status = formData.get('status') as keyof typeof VehicleStatus
    const remarks = (formData.get('remarks') as string) || null
    const owner = formData.get('owner') as string
    const projectId = formData.get('projectId') as string

    if (!vehicleId || !brand || !model || !type || !plateNumber || !owner || !projectId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const existing = await prisma.vehicle.findUnique({ where: { id: vehicleId } })
    if (!existing) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // 🚀 PERFORMANCE OPTIMIZATION: Build update data only with changed fields
    const updateData: Record<string, unknown> = {};

    // Required fields - always sent by frontend, but only update if different from existing
    if (brand !== null && brand !== existing.brand) updateData.brand = brand;
    if (model !== null && model !== existing.model) updateData.model = model;
    if (type !== null && type !== existing.type) updateData.type = type;
    if (owner !== null && owner !== existing.owner) updateData.owner = owner;
    if (projectId !== null && projectId !== existing.project_id) updateData.project_id = projectId;

    // Optional fields - only update if provided and different
    if (status !== null && status !== existing.status) updateData.status = status;
    if (remarks !== null && remarks !== existing.remarks) updateData.remarks = remarks;
    if (plateNumber !== null && plateNumber !== existing.plate_number) updateData.plate_number = plateNumber;
    if (before !== null) {
      const newBefore = before !== "" ? parseInt(before, 10) : null;
      if (newBefore !== existing.before) updateData.before = newBefore;
    }

    // Handle dates only if provided and different
    if (inspectionDate !== null) {
      const newInspectionDate = inspectionDate ? new Date(inspectionDate) : null;
      const existingInspectionDate = existing.inspection_date;
      const datesAreDifferent = newInspectionDate?.getTime() !== existingInspectionDate?.getTime();
      if (datesAreDifferent) {
        updateData.inspection_date = newInspectionDate;
      }
    }
    if (expiryDate !== null) {
      const newExpiryDate = expiryDate ? new Date(expiryDate) : null;
      const existingExpiryDate = existing.expiry_date;
      const datesAreDifferent = newExpiryDate?.getTime() !== existingExpiryDate?.getTime();
      if (datesAreDifferent) {
        updateData.expiry_date = newExpiryDate;
      }
    }
    if (registrationExpiry !== null) {
      const newRegistrationExpiry = registrationExpiry ? new Date(registrationExpiry) : null;
      const existingRegistrationExpiry = existing.registration_expiry;
      const datesAreDifferent = newRegistrationExpiry?.getTime() !== existingRegistrationExpiry?.getTime();
      if (datesAreDifferent) {
        updateData.registration_expiry = newRegistrationExpiry;
      }
    }

    // SIMPLE: Handle removed vehicle images (7 fixed images only)
    const removedImagesData = formData.get('removedImages') as string;
    const removedImages = removedImagesData ? JSON.parse(removedImagesData) : [];
    
    console.log('🔍 DEBUG: Backend received removedImages:', removedImages);
    
    // IMPROVED: Delete removed vehicle images with better error handling and validation
    const vehicleImageFields = ['front_img_url', 'back_img_url', 'side1_img_url', 'side2_img_url'];
    const vehicleDocumentFields = ['original_receipt_url', 'car_registration_url', 'pgpc_inspection_image'];
    const processedUrls = new Set<string>(); // Prevent duplicate deletions
    
    for (const fieldName of removedImages) {
      if ([...vehicleImageFields, ...vehicleDocumentFields].includes(fieldName)) {
        const existingUrl = existing[fieldName as keyof typeof existing] as string;
        
        // Additional validation to ensure we have a valid URL and it hasn't been processed
        if (existingUrl && existingUrl.trim() && !processedUrls.has(existingUrl)) {
          console.log(`🗑️ DELETING vehicle file ${fieldName}:`, existingUrl);
          
          try {
            await deleteFileFromSupabase(existingUrl, fieldName);
            processedUrls.add(existingUrl); // Mark as processed
            updateData[fieldName] = null;
            console.log(`✅ Successfully deleted vehicle file ${fieldName}`);
          } catch (deleteError) {
            console.error(`❌ Failed to delete ${fieldName}:`, deleteError);
            // Continue processing other files even if one fails
            // Still set field to null to reflect user intent
            updateData[fieldName] = null;
          }
        } else if (!existingUrl) {
          // Field is already empty, just ensure it's set to null
          console.log(`ℹ️ Field ${fieldName} is already empty, setting to null`);
          updateData[fieldName] = null;
        } else if (processedUrls.has(existingUrl)) {
          console.log(`⚠️ URL already processed for deletion: ${existingUrl}`);
          updateData[fieldName] = null;
        }
      } else {
        console.warn(`⚠️ Invalid field name in removedImages: ${fieldName}`);
      }
    }

    // Handle new vehicle file uploads (images and documents)
    const fileJobs: Promise<{ field: string; url: string }>[] = [];
    
    const vehicleFileConfigs = [
      { file: formData.get("frontImg") as File | null, prefix: "front" },
      { file: formData.get("backImg") as File | null, prefix: "back" },
      { file: formData.get("side1Img") as File | null, prefix: "side1" },
      { file: formData.get("side2Img") as File | null, prefix: "side2" },
      { file: formData.get("originalReceipt") as File | null, prefix: "receipt" },
      { file: formData.get("carRegistration") as File | null, prefix: "registration" },
      { file: formData.get("pgpcInspection") as File | null, prefix: "pgpc_inspection" },
    ];

    for (const cfg of vehicleFileConfigs) {
      if (cfg.file && cfg.file.size > 0) {
        console.log(`📤 UPLOADING new ${cfg.prefix} file: ${cfg.file.name} (${cfg.file.size} bytes)`);
        fileJobs.push(
          uploadFileToSupabase(cfg.file, projectId, vehicleId, cfg.prefix)
        );
      }
    }

    // Execute file uploads
    if (fileJobs.length) {
      try {
        const ups = await Promise.all(fileJobs);
        console.log('🎯 UPLOAD RESULTS:', ups.map(u => ({ field: u.field, url: u.url })));
        ups.forEach((u) => {
          updateData[u.field] = u.url;
          console.log(`✅ Setting ${u.field} = ${u.url}`);
        });
      } catch (e) {
        console.error('❌ FILE UPLOAD FAILED:', e);
        return NextResponse.json(
          { error: "File upload failed" },
          { status: 500 }
        );
      }
    }

    // Handle parts deletion requests first
    const deletePartsData = formData.get('deleteParts') as string;
    if (deletePartsData) {
      try {
        const deleteRequests = JSON.parse(deletePartsData);
        
        // Handle individual file deletions
        if (deleteRequests.files && Array.isArray(deleteRequests.files)) {
          for (const fileDelete of deleteRequests.files) {
            // If file has URL, it's an existing file - delete by URL
            if (fileDelete.fileUrl) {
              try {
                await deleteFileFromSupabase(fileDelete.fileUrl, `part file ${fileDelete.fileName}`);
              } catch (error) {
                console.warn(`Failed to delete part file by URL: ${fileDelete.fileName}`, error);
              }
            } else {
              // No URL means it's a new file - delete by ID
              await deleteVehiclePartFile(vehicleId, fileDelete.fileId, fileDelete.folderPath || 'root');
            }
          }
        }
        
        // Handle folder cascade deletions
        if (deleteRequests.folders && Array.isArray(deleteRequests.folders)) {
          for (const folderDelete of deleteRequests.folders) {
            await deleteVehiclePartFolder(vehicleId, folderDelete.folderPath);
          }
        }
      } catch (error) {
        // Continue processing even if some deletions fail
        console.warn('Warning: Some parts deletion operations failed:', error);
      }
    }

    // Handle vehicle parts updates - simplified to match UI changes
    const vehiclePartsData = formData.get('vehicleParts') as string;
    
    if (vehiclePartsData) {
      try {
        const partsArray = JSON.parse(vehiclePartsData);
        if (Array.isArray(partsArray)) {
          // Filter and validate parts as strings
          const validParts = partsArray
            .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
            .map(part => part.trim())
            .slice(0, 50); // Reasonable limit
          
          if (validParts.length >= 0) { // Allow empty arrays to clear parts
            updateData.vehicle_parts = validParts;
          }
        }
      } catch (error) {
        console.warn('Failed to parse vehicle parts data:', error);
      }
    }

    // Only update if we have changes to make
    let updated = existing;
    if (Object.keys(updateData).length > 0) {
      console.log('📝 FINAL UPDATE DATA BEING SAVED:', updateData);
      updated = await prisma.vehicle.update({
        where: { id: vehicleId },
        data: updateData,
      });
      console.log('💾 DATABASE UPDATE SUCCESSFUL');
    }

    const result = await prisma.vehicle.findUnique({
      where: { id: updated.id },
      include: {
        project: {
          include: { client: { include: { location: true } } },
        },
      },
    });

    console.log('🚀 FINAL API RESPONSE FILE URLS:', {
      front_img_url: result?.front_img_url,
      back_img_url: result?.back_img_url,
      side1_img_url: result?.side1_img_url,
      side2_img_url: result?.side2_img_url,
      original_receipt_url: result?.original_receipt_url,
      car_registration_url: result?.car_registration_url,
      pgpc_inspection_image: result?.pgpc_inspection_image
    });

    return NextResponse.json(result)
  } catch (err) {
    console.error('PUT /api/vehicles error:', err)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    )
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

    // Clean up storage using the NEW structure: vehicle-{vehicleId}/
    const vehicleFolder = `vehicle-${vehicleId}`;
    
    try {
      await deleteDirectoryRecursively(vehicleFolder);
    } catch (storageError) {
      // Don't fail the request if storage cleanup fails - the vehicle record is already deleted
    }

    return NextResponse.json({ 
      message: "Vehicle deleted successfully",
      cleanedUp: {
        vehicleRecord: true,
        maintenanceReports: "cleaned up with storage folder",
        storageFolder: vehicleFolder
      }
    });
  } catch (err) {
    console.error('DELETE /api/vehicles error:', err);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

// Helper function to recursively delete all files and folders in a directory
const deleteDirectoryRecursively = async (directoryPath: string): Promise<void> => {
  try {
    // List all items in the directory
    const { data: items, error: listError } = await supabase.storage
      .from("vehicles")
      .list(directoryPath);

    if (listError) {
      // If directory doesn't exist, that's fine - nothing to delete
      if (listError.message.includes('not found')) {
        return;
      }
      throw listError;
    }

    if (!items || items.length === 0) {
      return;
    }

    // Separate files and folders
    const files = items.filter(item => !item.metadata?.isDirectory && item.name !== '.emptyFolderPlaceholder');
    const folders = items.filter(item => item.metadata?.isDirectory || (item.name && item.name.indexOf('.') === -1));

    // Delete all files in current directory
    if (files.length > 0) {
      const filePaths = files.map(file => `${directoryPath}/${file.name}`);
      const { error: deleteFilesError } = await supabase.storage
        .from("vehicles")
        .remove(filePaths);
      
      if (deleteFilesError) {
        // Ignore individual file deletion errors - some files may already be gone
      }
    }

    // Recursively delete subdirectories
    for (const folder of folders) {
      await deleteDirectoryRecursively(`${directoryPath}/${folder.name}`);
    }

    // Try to remove any remaining placeholder files
    try {
      await supabase.storage
        .from("vehicles")
        .remove([`${directoryPath}/.placeholder`]);
    } catch (error) {
      // Ignore placeholder removal errors
    }

  } catch (error) {
    // Directory deletion errors are handled gracefully
  }
};


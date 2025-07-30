import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';
import { 
  updateEquipmentMaintenanceReportSchema,
  sanitizePartsArray,
  sanitizeAttachmentUrls
} from '@/lib/validations/maintenance-reports';

// GET - Fetch specific equipment maintenance report
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const report = await prisma.maintenance_equipment_report.findUnique({
      where: { id },
      include: {
        equipment: {
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
        },
        location: true,
        reported_user: {
          select: {
            id: true,
            username: true,
            full_name: true,
          }
        },
        repaired_user: {
          select: {
            id: true,
            username: true,
            full_name: true,
          }
        }
      }
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Equipment maintenance report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch equipment maintenance report' },
      { status: 500 }
    );
  }
}

// PUT - Update equipment maintenance report
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Check if this is FormData (file uploads) or JSON
    const contentType = request.headers.get('content-type') || '';
    const isFormData = contentType.includes('multipart/form-data');
    
    let body: any = {};
    let filesToDelete: string[] = [];
    let newAttachmentFiles: File[] = [];
    
    if (isFormData) {
      const formData = await request.formData();
      
      // Extract form fields
      const formFields = [
        'equipment_id', 'location_id', 'issue_description', 'remarks',
        'inspection_details', 'action_taken', 'priority', 'status',
        'downtime_hours', 'date_repaired', 'reported_by', 'repaired_by'
      ];
      
      formFields.forEach(field => {
        const value = formData.get(field);
        if (value !== null) {
          body[field] = value;
        }
      });
      
      // Handle parts_replaced array
      const partsReplacedData = formData.get('parts_replaced');
      if (partsReplacedData) {
        try {
          body.parts_replaced = JSON.parse(partsReplacedData as string);
        } catch {
          body.parts_replaced = [];
        }
      }
      
      // Handle attachment_urls array
      const attachmentUrlsData = formData.get('attachment_urls');
      if (attachmentUrlsData) {
        try {
          body.attachment_urls = JSON.parse(attachmentUrlsData as string);
        } catch {
          body.attachment_urls = [];
        }
      }
      
      // Handle file deletions
      const filesToDeleteData = formData.get('filesToDelete');
      if (filesToDeleteData) {
        try {
          filesToDelete = JSON.parse(filesToDeleteData as string);
        } catch {
          filesToDelete = [];
        }
      }
      
      // Extract new attachment files
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('attachment_') && value instanceof File && value.size > 0) {
          newAttachmentFiles.push(value);
        }
      }
    } else {
      body = await request.json();
    }
    
    const {
      equipment_id,
      location_id,
      issue_description,
      remarks,
      inspection_details,
      action_taken,
      parts_replaced,
      priority,
      status,
      downtime_hours,
      date_repaired,
      attachment_urls = [],
      reported_by,
      repaired_by,
    } = body;

    // Check if report exists
    const existingReport = await prisma.maintenance_equipment_report.findUnique({
      where: { id },
      include: {
        equipment: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Equipment maintenance report not found' },
        { status: 404 }
      );
    }

    // Handle file deletions first
    if (filesToDelete.length > 0) {
      const supabase = createClient();
      
      for (const fileUrl of filesToDelete) {
        try {
          // Extract the file path from the URL
          const url = new URL(fileUrl);
          const pathParts = url.pathname.split('/').filter(Boolean);
          const equipmentsIndex = pathParts.findIndex(part => part === 'equipments');
          
          if (equipmentsIndex !== -1 && equipmentsIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(equipmentsIndex + 1).join('/');
            const { error } = await supabase.storage
              .from('equipments')
              .remove([filePath]);
            
            if (error) {
              console.warn(`Failed to delete file ${fileUrl}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to parse URL for deletion ${fileUrl}:`, error);
        }
      }
    }

    // Handle new file uploads
    let newAttachmentUrls: string[] = [];
    if (newAttachmentFiles.length > 0) {
      const supabase = createClient();
      const equipmentId = existingReport.equipment.id;
      
      for (let i = 0; i < newAttachmentFiles.length; i++) {
        const file = newAttachmentFiles[i];
        try {
          const timestamp = Date.now();
          const fileExt = file.name.split('.').pop();
          const filename = `attachment_${i + 1}_${timestamp}.${fileExt}`;
          const filePath = `equipment-${equipmentId}/maintenance-reports/${id}/attachments/${filename}`;
          
          const buffer = Buffer.from(await file.arrayBuffer());
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('equipments')
            .upload(filePath, buffer, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (uploadError || !uploadData) {
            console.error(`Failed to upload attachment ${i}:`, uploadError);
            continue;
          }
          
          const { data: urlData } = supabase.storage
            .from('equipments')
            .getPublicUrl(uploadData.path);
          
          newAttachmentUrls.push(urlData.publicUrl);
        } catch (error) {
          console.error(`Failed to process attachment ${i}:`, error);
        }
      }
    }

    // Combine existing attachment URLs with new ones
    const finalAttachmentUrls = [
      ...attachment_urls.filter((url: string) => url.trim() !== ''),
      ...newAttachmentUrls
    ];

    // Prepare and sanitize the update data
    const updateDataForValidation = {
      equipment_id,
      location_id,
      issue_description,
      remarks,
      inspection_details,
      action_taken,
      parts_replaced: sanitizePartsArray(parts_replaced),
      priority,
      status,
      downtime_hours,
      date_repaired,
      attachment_urls: sanitizeAttachmentUrls(finalAttachmentUrls),
      reported_by,
      repaired_by,
    };

    // Validate the update data with Zod
    const validationResult = updateEquipmentMaintenanceReportSchema.safeParse(updateDataForValidation);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Build the final update data with properly typed values
    const updateData = {
      ...(validatedData.equipment_id && { equipment_id: validatedData.equipment_id }),
      ...(validatedData.location_id && { location_id: validatedData.location_id }),
      ...(validatedData.issue_description && { issue_description: validatedData.issue_description }),
      ...(validatedData.remarks !== undefined && { remarks: validatedData.remarks }),
      ...(validatedData.inspection_details !== undefined && { inspection_details: validatedData.inspection_details }),
      ...(validatedData.action_taken !== undefined && { action_taken: validatedData.action_taken }),
      parts_replaced: validatedData.parts_replaced || [],
      ...(validatedData.priority !== undefined && { priority: validatedData.priority }),
      ...(validatedData.status !== undefined && { status: validatedData.status }),
      ...(validatedData.downtime_hours !== undefined && { downtime_hours: validatedData.downtime_hours }),
      ...(validatedData.date_repaired !== undefined && { date_repaired: validatedData.date_repaired }),
      attachment_urls: validatedData.attachment_urls || [],
      ...(validatedData.reported_by !== undefined && { reported_by: validatedData.reported_by }),
      ...(validatedData.repaired_by !== undefined && { repaired_by: validatedData.repaired_by }),
    };

    const updatedReport = await prisma.maintenance_equipment_report.update({
      where: { id },
      data: updateData,
      include: {
        equipment: {
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
        },
        location: true,
        reported_user: {
          select: {
            id: true,
            username: true,
            full_name: true,
          }
        },
        repaired_user: {
          select: {
            id: true,
            username: true,
            full_name: true,
          }
        }
      }
    });

    return NextResponse.json(updatedReport);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to update equipment maintenance report',
        details: error instanceof Error ? error.message : 'Unknown error',
        code: error instanceof Error && 'code' in error ? (error as any).code : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete equipment maintenance report
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Check if report exists and get attachment URLs for cleanup
    const existingReport = await prisma.maintenance_equipment_report.findUnique({
      where: { id },
      include: {
        equipment: {
          select: {
            id: true
          }
        }
      }
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Equipment maintenance report not found' },
        { status: 404 }
      );
    }

    // Extract equipment ID for file path matching
    const equipmentId = existingReport.equipment.id;

    // Delete the entire report folder from Supabase storage
    const supabase = createClient();
    
    try {
      // Target the specific report folder: equipment-{equipmentId}/maintenance-reports/{reportId}/
      const reportFolderPrefix = `equipment-${equipmentId}/maintenance-reports/${id}`;
      
      // List all files that start with this report folder path
      const { data: allFiles, error: listError } = await supabase.storage
        .from('equipments')
        .list('', {
          limit: 1000,
          search: reportFolderPrefix
        });
      
      if (!listError && allFiles && allFiles.length > 0) {
        // Filter files that belong to this specific report folder
        const filesToDelete = allFiles
          .map(file => file.name)
          .filter(fileName => fileName.startsWith(reportFolderPrefix + '/'));
        
        if (filesToDelete.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('equipments')
            .remove(filesToDelete);
          
          if (deleteError) {
            console.warn('Failed to delete report folder from storage:', deleteError);
          }
        }
      }
      
      // Alternative approach: Use the recursive list to get all files in the folder
      const { data: folderContents, error: folderError } = await supabase.storage
        .from('equipments')
        .list(reportFolderPrefix, {
          limit: 1000,
          offset: 0
        });
      
      if (!folderError && folderContents && folderContents.length > 0) {
        // Get all files recursively in the report folder
        const getAllFilesInFolder = async (folderPath: string): Promise<string[]> => {
          const files: string[] = [];
          
          const { data, error } = await supabase.storage
            .from('equipments')
            .list(folderPath, { limit: 1000 });
          
          if (!error && data) {
            for (const item of data) {
              const fullPath = `${folderPath}/${item.name}`;
              if (item.metadata?.mimetype) {
                // It's a file
                files.push(fullPath);
              } else {
                // It's a folder, recurse
                const subFiles = await getAllFilesInFolder(fullPath);
                files.push(...subFiles);
              }
            }
          }
          return files;
        };
        
        const allFilesInFolder = await getAllFilesInFolder(reportFolderPrefix);
        
        if (allFilesInFolder.length > 0) {
          const { error: deleteError } = await supabase.storage
            .from('equipments')
            .remove(allFilesInFolder);
          
          if (deleteError) {
            console.warn('Failed to delete all files in report folder:', deleteError);
          }
        }
      }
    } catch (storageError) {
      console.warn('Storage cleanup failed:', storageError);
      // Continue with report deletion even if file cleanup fails
    }

    // Delete the maintenance report from database
    await prisma.maintenance_equipment_report.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Equipment maintenance report and associated files deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete equipment maintenance report' },
      { status: 500 }
    );
  }
}
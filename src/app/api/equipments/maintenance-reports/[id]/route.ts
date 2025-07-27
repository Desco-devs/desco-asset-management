import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase';

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
    const body = await request.json();
    
    // Debug: Log the incoming data
    
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
      attachment_urls,
      reported_by,
      repaired_by,
    } = body;

    // Check if report exists
    const existingReport = await prisma.maintenance_equipment_report.findUnique({
      where: { id }
    });

    if (!existingReport) {
      return NextResponse.json(
        { error: 'Equipment maintenance report not found' },
        { status: 404 }
      );
    }

    // Debug: Log the update data
    const updateData = {
      equipment_id,
      location_id,
      issue_description,
      remarks,
      inspection_details,
      action_taken,
      parts_replaced: parts_replaced || [],
      priority,
      status,
      downtime_hours: downtime_hours || null,
      date_repaired: date_repaired ? new Date(date_repaired) : null,
      attachment_urls: attachment_urls || [],
      reported_by,
      repaired_by,
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
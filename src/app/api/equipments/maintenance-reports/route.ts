import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  createEquipmentMaintenanceReportSchema,
  sanitizePartsArray,
  sanitizeAttachmentUrls
} from '@/lib/validations/maintenance-reports';

// GET - Fetch all equipment maintenance reports
export async function GET() {
  try {
    const reports = await prisma.maintenance_equipment_report.findMany({
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
      },
      orderBy: {
        date_reported: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      data: reports
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch equipment maintenance reports' },
      { status: 500 }
    );
  }
}

// POST - Create new equipment maintenance report
export async function POST(request: NextRequest) {
  try {
    // Handle FormData from frontend
    const formData = await request.formData();
    
    // Extract and convert FormData to JSON object
    const body: any = {};
    for (const [key, value] of formData.entries()) {
      if (key === 'parts_replaced' || key === 'attachment_urls') {
        // Parse JSON strings back to arrays
        try {
          body[key] = JSON.parse(value as string);
        } catch {
          body[key] = [];
        }
      } else if (key === 'downtime_hours') {
        // Keep downtime_hours as string (matches Prisma schema)
        body[key] = value || null;
      } else {
        body[key] = value;
      }
    }
    
    // Sanitize parts_replaced and attachment_urls before validation
    const sanitizedBody = {
      ...body,
      parts_replaced: sanitizePartsArray(body.parts_replaced),
      attachment_urls: sanitizeAttachmentUrls(body.attachment_urls),
    };

    // Enhanced debug logging
    console.log('=== MAINTENANCE REPORT DEBUG ===');
    console.log('Received FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }
    console.log('Processed body object:', JSON.stringify(body, null, 2));
    console.log('Sanitized body object:', JSON.stringify(sanitizedBody, null, 2));
    console.log('=== END DEBUG ===');

    // Validate the entire request body with Zod
    const validationResult = createEquipmentMaintenanceReportSchema.safeParse(sanitizedBody);
    
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

    const report = await prisma.maintenance_equipment_report.create({
      data: {
        equipment_id: validatedData.equipment_id,
        location_id: validatedData.location_id,
        issue_description: validatedData.issue_description,
        remarks: validatedData.remarks,
        inspection_details: validatedData.inspection_details,
        action_taken: validatedData.action_taken,
        parts_replaced: validatedData.parts_replaced,
        priority: validatedData.priority,
        status: validatedData.status,
        downtime_hours: validatedData.downtime_hours,
        date_repaired: validatedData.date_repaired,
        attachment_urls: validatedData.attachment_urls,
        reported_by: validatedData.reported_by,
        repaired_by: validatedData.repaired_by,
      },
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

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating equipment maintenance report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create equipment maintenance report',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
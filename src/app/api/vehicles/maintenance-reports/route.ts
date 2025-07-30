import { NextRequest, NextResponse } from 'next/server';
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import { 
  createVehicleMaintenanceReportSchema,
  sanitizePartsArray,
  sanitizeAttachmentUrls
} from '@/lib/validations/maintenance-reports';

// GET /api/vehicles/maintenance-reports - Get all vehicle maintenance reports
export const GET = withResourcePermission('maintenance_reports', 'view', async (request: NextRequest, _user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    // Build query filters
    const where: any = {};
    if (vehicleId) where.vehicle_id = vehicleId;
    if (status) where.status = status;
    if (priority) where.priority = priority;

    // Apply pagination if provided
    const queryOptions: any = {
      where,
      include: {
        vehicle: {
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
            full_name: true
          }
        },
        repaired_user: {
          select: {
            id: true,
            username: true,
            full_name: true
          }
        }
      },
      orderBy: {
        date_reported: 'desc'
      }
    };

    if (limit) {
      queryOptions.take = parseInt(limit, 10);
    }
    if (offset) {
      queryOptions.skip = parseInt(offset, 10);
    }

    const reports = await prisma.maintenance_vehicle_report.findMany(queryOptions);
    const total = await prisma.maintenance_vehicle_report.count({ where });

    return NextResponse.json({
      data: reports,
      total,
      user_role: _user.role,
      permissions: {
        can_create: _user.role !== 'VIEWER',
        can_update: _user.role !== 'VIEWER',
        can_delete: _user.role === 'SUPERADMIN' || _user.role === 'ADMIN'
      }
    });
  } catch (error) {
    console.error('Error fetching vehicle maintenance reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

// POST /api/vehicles/maintenance-reports - Create new vehicle maintenance report
export const POST = withResourcePermission('maintenance_reports', 'create', async (request: NextRequest, _user: AuthenticatedUser) => {
  try {
    const body = await request.json();
    
    // Sanitize parts_replaced and attachment_urls before validation
    const sanitizedBody = {
      ...body,
      parts_replaced: sanitizePartsArray(body.parts_replaced),
      attachment_urls: sanitizeAttachmentUrls(body.attachment_urls),
      reported_by: _user.id, // Set from authenticated user
    };

    // Validate the entire request body with Zod
    const validationResult = createVehicleMaintenanceReportSchema.safeParse(sanitizedBody);
    
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

    // Create maintenance report
    const report = await prisma.maintenance_vehicle_report.create({
      data: {
        vehicle_id: validatedData.vehicle_id,
        location_id: validatedData.location_id,
        issue_description: validatedData.issue_description,
        remarks: validatedData.remarks,
        inspection_details: validatedData.inspection_details,
        parts_replaced: validatedData.parts_replaced,
        priority: validatedData.priority || 'MEDIUM',
        status: validatedData.status || 'REPORTED',
        downtime_hours: validatedData.downtime_hours,
        attachment_urls: validatedData.attachment_urls,
        reported_by: _user.id,
        date_reported: new Date()
      },
      include: {
        vehicle: {
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
            full_name: true
          }
        }
      }
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle maintenance report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
import { NextRequest, NextResponse } from 'next/server';
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

// GET /api/vehicles/maintenance-reports - Get all vehicle maintenance reports
export const GET = withResourcePermission('maintenance_reports', 'view', async (request: NextRequest, user: AuthenticatedUser) => {
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
      user_role: user.role,
      permissions: {
        can_create: user.role !== 'VIEWER',
        can_update: user.role !== 'VIEWER',
        can_delete: user.role === 'SUPERADMIN' || user.role === 'ADMIN'
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
export const POST = withResourcePermission('maintenance_reports', 'create', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const body = await request.json();
    
    const {
      vehicle_id,
      location_id,
      issue_description,
      remarks,
      inspection_details,
      parts_replaced,
      priority,
      status,
      downtime_hours,
      attachment_urls
    } = body;

    // Validate required fields
    if (!vehicle_id || !location_id || !issue_description) {
      return NextResponse.json(
        { error: 'vehicle_id, location_id, and issue_description are required' },
        { status: 400 }
      );
    }

    // Create maintenance report
    const report = await prisma.maintenance_vehicle_report.create({
      data: {
        vehicle_id,
        location_id,
        issue_description,
        remarks: remarks || null,
        inspection_details: inspection_details || null,
        parts_replaced: parts_replaced || [],
        priority: priority || 'MEDIUM',
        status: status || 'REPORTED',
        downtime_hours: downtime_hours || null,
        attachment_urls: attachment_urls || [],
        reported_by: user.id,
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
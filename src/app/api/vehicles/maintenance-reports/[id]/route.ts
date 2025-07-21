import { NextRequest, NextResponse } from 'next/server';
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';

// GET /api/vehicles/maintenance-reports/[id] - Get single vehicle maintenance report
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withResourcePermission('maintenance_reports', 'view', async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const report = await prisma.maintenance_vehicle_report.findUnique({
        where: { id: params.id },
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
        }
      });

      if (!report) {
        return NextResponse.json({ error: 'Maintenance report not found' }, { status: 404 });
      }

      return NextResponse.json(report);
    } catch (error) {
      console.error('Error fetching maintenance report:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}

// PUT /api/vehicles/maintenance-reports/[id] - Update vehicle maintenance report
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withResourcePermission('maintenance_reports', 'update', async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const body = await req.json();

      // Check if report exists
      const existingReport = await prisma.maintenance_vehicle_report.findUnique({
        where: { id: params.id }
      });

      if (!existingReport) {
        return NextResponse.json({ error: 'Maintenance report not found' }, { status: 404 });
      }

      // Extract and validate the fields we want to update
      const {
        issue_description,
        remarks,
        inspection_details,
        action_taken,
        parts_replaced,
        priority,
        status,
        downtime_hours,
        attachment_urls,
        location_id
      } = body;

      // Prepare update data with only valid fields
      const updateData: any = {
        updated_at: new Date()
      };

      // Only add fields that are provided and valid
      if (issue_description !== undefined) updateData.issue_description = issue_description;
      if (remarks !== undefined) updateData.remarks = remarks || null;
      if (inspection_details !== undefined) updateData.inspection_details = inspection_details || null;
      if (action_taken !== undefined) updateData.action_taken = action_taken || null;
      if (parts_replaced !== undefined) updateData.parts_replaced = Array.isArray(parts_replaced) ? parts_replaced : [];
      if (priority !== undefined) updateData.priority = priority;
      if (status !== undefined) updateData.status = status;
      if (downtime_hours !== undefined) updateData.downtime_hours = downtime_hours || null;
      if (attachment_urls !== undefined) updateData.attachment_urls = Array.isArray(attachment_urls) ? attachment_urls : [];
      if (location_id !== undefined) updateData.location_id = location_id;

      // Handle completion logic
      if (status === 'COMPLETED') {
        if (!existingReport.repaired_by) updateData.repaired_by = user.id;
        if (!existingReport.date_repaired) updateData.date_repaired = new Date();
      }

      // Update the report
      const updatedReport = await prisma.maintenance_vehicle_report.update({
        where: { id: params.id },
        data: updateData,
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
        }
      });

      return NextResponse.json(updatedReport);
    } catch (error) {
      console.error('Error updating maintenance report:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  })(request);
}

// DELETE /api/vehicles/maintenance-reports/[id] - Delete vehicle maintenance report
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withResourcePermission('maintenance_reports', 'delete', async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      console.log(`🗑️ Attempting to delete maintenance report: ${params.id}`);

      // Check if report exists with full error logging
      const existingReport = await prisma.maintenance_vehicle_report.findUnique({
        where: { id: params.id },
        include: {
          vehicle: true,
          location: true
        }
      });

      console.log('🔍 Existing report check:', existingReport ? 'Found' : 'Not found');

      if (!existingReport) {
        console.log(`❌ Report not found: ${params.id}`);
        return NextResponse.json({ error: 'Maintenance report not found' }, { status: 404 });
      }

      console.log('📊 Report details:', {
        id: existingReport.id,
        vehicle_id: existingReport.vehicle_id,
        location_id: existingReport.location_id
      });

      // Delete the report with explicit transaction to handle any cascade issues
      await prisma.$transaction(async (tx) => {
        console.log('🔄 Starting transaction to delete report...');
        
        const deleted = await tx.maintenance_vehicle_report.delete({
          where: { id: params.id }
        });
        
        console.log('✅ Report deleted successfully in transaction:', deleted.id);
        return deleted;
      });

      console.log(`✅ Successfully deleted maintenance report: ${params.id}`);

      return NextResponse.json({ 
        message: 'Maintenance report deleted successfully',
        id: params.id 
      });
    } catch (error) {
      console.error('❌ Error deleting maintenance report:', error);
      console.error('🔍 Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        reportId: params.id,
        // Additional Prisma-specific error details
        code: (error as any)?.code,
        meta: (error as any)?.meta,
        clientVersion: (error as any)?.clientVersion
      });
      
      // Handle specific Prisma errors
      if ((error as any)?.code === 'P2025') {
        console.log('🔍 Prisma P2025: Record not found during delete');
        return NextResponse.json({ error: 'Maintenance report not found' }, { status: 404 });
      }
      
      if ((error as any)?.code === 'P2003') {
        console.log('🔍 Prisma P2003: Foreign key constraint violation');
        return NextResponse.json({ 
          error: 'Cannot delete maintenance report due to related data constraints',
          details: 'This report may have dependent records that prevent deletion'
        }, { status: 409 });
      }
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
          code: (error as any)?.code || 'UNKNOWN_ERROR'
        },
        { status: 500 }
      );
    }
  })(request);
}
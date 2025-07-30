import { NextRequest, NextResponse } from 'next/server';
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/prisma';
import { 
  updateVehicleMaintenanceReportSchema,
  sanitizePartsArray,
  sanitizeAttachmentUrls
} from '@/lib/validations/maintenance-reports';

// GET /api/vehicles/maintenance-reports/[id] - Get single vehicle maintenance report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withResourcePermission('maintenance_reports', 'view', async (req: NextRequest, _user: AuthenticatedUser) => {
    try {
      const { id } = await params;
      const report = await prisma.maintenance_vehicle_report.findUnique({
        where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  return withResourcePermission('maintenance_reports', 'update', async (req: NextRequest, _user: AuthenticatedUser) => {
    try {
      const { id } = await params;
      const body = await req.json();

      // Check if report exists
      const existingReport = await prisma.maintenance_vehicle_report.findUnique({
        where: { id }
      });

      if (!existingReport) {
        return NextResponse.json({ error: 'Maintenance report not found' }, { status: 404 });
      }

      // Sanitize parts_replaced and attachment_urls before validation
      const sanitizedBody = {
        ...body,
        parts_replaced: sanitizePartsArray(body.parts_replaced),
        attachment_urls: sanitizeAttachmentUrls(body.attachment_urls),
      };

      // Validate the update data with Zod
      const validationResult = updateVehicleMaintenanceReportSchema.safeParse(sanitizedBody);
      
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

      // Prepare update data with only valid fields
      const updateData: any = {
        updated_at: new Date()
      };

      // Only add fields that are provided and valid
      if (validatedData.issue_description !== undefined) updateData.issue_description = validatedData.issue_description;
      if (validatedData.remarks !== undefined) updateData.remarks = validatedData.remarks;
      if (validatedData.inspection_details !== undefined) updateData.inspection_details = validatedData.inspection_details;
      if (validatedData.action_taken !== undefined) updateData.action_taken = validatedData.action_taken;
      if (validatedData.parts_replaced !== undefined) updateData.parts_replaced = validatedData.parts_replaced;
      if (validatedData.priority !== undefined) updateData.priority = validatedData.priority;
      if (validatedData.status !== undefined) updateData.status = validatedData.status;
      if (validatedData.downtime_hours !== undefined) updateData.downtime_hours = validatedData.downtime_hours;
      if (validatedData.attachment_urls !== undefined) updateData.attachment_urls = validatedData.attachment_urls;
      if (body.location_id !== undefined) updateData.location_id = body.location_id;

      // Handle completion logic
      if (validatedData.status === 'COMPLETED') {
        if (!existingReport.repaired_by) updateData.repaired_by = _user.id;
        if (!existingReport.date_repaired) updateData.date_repaired = new Date();
      }

      // Update the report
      const updatedReport = await prisma.maintenance_vehicle_report.update({
        where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  return withResourcePermission('maintenance_reports', 'delete', async (req: NextRequest, _user: AuthenticatedUser) => {
    const { id } = await params;
    try {
      console.log(`🗑️ Attempting to delete maintenance report: ${id}`);

      // Check if report exists with full error logging
      const existingReport = await prisma.maintenance_vehicle_report.findUnique({
        where: { id },
        include: {
          vehicle: true,
          location: true
        }
      });

      console.log('🔍 Existing report check:', existingReport ? 'Found' : 'Not found');

      if (!existingReport) {
        console.log(`❌ Report not found: ${id}`);
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
          where: { id }
        });
        
        console.log('✅ Report deleted successfully in transaction:', deleted.id);
        return deleted;
      });

      console.log(`✅ Successfully deleted maintenance report: ${id}`);

      return NextResponse.json({ 
        message: 'Maintenance report deleted successfully',
        id 
      });
    } catch (error) {
      console.error('❌ Error deleting maintenance report:', error);
      console.error('🔍 Full error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        reportId: id,
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
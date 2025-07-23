import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    const reportType = searchParams.get('reportType') || 'summary';
    const equipmentId = searchParams.get('equipmentId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for filtering
    const where: any = {};

    if (equipmentId && equipmentId !== 'ALL_EQUIPMENTS') {
      where.equipment_id = equipmentId;
    }

    if (status && status !== 'ALL_STATUS') {
      where.status = status;
    }

    if (priority && priority !== 'ALL_PRIORITIES') {
      where.priority = priority;
    }

    if (startDate || endDate) {
      where.date_reported = {};
      if (startDate) {
        where.date_reported.gte = new Date(startDate);
      }
      if (endDate) {
        where.date_reported.lte = new Date(endDate);
      }
    }

    const reports = await prisma.maintenance_equipment_report.findMany({
      where,
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

    // For now, return JSON data with appropriate headers
    // TODO: Implement actual PDF/Excel generation
    const filename = `equipment-maintenance-reports-${new Date().toISOString().split('T')[0]}.${format}`;
    
    return NextResponse.json({
      success: true,
      message: 'Export functionality will be implemented soon',
      data: {
        format,
        reportType,
        filename,
        totalRecords: reports.length,
        filters: {
          equipmentId,
          status,
          priority,
          startDate,
          endDate
        },
        reports: reports.map(report => ({
          id: report.id,
          equipment: `${report.equipment.brand} ${report.equipment.model}`,
          project: report.equipment.project.name,
          client: report.equipment.project.client.name,
          location: report.location.address,
          issue: report.issue_description,
          status: report.status,
          priority: report.priority,
          reportedDate: report.date_reported,
          repairedDate: report.date_repaired,
          reportedBy: report.reported_user?.full_name || 'Unknown',
          repairedBy: report.repaired_user?.full_name || 'Not assigned'
        }))
      }
    });

  } catch (error) {
    console.error('Error exporting equipment maintenance reports:', error);
    return NextResponse.json(
      { error: 'Failed to export equipment maintenance reports' },
      { status: 500 }
    );
  }
}
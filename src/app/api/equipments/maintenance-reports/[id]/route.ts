import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    await prisma.maintenance_equipment_report.delete({
      where: { id }
    });

    return NextResponse.json(
      { message: 'Equipment maintenance report deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete equipment maintenance report' },
      { status: 500 }
    );
  }
}
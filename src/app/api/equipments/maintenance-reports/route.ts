import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
    const body = await request.json();
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

    // Validate required fields
    if (!equipment_id || !issue_description) {
      return NextResponse.json(
        { error: 'Equipment ID and Issue Description are required' },
        { status: 400 }
      );
    }

    const report = await prisma.maintenance_equipment_report.create({
      data: {
        equipment_id,
        location_id: location_id || null,
        issue_description,
        remarks,
        inspection_details,
        action_taken,
        parts_replaced: parts_replaced || [],
        priority,
        status,
        downtime_hours,
        date_repaired: date_repaired ? new Date(date_repaired) : null,
        attachment_urls: attachment_urls || [],
        reported_by,
        repaired_by,
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
    return NextResponse.json(
      { error: 'Failed to create equipment maintenance report' },
      { status: 500 }
    );
  }
}
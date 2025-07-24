import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const locationId = searchParams.get('locationId') || '';
    const clientId = searchParams.get('clientId') || '';
    const projectId = searchParams.get('projectId') || '';
    const status = searchParams.get('status') || 'all';

    const skip = (page - 1) * limit;

    // Build where condition
    const whereCondition: Prisma.equipmentWhereInput = {};

    // Search filter
    if (search) {
      whereCondition.OR = [
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { type: { contains: search, mode: 'insensitive' } },
        { owner: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Status filter
    if (status !== 'all') {
      whereCondition.status = status === 'operational' ? 'OPERATIONAL' : 'NON_OPERATIONAL';
    }

    // Location/Client/Project hierarchy filters
    if (projectId) {
      whereCondition.project_id = projectId;
    } else if (clientId) {
      whereCondition.project = {
        client_id: clientId,
      };
    } else if (locationId) {
      whereCondition.project = {
        client: {
          location_id: locationId,
        },
      };
    }

    const [equipment, totalCount] = await Promise.all([
      prisma.equipment.findMany({
        where: whereCondition,
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true,
                },
              },
            },
          },
          _count: {
            select: {
              maintenance_reports: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.equipment.count({ where: whereCondition }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    const serializedEquipment = equipment.map((item) => ({
      ...item,
      maintenanceReportCount: item._count.maintenance_reports,
      createdAt: item.created_at.toISOString(),
      updatedAt: item.updated_at.toISOString(),
      project: item.project ? {
        ...item.project,
        createdAt: item.project.created_at.toISOString(),
        updatedAt: item.project.updated_at.toISOString(),
        client: item.project.client ? {
          ...item.project.client,
          createdAt: item.project.client.created_at.toISOString(),
          updatedAt: item.project.client.updated_at.toISOString(),
          location: item.project.client.location ? {
            ...item.project.client.location,
            createdAt: item.project.client.location.created_at.toISOString(),
            updatedAt: item.project.client.location.updated_at.toISOString(),
          } : null,
        } : null,
      } : null,
    }));

    return NextResponse.json({
      equipment: serializedEquipment,
      totalPages,
      totalCount,
      currentPage: page,
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
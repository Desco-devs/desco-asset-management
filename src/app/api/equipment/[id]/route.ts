import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const equipment = await prisma.equipment.findUnique({
      where: { id },
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
      },
    });

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found' },
        { status: 404 }
      );
    }

    const serializedEquipment = {
      ...equipment,
      createdAt: equipment.created_at.toISOString(),
      updatedAt: equipment.updated_at.toISOString(),
      project: equipment.project ? {
        ...equipment.project,
        createdAt: equipment.project.created_at.toISOString(),
        updatedAt: equipment.project.updated_at.toISOString(),
        client: equipment.project.client ? {
          ...equipment.project.client,
          createdAt: equipment.project.client.created_at.toISOString(),
          updatedAt: equipment.project.client.updated_at.toISOString(),
          location: equipment.project.client.location ? {
            ...equipment.project.client.location,
            createdAt: equipment.project.client.location.created_at.toISOString(),
            updatedAt: equipment.project.client.location.updated_at.toISOString(),
          } : null,
        } : null,
      } : null,
    };

    return NextResponse.json(serializedEquipment);
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipment' },
      { status: 500 }
    );
  }
}
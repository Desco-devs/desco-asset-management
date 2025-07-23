import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: resolvedParams.id },
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
      created_at: equipment.created_at.toISOString(),
      updated_at: equipment.updated_at.toISOString(),
      project: equipment.project ? {
        ...equipment.project,
        created_at: equipment.project.created_at.toISOString(),
        updated_at: equipment.project.updated_at.toISOString(),
        client: equipment.project.client ? {
          ...equipment.project.client,
          created_at: equipment.project.client.created_at.toISOString(),
          updated_at: equipment.project.client.updated_at.toISOString(),
          location: equipment.project.client.location ? {
            ...equipment.project.client.location,
            created_at: equipment.project.client.location.created_at.toISOString(),
            updated_at: equipment.project.client.location.updated_at.toISOString(),
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
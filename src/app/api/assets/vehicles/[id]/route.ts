import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const vehicle = await prisma.vehicle.findUnique({
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

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const serializedVehicle = {
      ...vehicle,
      created_at: vehicle.created_at.toISOString(),
      updated_at: vehicle.updated_at.toISOString(),
      project: vehicle.project ? {
        ...vehicle.project,
        created_at: vehicle.project.created_at.toISOString(),
        updated_at: vehicle.project.updated_at.toISOString(),
        client: vehicle.project.client ? {
          ...vehicle.project.client,
          created_at: vehicle.project.client.created_at.toISOString(),
          updated_at: vehicle.project.client.updated_at.toISOString(),
          location: vehicle.project.client.location ? {
            ...vehicle.project.client.location,
            created_at: vehicle.project.client.location.created_at.toISOString(),
            updated_at: vehicle.project.client.location.updated_at.toISOString(),
          } : null,
        } : null,
      } : null,
    };

    return NextResponse.json(serializedVehicle);
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}
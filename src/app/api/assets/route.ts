import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { AssetsPageData } from '@/types/assets';

export async function GET() {
  try {
    const [
      equipment,
      vehicles,
      locations,
      clients,
      projects,
      equipmentCount,
      vehicleCount,
    ] = await Promise.all([
      prisma.equipment.findMany({
        take: 12,
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
        orderBy: { created_at: 'desc' },
      }),
      prisma.vehicle.findMany({
        take: 12,
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
        orderBy: { created_at: 'desc' },
      }),
      prisma.location.findMany({
        orderBy: { address: 'asc' },
      }),
      prisma.client.findMany({
        include: {
          location: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.project.findMany({
        include: {
          client: {
            include: {
              location: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.equipment.count(),
      prisma.vehicle.count(),
    ]);

    const data: AssetsPageData = {
      equipment: equipment.map((item) => ({
        ...item,
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
      })),
      vehicles: vehicles.map((item) => ({
        ...item,
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
      })),
      locations: locations.map((item) => ({
        uid: item.id,
        address: item.address,
        createdAt: item.created_at.toISOString(),
        updatedAt: item.updated_at.toISOString(),
      })),
      clients: clients.map((item) => ({
        uid: item.id,
        name: item.name,
        createdAt: item.created_at.toISOString(),
        updatedAt: item.updated_at.toISOString(),
        location: item.location ? {
          uid: item.location.id,
          address: item.location.address,
          createdAt: item.location.created_at.toISOString(),
          updatedAt: item.location.updated_at.toISOString(),
        } : null,
      })),
      projects: projects.map((item) => ({
        uid: item.id,
        name: item.name,
        createdAt: item.created_at.toISOString(),
        updatedAt: item.updated_at.toISOString(),
        client: item.client ? {
          uid: item.client.id,
          name: item.client.name,
          createdAt: item.client.created_at.toISOString(),
          updatedAt: item.client.updated_at.toISOString(),
          location: item.client.location ? {
            uid: item.client.location.id,
            address: item.client.location.address,
            createdAt: item.client.location.created_at.toISOString(),
            updatedAt: item.client.location.updated_at.toISOString(),
          } : null,
        } : null,
      })),
      equipmentCount,
      vehicleCount,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching assets data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch assets data' },
      { status: 500 }
    );
  }
}
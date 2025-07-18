// app/api/equipments/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const equipments = await prisma.equipment.findMany({
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
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(equipments);
  } catch (error) {
    console.error('Error fetching equipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipments' },
      { status: 500 }
    );
  }
}



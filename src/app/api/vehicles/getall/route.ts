// app/api/vehicles/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const vehicles = await prisma.vehicle.findMany({
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
                createdAt: 'desc'
            }
        });

        return NextResponse.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        return NextResponse.json(
            { error: 'Failed to fetch vehicles' },
            { status: 500 }
        );
    }
}
// app/api/locations/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const locations = await prisma.location.findMany({
            orderBy: {
                address: 'asc'
            }
        });

        return NextResponse.json(locations);
    } catch (error) {
        console.error('Error fetching locations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch locations' },
            { status: 500 }
        );
    }
}
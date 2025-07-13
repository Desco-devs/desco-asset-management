// File: app/api/maintenance-reports/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// GET method to fetch reports
export async function GET(request: Request) {
    try {
        const url = new URL(request.url)
        const reportId = url.searchParams.get('reportId')
        const equipmentId = url.searchParams.get('equipmentId')
        const locationId = url.searchParams.get('locationId')
        const status = url.searchParams.get('status')
        const priority = url.searchParams.get('priority')

        if (reportId) {
            // Get single report
            const report = await prisma.maintenanceEquipmentReport.findUnique({
                where: { uid: reportId },
                include: {
                    equipment: {
                        include: {
                            project: {
                                include: { client: { include: { location: true } } }
                            }
                        }
                    },
                    location: true
                }
            })

            if (!report) {
                return NextResponse.json({ error: 'Report not found' }, { status: 404 })
            }

            return NextResponse.json(report)
        }

        // Get multiple reports with filters
        const where: any = {}

        if (equipmentId) where.equipmentId = equipmentId
        if (locationId) where.locationId = locationId
        if (status) where.status = status
        if (priority) where.priority = priority

        const reports = await prisma.maintenanceEquipmentReport.findMany({
            where,
            include: {
                equipment: {
                    include: {
                        project: {
                            include: { client: { include: { location: true } } }
                        }
                    }
                },
                location: true
            },
            orderBy: { dateReported: 'desc' }
        })

        return NextResponse.json(reports)
    } catch (err) {
        console.error('GET error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
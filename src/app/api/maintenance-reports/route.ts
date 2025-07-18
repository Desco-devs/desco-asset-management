// File: app/api/maintenance-reports/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'
import { getResourcePermissions } from '@/lib/auth/utils'

const prisma = new PrismaClient()

// GET /api/maintenance-reports - View all maintenance reports with proper role-based access control
export const GET = withResourcePermission('maintenance_reports', 'view', async (request: NextRequest, user: AuthenticatedUser) => {
    try {
        const { searchParams } = new URL(request.url)
        const reportId = searchParams.get('reportId')
        const equipmentId = searchParams.get('equipmentId')
        const locationId = searchParams.get('locationId')
        const status = searchParams.get('status')
        const priority = searchParams.get('priority')
        const limit = searchParams.get('limit')
        const offset = searchParams.get('offset')

        if (reportId && reportId !== 'undefined') {
            // Get single report
            const report = await prisma.maintenance_equipment_report.findUnique({
                where: { id: reportId },
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

            // Get user permissions for this resource
            const permissions = getResourcePermissions(user.role, 'maintenance_reports')

            return NextResponse.json({
                data: report,
                user_role: user.role,
                permissions: {
                    can_create: permissions.canCreate,
                    can_update: permissions.canUpdate,
                    can_delete: permissions.canDelete
                }
            })
        }

        // Get multiple reports with filters
        const where: any = {}

        if (equipmentId && equipmentId !== 'undefined') where.equipment_id = equipmentId
        if (locationId && locationId !== 'undefined') where.location_id = locationId
        if (status) where.status = status
        if (priority) where.priority = priority

        const queryOptions: any = {
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
            orderBy: { date_reported: 'desc' }
        }

        if (limit) {
            queryOptions.take = parseInt(limit, 10)
        }
        if (offset) {
            queryOptions.skip = parseInt(offset, 10)
        }

        const reports = await prisma.maintenance_equipment_report.findMany(queryOptions)
        const total = await prisma.maintenance_equipment_report.count({ where })

        // Get user permissions for this resource
        const permissions = getResourcePermissions(user.role, 'maintenance_reports')

        return NextResponse.json({
            data: reports,
            total,
            user_role: user.role,
            permissions: {
                can_create: permissions.canCreate,
                can_update: permissions.canUpdate,
                can_delete: permissions.canDelete
            }
        })
    } catch (error) {
        console.error('Error fetching maintenance reports:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
})
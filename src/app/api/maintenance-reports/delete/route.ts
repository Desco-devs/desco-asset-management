// File: app/api/maintenance-reports/delete/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createServiceRoleClient } from '@/lib/supabase-server'

const prisma = new PrismaClient()
const supabase = createServiceRoleClient()


export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url)
        const reportId = url.searchParams.get('reportId')
        if (!reportId) {
            return NextResponse.json({ error: 'reportId required' }, { status: 400 })
        }

        const existing = await prisma.maintenance_equipment_report.findUnique({
            where: { id: reportId },
            include: { equipment: true }
        })
        if (!existing) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        const equipmentId = existing.equipment_id

        // Delete report record first
        await prisma.maintenance_equipment_report.delete({ where: { id: reportId } })

        // Delete all files in folder
        const folder = `${equipmentId}/${reportId}`
        const { data: files } = await supabase.storage.from('maintenance-reports').list(folder)
        if (files?.length) {
            const paths = files
                .filter(f => f.name !== '.emptyFolderPlaceholder')
                .map(f => `${folder}/${f.name}`)
            await supabase.storage.from('maintenance-reports').remove(paths)
        }

        return NextResponse.json({ message: 'Report deleted successfully' })
    } catch (err) {
        console.error('DELETE error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
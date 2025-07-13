// File: app/api/maintenance-reports/delete/route.ts

import { NextResponse } from 'next/server'
import { prisma, supabase } from '@/lib/prisma'


export async function DELETE(request: Request) {
    try {
        const url = new URL(request.url)
        const reportId = url.searchParams.get('reportId')
        if (!reportId) {
            return NextResponse.json({ error: 'reportId required' }, { status: 400 })
        }

        const existing = await prisma.maintenanceEquipmentReport.findUnique({
            where: { uid: reportId },
            include: { equipment: true }
        })
        if (!existing) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        const equipmentId = existing.equipmentId

        // Delete report record first
        await prisma.maintenanceEquipmentReport.delete({ where: { uid: reportId } })

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
    }
}
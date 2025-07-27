// File: app/api/maintenance-reports/update/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient, report_status, report_priority } from '@prisma/client'

import { deleteFileFromSupabase, uploadFileToSupabase } from '@/utils/maintenance-helpers'

const prisma = new PrismaClient()


export async function PUT(request: Request) {
    try {
        const formData = await request.formData()

        const reportId = formData.get('reportId') as string
        const equipmentId = formData.get('equipmentId') as string
        const locationId = formData.get('locationId') as string
        const reportedBy = formData.get('reportedBy') as string
        const repairedBy = (formData.get('repairedBy') as string) || null
        const issueDescription = formData.get('issueDescription') as string
        const remarks = (formData.get('remarks') as string) || null
        const inspectionDetails = (formData.get('inspectionDetails') as string) || null
        const actionTaken = (formData.get('actionTaken') as string) || null
        const priority = formData.get('priority') as keyof typeof report_priority
        const status = formData.get('status') as keyof typeof report_status
        const downtimeHours = (formData.get('downtimeHours') as string) || null

        const dateRepairedStr = formData.get('dateRepaired') as string | null

        // Parts replaced
        const partsReplacedStr = formData.get('partsReplaced') as string
        const partsReplaced = partsReplacedStr ? partsReplacedStr.split(',').map(part => part.trim()) : []

        if (!reportId || !equipmentId || !locationId || !reportedBy || !issueDescription) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const existing = await prisma.maintenance_equipment_report.findUnique({
            where: { id: reportId }
        })
        if (!existing) {
            return NextResponse.json({ error: 'Report not found' }, { status: 404 })
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            equipment_id: equipmentId,
            location_id: locationId,
            reported_by: reportedBy,
            repaired_by: repairedBy,
            issue_description: issueDescription,
            remarks,
            inspection_details: inspectionDetails,
            action_taken: actionTaken,
            parts_replaced: partsReplaced,
            priority,
            status,
            downtime_hours: downtimeHours
        }

        if (dateRepairedStr) {
            updateData.date_repaired = new Date(dateRepairedStr)
        } else {
            updateData.date_repaired = null
        }

        // Handle attachment updates
        const currentAttachments = existing.attachment_urls || []
        const newAttachments: string[] = [...currentAttachments]

        // Check for new attachments or replacements
        let attachmentIndex = 0
        while (true) {
            const newAttachmentFile = formData.get(`attachment_${attachmentIndex}`) as File | null
            const keepExisting = formData.get(`keepExistingAttachment_${attachmentIndex}`) as string

            if (!newAttachmentFile && keepExisting !== 'true' && attachmentIndex >= currentAttachments.length) {
                break
            }

            if (newAttachmentFile && newAttachmentFile.size > 0) {
                // Replace or add new attachment
                if (attachmentIndex < currentAttachments.length) {
                    // Replace existing - delete old one first
                    await deleteFileFromSupabase(currentAttachments[attachmentIndex], `attachment ${attachmentIndex + 1}`)
                }

                // Upload new attachment
                const newAttachmentUrl = await uploadFileToSupabase(
                    newAttachmentFile,
                    equipmentId,
                    reportId,
                    attachmentIndex + 1
                )
                newAttachments[attachmentIndex] = newAttachmentUrl
            } else if (keepExisting !== 'true' && attachmentIndex < currentAttachments.length) {
                // Remove existing attachment
                await deleteFileFromSupabase(currentAttachments[attachmentIndex], `attachment ${attachmentIndex + 1}`)
                newAttachments.splice(attachmentIndex, 1)
                attachmentIndex--
            }

            attachmentIndex++
        }

        updateData.attachment_urls = newAttachments

        const updated = await prisma.maintenance_equipment_report.update({
            where: { id: reportId },
            data: updateData,
        })

        const result = await prisma.maintenance_equipment_report.findUnique({
            where: { id: updated.id },
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

        return NextResponse.json(result)
    } catch (err) {
        console.error('PUT error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
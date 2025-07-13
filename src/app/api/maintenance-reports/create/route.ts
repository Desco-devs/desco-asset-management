// File: app/api/maintenance-reports/create/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient, ReportStatus, ReportPriority } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

// Initialize Prisma client
const prisma = new PrismaClient()

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
)

// Upload a file to Supabase storage
const uploadFileToSupabase = async (
    file: File,
    equipmentId: string,
    reportId: string,
    attachmentIndex: number
): Promise<string> => {
    const timestamp = Date.now()
    const ext = file.name.split('.').pop()
    const filename = `attachment_${attachmentIndex}_${timestamp}.${ext}`
    const filepath = `${equipmentId}/${reportId}/${filename}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { data: uploadData, error: uploadErr } = await supabase
        .storage
        .from('maintenance-reports')
        .upload(filepath, buffer, { cacheControl: '3600', upsert: false })

    if (uploadErr || !uploadData) {
        throw new Error(`Upload attachment ${attachmentIndex} failed: ${uploadErr?.message}`)
    }

    const { data: urlData } = supabase
        .storage
        .from('maintenance-reports')
        .getPublicUrl(uploadData.path)

    return urlData.publicUrl
}

export async function POST(request: Request) {
    try {
        console.log('Starting maintenance report creation...')
        const formData = await request.formData()

        // Extract required fields
        const equipmentId = formData.get('equipmentId') as string
        const locationId = formData.get('locationId') as string
        const reportedBy = formData.get('reportedBy') as string
        const issueDescription = formData.get('issueDescription') as string

        // Extract optional fields
        const repairedBy = formData.get('repairedBy') as string
        const remarks = formData.get('remarks') as string
        const inspectionDetails = formData.get('inspectionDetails') as string
        const actionTaken = formData.get('actionTaken') as string
        const priority = (formData.get('priority') as keyof typeof ReportPriority) || 'MEDIUM'
        const status = (formData.get('status') as keyof typeof ReportStatus) || 'REPORTED'
        const downtimeHours = formData.get('downtimeHours') as string

        // Handle date - ONLY include if it has a value
        const dateRepairedStr = formData.get('dateRepaired') as string

        // Handle parts replaced
        const partsReplacedStr = formData.get('partsReplaced') as string
        const partsReplaced = partsReplacedStr
            ? partsReplacedStr.split(',').map(part => part.trim()).filter(part => part.length > 0)
            : []

        console.log('Form data received:', {
            equipmentId,
            locationId,
            reportedBy,
            issueDescription,
            dateRepairedStr
        })

        // Validate required fields
        if (!equipmentId || !locationId || !reportedBy || !issueDescription) {
            return NextResponse.json({
                error: 'Missing required fields: equipmentId, locationId, reportedBy, and issueDescription are required'
            }, { status: 400 })
        }

        // Verify equipment and location exist
        console.log('Verifying equipment exists...')
        const equipment = await prisma.equipment.findUnique({ where: { uid: equipmentId } })
        if (!equipment) {
            return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
        }

        console.log('Verifying location exists...')
        const location = await prisma.location.findUnique({ where: { uid: locationId } })
        if (!location) {
            return NextResponse.json({ error: 'Location not found' }, { status: 404 })
        }

        // Prepare report data - ONLY include fields that have values
        const createData: any = {
            equipmentId,
            locationId,
            reportedBy,
            issueDescription,
            partsReplaced,
            priority,
            status,
            attachmentUrls: []
        }

        // Only add optional fields if they have values
        if (repairedBy && repairedBy.trim()) {
            createData.repairedBy = repairedBy.trim()
        }

        if (remarks && remarks.trim()) {
            createData.remarks = remarks.trim()
        }

        if (inspectionDetails && inspectionDetails.trim()) {
            createData.inspectionDetails = inspectionDetails.trim()
        }

        if (actionTaken && actionTaken.trim()) {
            createData.actionTaken = actionTaken.trim()
        }

        if (downtimeHours && downtimeHours.trim()) {
            createData.downtimeHours = downtimeHours.trim()
        }

        // ONLY add dateRepaired if it has a valid value
        if (dateRepairedStr && dateRepairedStr.trim()) {
            try {
                createData.dateRepaired = new Date(dateRepairedStr)
                console.log('Date repaired set to:', createData.dateRepaired)
            } catch (dateError) {
                console.error('Invalid date format:', dateRepairedStr)
                return NextResponse.json({
                    error: 'Invalid date format for dateRepaired'
                }, { status: 400 })
            }
        }

        console.log('Creating maintenance report with data:', createData)

        // Create the maintenance report
        const report = await prisma.maintenanceEquipmentReport.create({
            data: createData
        })

        console.log('Report created successfully:', report.uid)

        // Handle attachment uploads (optional)
        const attachmentFiles: File[] = []
        let attachmentIndex = 0
        while (true) {
            const attachmentFile = formData.get(`attachment_${attachmentIndex}`) as File | null
            if (!attachmentFile || attachmentFile.size === 0) break
            attachmentFiles.push(attachmentFile)
            attachmentIndex++
        }

        // Upload attachments if any
        if (attachmentFiles.length > 0) {
            console.log(`Uploading ${attachmentFiles.length} attachments...`)
            try {
                const attachmentUrls: string[] = []
                for (let i = 0; i < attachmentFiles.length; i++) {
                    const attachmentUrl = await uploadFileToSupabase(
                        attachmentFiles[i],
                        equipmentId,
                        report.uid,
                        i + 1
                    )
                    attachmentUrls.push(attachmentUrl)
                }

                // Update report with attachment URLs
                await prisma.maintenanceEquipmentReport.update({
                    where: { uid: report.uid },
                    data: { attachmentUrls }
                })
                console.log('Attachments uploaded successfully')
            } catch (uploadError) {
                console.error('Attachment upload error:', uploadError)
                // Don't fail the entire request, just log the error
            }
        }

        // Fetch the complete report with relations
        console.log('Fetching complete report...')
        const result = await prisma.maintenanceEquipmentReport.findUnique({
            where: { uid: report.uid },
            include: {
                equipment: {
                    include: {
                        project: {
                            include: {
                                client: {
                                    include: { location: true }
                                }
                            }
                        }
                    }
                },
                location: true
            }
        })

        console.log('Maintenance report created successfully')
        return NextResponse.json(result)

    } catch (error) {
        console.error('Error creating maintenance report:', error)

        if (error instanceof Error) {
            return NextResponse.json({
                error: 'Failed to create maintenance report',
                details: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            error: 'Internal server error occurred while creating maintenance report'
        }, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
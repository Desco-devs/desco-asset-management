
import { NextResponse } from 'next/server'
import { PrismaClient, ReportStatus, ReportPriority } from '@prisma/client'
import { createServiceRoleClient } from '@/lib/supabase-server'

const prisma = new PrismaClient()
const supabase = createServiceRoleClient()


// Helper to extract storage path from a Supabase URL
export const extractFilePathFromUrl = (fileUrl: string): string | null => {
    try {
        const url = new URL(fileUrl)
        const parts = url.pathname.split('/').filter(Boolean)
        const idx = parts.findIndex(p => p === 'maintenance-reports')
        if (idx !== -1 && idx < parts.length - 1) {
            return parts.slice(idx + 1).join('/')
        }
        return null
    } catch (err) {
        console.error('extractFilePath error:', err)
        return null
    }
}

// Delete a file from Supabase storage
export const deleteFileFromSupabase = async (fileUrl: string, tag: string): Promise<void> => {
    const path = extractFilePathFromUrl(fileUrl)
    if (!path) throw new Error(`Cannot parse path for ${tag}`)
    const { error } = await supabase.storage.from('maintenance-reports').remove([path])
    if (error) throw error
}

// Upload a file to Supabase storage
export const uploadFileToSupabase = async (
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
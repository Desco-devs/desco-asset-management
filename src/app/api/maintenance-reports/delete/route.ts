// File: app/api/maintenance-reports/delete/route.ts

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { createServiceRoleClient } from '@/lib/supabase-server'

const prisma = new PrismaClient()
const supabase = createServiceRoleClient()

interface FileDeletionStatus {
  total: number
  successful: number
  failed: number
  errors: Array<{ file: string; error: string }>
  method: 'primary' | 'fallback' | 'none'
}

export async function DELETE(request: Request) {
    const fileDeletionStatus: FileDeletionStatus = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [],
      method: 'none'
    }

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
        const folder = `${equipmentId}/${reportId}`

        // First, get list of all files to delete
        let filesToDelete: string[] = []
        try {
          const { data: files, error: listError } = await supabase.storage
            .from('maintenance-reports')
            .list(folder)

          if (listError) {
            console.warn('Error listing files for deletion:', listError)
          } else if (files?.length) {
            filesToDelete = files
              .filter(f => f.name !== '.emptyFolderPlaceholder')
              .map(f => `${folder}/${f.name}`)
            fileDeletionStatus.total = filesToDelete.length
          }
        } catch (error) {
          console.warn('Exception while listing files:', error)
        }

        // Delete report record first (regardless of file deletion outcome)
        await prisma.maintenance_equipment_report.delete({ where: { id: reportId } })

        // If there are files to delete, attempt comprehensive deletion
        if (filesToDelete.length > 0) {
          // Primary method: Bulk deletion
          try {
            fileDeletionStatus.method = 'primary'
            const { error: bulkDeleteError } = await supabase.storage
              .from('maintenance-reports')
              .remove(filesToDelete)

            if (bulkDeleteError) {
              console.warn('Bulk deletion failed, attempting fallback:', bulkDeleteError)
              throw bulkDeleteError
            }

            fileDeletionStatus.successful = filesToDelete.length
            console.log(`✅ Successfully deleted ${fileDeletionStatus.successful} files using bulk deletion`)

          } catch {
            // Fallback method: Individual file deletion
            console.log('🔄 Attempting individual file deletion as fallback...')
            fileDeletionStatus.method = 'fallback'
            fileDeletionStatus.successful = 0
            fileDeletionStatus.failed = 0

            for (const filePath of filesToDelete) {
              try {
                const { error: deleteError } = await supabase.storage
                  .from('maintenance-reports')
                  .remove([filePath])

                if (deleteError) {
                  fileDeletionStatus.failed++
                  fileDeletionStatus.errors.push({
                    file: filePath,
                    error: deleteError.message
                  })
                  console.warn(`❌ Failed to delete ${filePath}:`, deleteError)
                } else {
                  fileDeletionStatus.successful++
                  console.log(`✅ Successfully deleted ${filePath}`)
                }
              } catch (error) {
                fileDeletionStatus.failed++
                fileDeletionStatus.errors.push({
                  file: filePath,
                  error: error instanceof Error ? error.message : 'Unknown error'
                })
                console.warn(`❌ Exception deleting ${filePath}:`, error)
              }
            }

            console.log(`🔄 Fallback deletion completed: ${fileDeletionStatus.successful}/${fileDeletionStatus.total} successful`)
          }

          // Attempt to remove the empty folder
          try {
            await supabase.storage
              .from('maintenance-reports')
              .remove([folder])
          } catch (folderError) {
            // Folder deletion is non-critical, just log
            console.warn('Could not remove empty folder:', folderError)
          }
        }

        const response = {
          message: 'Report deleted successfully',
          fileDeletionStatus: {
            attempted: fileDeletionStatus.total > 0,
            successful: fileDeletionStatus.failed === 0 && fileDeletionStatus.total > 0,
            error: fileDeletionStatus.failed > 0 
              ? `Failed to delete ${fileDeletionStatus.failed}/${fileDeletionStatus.total} files`
              : null,
            details: fileDeletionStatus
          }
        }

        console.log('🗑️ Maintenance report deletion completed:', {
          reportId,
          folder,
          ...fileDeletionStatus
        })

        return NextResponse.json(response)

    } catch (err) {
        console.error('DELETE error:', err)
        
        // Enhanced error response
        const errorResponse = {
          error: 'Internal server error',
          fileDeletionStatus: {
            attempted: fileDeletionStatus.total > 0,
            successful: false,
            error: err instanceof Error ? err.message : 'Unknown error occurred',
            details: fileDeletionStatus
          }
        }

        return NextResponse.json(errorResponse, { status: 500 })
    } finally {
        await prisma.$disconnect()
    }
}
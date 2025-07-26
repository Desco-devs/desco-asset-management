import { NextRequest, NextResponse } from 'next/server'
import { Prisma, status as EquipmentStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'

/**
 * PATCH /api/equipments/[uid]/overview
 * Updates basic equipment details (overview tab fields only)
 */
export const PATCH = withResourcePermission(
  'equipment',
  'update',
  async (
    request: NextRequest,
    user: AuthenticatedUser,
    context: { params: Promise<{ uid: string }> }
  ) => {
    try {
      const { uid } = await context.params
      const body = await request.json()

      // Check if equipment exists
      const existing = await prisma.equipment.findUnique({
        where: { id: uid },
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
      })

      if (!existing) {
        return NextResponse.json({ error: 'Equipment not found' }, { status: 404 })
      }

      // Build update payload for overview fields only
      const updateData: Prisma.equipmentUpdateInput = {}

      // Basic equipment information
      if (body.brand !== undefined) updateData.brand = body.brand
      if (body.model !== undefined) updateData.model = body.model
      if (body.type !== undefined) updateData.type = body.type
      if (body.owner !== undefined) updateData.owner = body.owner
      if (body.plateNumber !== undefined) updateData.plate_number = body.plateNumber
      if (body.status !== undefined) {
        // Validate status enum
        if (Object.values(EquipmentStatus).includes(body.status)) {
          updateData.status = body.status
        } else {
          return NextResponse.json(
            { error: 'Invalid status value' },
            { status: 400 }
          )
        }
      }
      if (body.remarks !== undefined) updateData.remarks = body.remarks
      if (body.before !== undefined) {
        updateData.before = body.before ? parseInt(body.before.toString()) : null
      }

      // Handle project assignment
      if (body.projectId !== undefined) {
        // Verify project exists
        const projectExists = await prisma.project.findUnique({
          where: { id: body.projectId }
        })
        if (!projectExists) {
          return NextResponse.json(
            { error: 'Project not found' },
            { status: 400 }
          )
        }
        updateData.project = {
          connect: { id: body.projectId }
        }
      }

      // Handle dates
      if (body.inspectionDate !== undefined) {
        updateData.inspection_date = body.inspectionDate ? new Date(body.inspectionDate) : null
      }
      if (body.insuranceExpirationDate !== undefined) {
        updateData.insurance_expiration_date = body.insuranceExpirationDate ? new Date(body.insuranceExpirationDate) : null
      }

      // Update the equipment
      const updatedEquipment = await prisma.equipment.update({
        where: { id: uid },
        data: updateData,
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
      })

      // Transform response to match the expected interface format
      const transformedEquipment = {
        uid: updatedEquipment.id,
        brand: updatedEquipment.brand,
        model: updatedEquipment.model,
        type: updatedEquipment.type,
        insuranceExpirationDate: updatedEquipment.insurance_expiration_date?.toISOString() || null,
        before: updatedEquipment.before || null,
        status: updatedEquipment.status,
        remarks: updatedEquipment.remarks || null,
        owner: updatedEquipment.owner,
        inspectionDate: updatedEquipment.inspection_date?.toISOString() || null,
        plateNumber: updatedEquipment.plate_number || null,
        // Include existing file URLs (not modified in overview tab)
        image_url: updatedEquipment.image_url || null,
        originalReceiptUrl: updatedEquipment.original_receipt_url || null,
        equipmentRegistrationUrl: updatedEquipment.equipment_registration_url || null,
        thirdpartyInspectionImage: updatedEquipment.thirdparty_inspection_image || null,
        pgpcInspectionImage: updatedEquipment.pgpc_inspection_image || null,
        equipmentParts: updatedEquipment.equipment_parts && updatedEquipment.equipment_parts.length > 0 
          ? (() => {
              try {
                const rawParts = updatedEquipment.equipment_parts[0];
                
                // Check if it's a URL (legacy format)
                if (typeof rawParts === 'string' && rawParts.startsWith('http')) {
                  // Legacy format: convert URL array to modern format
                  return {
                    rootFiles: updatedEquipment.equipment_parts.map((url, index) => ({
                      id: `legacy_${index}`,
                      name: url.split('/').pop() || `image_${index}`,
                      preview: url
                    })),
                    folders: []
                  };
                }
                
                // Try to parse as JSON (modern format)
                return JSON.parse(rawParts);
              } catch (error) {
                // If parsing fails but we have data, treat as legacy URL format
                if (updatedEquipment.equipment_parts.length > 0) {
                  return {
                    rootFiles: updatedEquipment.equipment_parts.map((url, index) => ({
                      id: `legacy_${index}`,
                      name: url.split('/').pop() || `image_${index}`,
                      preview: url
                    })),
                    folders: []
                  };
                }
                return { rootFiles: [], folders: [] };
              }
            })()
          : { rootFiles: [], folders: [] },
        project: {
          uid: updatedEquipment.project.id,
          name: updatedEquipment.project.name,
          client: {
            uid: updatedEquipment.project.client.id,
            name: updatedEquipment.project.client.name,
            location: {
              uid: updatedEquipment.project.client.location.id,
              address: updatedEquipment.project.client.location.address,
            },
          },
        },
      }

      return NextResponse.json(transformedEquipment)
    } catch (error) {
      console.error('Equipment overview update error:', error)
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }
)
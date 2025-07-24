// app/api/equipments/getall/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const equipments = await prisma.equipment.findMany({
      include: {
        project: {
          include: {
            client: {
              include: {
                location: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Transform equipment data to match expected interface
    const transformedEquipments = equipments.map(equipment => ({
      id: equipment.id,
      brand: equipment.brand,
      model: equipment.model,
      type: equipment.type,
      insurance_expiration_date: equipment.insurance_expiration_date,
      before: equipment.before,
      status: equipment.status,
      remarks: equipment.remarks,
      owner: equipment.owner,
      image_url: equipment.image_url,
      inspection_date: equipment.inspection_date,
      plate_number: equipment.plate_number,
      original_receipt_url: equipment.original_receipt_url,
      equipment_registration_url: equipment.equipment_registration_url,
      thirdparty_inspection_image: equipment.thirdparty_inspection_image,
      pgpc_inspection_image: equipment.pgpc_inspection_image,
      // Fix equipment_parts handling - support both legacy URL format and modern JSON format
      equipment_parts: equipment.equipment_parts && equipment.equipment_parts.length > 0 
        ? (() => {
            try {
              const rawParts = equipment.equipment_parts[0];
              
              // Check if it's a URL (legacy format)
              if (typeof rawParts === 'string' && rawParts.startsWith('http')) {
                // Legacy format: convert URL array to modern format
                return {
                  rootFiles: equipment.equipment_parts.map((url, index) => ({
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
              console.warn('Failed to parse equipment_parts for equipment', equipment.id, ':', error);
              // If parsing fails but we have data, treat as legacy URL format
              if (equipment.equipment_parts.length > 0) {
                return {
                  rootFiles: equipment.equipment_parts.map((url, index) => ({
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
        : undefined,
      created_at: equipment.created_at,
      updated_at: equipment.updated_at,
      created_by: equipment.created_by,
      project_id: equipment.project_id,
      project: equipment.project
    }));

    return NextResponse.json(transformedEquipments);
  } catch (error) {
    console.error('Error fetching equipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipments' },
      { status: 500 }
    );
  }
}



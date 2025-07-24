import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Equipment } from '@/types/equipment';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    const [equipmentData, totalCount] = await Promise.all([
      prisma.equipment.findMany({
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
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.equipment.count(),
    ]);

    // Serialize the equipment data to match frontend types
    const serializedEquipment: Equipment[] = equipmentData.map((item) => ({
      uid: item.id,
      brand: item.brand,
      model: item.model,
      type: item.type,
      insuranceExpirationDate:
        item.insurance_expiration_date?.toISOString() || "",
      before: item.before || undefined,
      status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
      remarks: item.remarks || undefined,
      owner: item.owner,
      image_url: item.image_url || undefined,
      inspectionDate: item.inspection_date?.toISOString() || undefined,
      plateNumber: item.plate_number || undefined,
      originalReceiptUrl: item.original_receipt_url || undefined,
      equipmentRegistrationUrl: item.equipment_registration_url || undefined,
      thirdpartyInspectionImage: item.thirdparty_inspection_image || undefined,
      pgpcInspectionImage: item.pgpc_inspection_image || undefined,
      equipmentParts: item.equipment_parts && item.equipment_parts.length > 0 
        ? (() => {
            try {
              const rawParts = item.equipment_parts[0];
              
              // Check if it's a URL (legacy format)
              if (typeof rawParts === 'string' && rawParts.startsWith('http')) {
                // Legacy format: convert URL array to modern format
                return {
                  rootFiles: item.equipment_parts.map((url, index) => ({
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
              console.warn('Failed to parse equipment_parts for equipment', item.id, ':', error);
              // If parsing fails but we have data, treat as legacy URL format
              if (item.equipment_parts.length > 0) {
                return {
                  rootFiles: item.equipment_parts.map((url, index) => ({
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
      project: {
        uid: item.project.id,
        name: item.project.name,
        client: {
          uid: item.project.client.id,
          name: item.project.client.name,
          location: {
            uid: item.project.client.location.id,
            address: item.project.client.location.address,
          },
        },
      },
    }));

    return NextResponse.json({
      data: serializedEquipment,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error('Error fetching paginated equipments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch equipments' },
      { status: 500 }
    );
  }
}
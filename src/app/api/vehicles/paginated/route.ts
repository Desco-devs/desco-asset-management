import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    const [vehicles, totalCount] = await Promise.all([
      prisma.vehicles.findMany({
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
      prisma.vehicles.count(),
    ]);

    // Format vehicles to match the expected interface
    const formattedVehicles = vehicles.map((vehicle) => ({
      uid: vehicle.id,
      brand: vehicle.brand,
      model: vehicle.model,
      type: vehicle.type,
      plateNumber: vehicle.plate_number,
      inspectionDate: vehicle.inspection_date?.toISOString(),
      before: vehicle.before,
      expiryDate: vehicle.expiry_date?.toISOString(),
      status: vehicle.status,
      remarks: vehicle.remarks,
      owner: vehicle.owner,
      frontImgUrl: vehicle.front_img_url,
      backImgUrl: vehicle.back_img_url,
      side1ImgUrl: vehicle.side1_img_url,
      side2ImgUrl: vehicle.side2_img_url,
      originalReceiptUrl: vehicle.original_receipt_url,
      carRegistrationUrl: vehicle.car_registration_url,
      project: {
        uid: vehicle.project.id,
        name: vehicle.project.name,
        client: {
          uid: vehicle.project.client.id,
          name: vehicle.project.client.name,
          location: {
            uid: vehicle.project.client.location.id,
            address: vehicle.project.client.location.address,
          },
        },
      },
    }));

    return NextResponse.json({
      data: formattedVehicles,
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
    console.error('Error fetching paginated vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}
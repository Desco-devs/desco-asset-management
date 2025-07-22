import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth';
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile from database
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        user_status: true,
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    if (userProfile.user_status !== 'ACTIVE') {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    // Fetch single vehicle with relations
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: {
              include: {
                location: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            username: true,
            full_name: true
          }
        }
      }
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json(vehicle);

  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withResourcePermission('vehicles', 'update', async (req: NextRequest, _user: AuthenticatedUser) => {
    try {
      const { id } = await params;
      // Parse request body
      const body = await req.json();

      // Check if vehicle exists
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { id }
      });

      if (!existingVehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }

      // Update the vehicle
      const updatedVehicle = await prisma.vehicle.update({
        where: { id },
        data: body,
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              full_name: true
            }
          }
        }
      });

      return NextResponse.json(updatedVehicle);

    } catch (error) {
      console.error("Error updating vehicle:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  })(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withResourcePermission('vehicles', 'delete', async (req: NextRequest, _user: AuthenticatedUser) => {
    try {
      const { id } = await params;
      // Check if vehicle exists
      const existingVehicle = await prisma.vehicle.findUnique({
        where: { id }
      });

      if (!existingVehicle) {
        return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
      }

      // First, delete all related maintenance reports for this vehicle
      await prisma.maintenance_vehicle_report.deleteMany({
        where: { vehicle_id: id }
      });

      // Then delete the vehicle
      await prisma.vehicle.delete({
        where: { id }
      });

      return NextResponse.json({ 
        message: "Vehicle deleted successfully",
        id 
      });

    } catch (error) {
      console.error("Error deleting vehicle:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  })(request);
}
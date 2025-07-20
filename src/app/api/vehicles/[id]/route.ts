import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
      where: { id: params.id },
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
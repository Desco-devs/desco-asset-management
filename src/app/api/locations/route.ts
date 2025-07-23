import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const locations = await prisma.location.findMany({
      select: {
        id: true,
        address: true,
        created_at: true
      },
      orderBy: {
        address: 'asc'
      }
    });

    return NextResponse.json(locations);

  } catch (error: unknown) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
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
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    if (userProfile.user_status !== 'ACTIVE') {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      );
    }

    // Check if user has permission to create locations (ADMIN or SUPERADMIN)
    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Insufficient permissions to create locations" },
        { status: 403 }
      );
    }

    const { address } = await request.json();

    if (!address || typeof address !== "string" || !address.trim()) {
      return NextResponse.json(
        { error: "Address is required and must be a non-empty string" },
        { status: 400 }
      );
    }

    const newLocation = await prisma.location.create({
      data: {
        address: address.trim(),
        created_by: userProfile.id,
      },
      include: { 
        clients: true,
        user: {
          select: {
            id: true,
            full_name: true,
            username: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: newLocation,
    });

  } catch (error: unknown) {
    // Check if it's a validation error that shouldn't be logged
    const isValidationError = error instanceof Error && 'code' in error && error.code === "P2002"
    
    if (!isValidationError) {
      // Only log actual server errors, not validation errors
      console.error("Error creating location:", error);
    }
    
    if (error instanceof Error && 'code' in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Location with this address already exists" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create location" },
      { status: 500 }
    );
  }
}
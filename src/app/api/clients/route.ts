import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const location_id = searchParams.get('location_id');

    // Build query conditions
    const whereCondition = location_id ? { location_id } : {};

    const clients = await prisma.client.findMany({
      where: whereCondition,
      include: {
        location: true,
        user: {
          select: {
            id: true,
            full_name: true,
            username: true
          }
        },
        projects: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    return NextResponse.json(clients);

  } catch (error: unknown) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
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
        username: true,
        full_name: true,
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

    // Check if user has permission to create clients (ADMIN or SUPERADMIN)
    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      return NextResponse.json(
        { error: "Insufficient permissions to create clients" },
        { status: 403 }
      );
    }

    const { name, locationId } = await request.json();

    // Validate inputs
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Client name is required" },
        { status: 400 }
      );
    }

    if (!locationId?.trim()) {
      return NextResponse.json(
        { error: "Location is required" },
        { status: 400 }
      );
    }

    // Check if location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    });

    if (!location) {
      return NextResponse.json(
        { error: "Selected location does not exist" },
        { status: 400 }
      );
    }

    // Create the client
    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        location_id: locationId,
        created_by: userProfile.id,
      },
      include: {
        location: true,
        user: {
          select: {
            id: true,
            full_name: true,
            username: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      client,
      message: "Client created successfully"
    });

  } catch (error: unknown) {
    // Check if it's a validation error that shouldn't be logged
    const isValidationError = error instanceof Error && 'code' in error && error.code === "P2002"
    
    if (!isValidationError) {
      // Only log actual server errors, not validation errors
      console.error("Error creating client:", error);
    }
    
    if (error instanceof Error && 'code' in error && error.code === "P2002") {
      return NextResponse.json(
        { error: "Client with this name already exists in this location" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create client" },
      { status: 500 }
    );
  }
}
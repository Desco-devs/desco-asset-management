import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// GET /api/locations/[locationId] - Get clients for a specific location
export async function GET(
    _: Request,
    context: { params: Promise<{ locationId: string }> }
) {
    try {
        const { locationId } = await context.params

        const clients = await prisma.client.findMany({
            where: { location_id: locationId },
            orderBy: { created_at: "desc" },
        })
        return NextResponse.json(clients)
    } catch (error) {
        console.error("GET /locations/[locationId]/clients error:", error)
        return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 })
    }
}

// PUT /api/locations/[locationId] - Update a location
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ locationId: string }> }
) {
    try {
        const { locationId } = await context.params;
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

        // Check if user has permission to update locations (ADMIN or SUPERADMIN)
        if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: "Insufficient permissions to update locations" },
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

        // Check if location exists
        const existingLocation = await prisma.location.findUnique({
            where: { id: locationId }
        });

        if (!existingLocation) {
            return NextResponse.json(
                { error: "Location not found" },
                { status: 404 }
            );
        }

        const updatedLocation = await prisma.location.update({
            where: { id: locationId },
            data: {
                address: address.trim(),
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
            data: updatedLocation,
        });

    } catch (error: unknown) {
        // Check if it's a validation error that shouldn't be logged
        const isValidationError = error instanceof Error && 'code' in error && error.code === "P2002"
        
        if (!isValidationError) {
            // Only log actual server errors, not validation errors
            console.error("Error updating location:", error);
        }
        
        if (error instanceof Error && 'code' in error && error.code === "P2002") {
            return NextResponse.json(
                { error: "Location with this address already exists" },
                { status: 409 }
            );
        }
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update location" },
            { status: 500 }
        );
    }
}

// DELETE /api/locations/[locationId] - Delete a location
export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ locationId: string }> }
) {
    try {
        const { locationId } = await context.params;
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

        // Check if user has permission to delete locations (ADMIN or SUPERADMIN)
        if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: "Insufficient permissions to delete locations" },
                { status: 403 }
            );
        }

        // Check if location exists
        const existingLocation = await prisma.location.findUnique({
            where: { id: locationId },
            include: {
                clients: true
            }
        });

        if (!existingLocation) {
            return NextResponse.json(
                { error: "Location not found" },
                { status: 404 }
            );
        }

        // Check if location has clients
        if (existingLocation.clients && existingLocation.clients.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete location with existing clients. Please move or delete clients first." },
                { status: 400 }
            );
        }

        await prisma.location.delete({
            where: { id: locationId }
        });

        return NextResponse.json({
            success: true,
            message: "Location deleted successfully"
        });

    } catch (error: unknown) {
        // Only log actual server errors - deletion errors are usually not validation issues
        console.error("Error deleting location:", error);
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete location" },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// GET /api/clients/[clientId] - Get projects for a client OR get specific client details
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await context.params;
        const { searchParams } = new URL(request.url);
        const getProjects = searchParams.get('projects') === 'true';

        if (getProjects) {
            // Return projects for this client (existing behavior)
            const projects = await prisma.project.findMany({
                where: { client_id: clientId },
                orderBy: { created_at: "desc" },
                include: { vehicles: true, equipments: true },
            });
            return NextResponse.json(projects);
        } else {
            // Return client details
            const client = await prisma.client.findUnique({
                where: { id: clientId },
                include: { 
                    location: true, 
                    projects: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    user: {
                        select: {
                            id: true,
                            full_name: true,
                            username: true
                        }
                    }
                },
            });

            if (!client) {
                return NextResponse.json({ error: 'Client not found' }, { status: 404 });
            }

            return NextResponse.json(client);
        }
    } catch (error) {
        console.error("GET /clients/[clientId] error:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}

// PUT /api/clients/[clientId] - Update a client
export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await context.params;
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

        // Check if user has permission to update clients (ADMIN or SUPERADMIN)
        if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: "Insufficient permissions to update clients" },
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

        // Check if client exists
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId }
        });

        if (!existingClient) {
            return NextResponse.json(
                { error: "Client not found" },
                { status: 404 }
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

        const updatedClient = await prisma.client.update({
            where: { id: clientId },
            data: { 
                name: name.trim(), 
                location_id: locationId 
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
            },
        });

        return NextResponse.json({
            success: true,
            data: updatedClient,
        });

    } catch (error: unknown) {
        // Check if it's a validation error that shouldn't be logged
        const isValidationError = error instanceof Error && 'code' in error && error.code === "P2002"
        
        if (!isValidationError) {
            // Only log actual server errors, not validation errors
            console.error("Error updating client:", error);
        }
        
        if (error instanceof Error && 'code' in error && error.code === "P2002") {
            return NextResponse.json(
                { error: "Client with this name already exists in this location" },
                { status: 409 }
            );
        }
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to update client" },
            { status: 500 }
        );
    }
}

// DELETE /api/clients/[clientId] - Delete a client
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ clientId: string }> }
) {
    try {
        const { clientId } = await context.params;
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

        // Check if user has permission to delete clients (ADMIN or SUPERADMIN)
        if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
            return NextResponse.json(
                { error: "Insufficient permissions to delete clients" },
                { status: 403 }
            );
        }

        // Check if client exists
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                projects: true
            }
        });

        if (!existingClient) {
            return NextResponse.json(
                { error: "Client not found" },
                { status: 404 }
            );
        }

        // Check if client has projects
        if (existingClient.projects && existingClient.projects.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete client with existing projects. Please move or delete projects first." },
                { status: 400 }
            );
        }

        await prisma.client.delete({
            where: { id: clientId }
        });

        return NextResponse.json({
            success: true,
            message: "Client deleted successfully"
        });

    } catch (error: unknown) {
        // Check if it's a validation error that shouldn't be logged
        const isValidationError = error instanceof Error && 'code' in error && error.code === 'P2025'
        
        if (!isValidationError) {
            // Only log actual server errors, not validation errors
            console.error("Error deleting client:", error);
        }
        
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
            return NextResponse.json(
                { error: "Client not found" },
                { status: 404 }
            );
        }
        
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to delete client" },
            { status: 500 }
        );
    }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
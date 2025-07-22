// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'
import { getResourcePermissions } from '@/lib/auth/utils'
import { prisma } from "@/lib/prisma";

// GET /api/projects - View all projects with proper role-based access control
export const GET = withResourcePermission('projects', 'view', async (request: NextRequest, _user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const queryOptions: any = {
      include: { 
        client: {
          include: { location: true }
        }, 
        equipments: true, 
        vehicles: true 
      },
      orderBy: { created_at: 'desc' }
    };

    // Filter by clientId if provided
    if (clientId) {
      queryOptions.where = { client_id: clientId };
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }
    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    const projects = await prisma.project.findMany(queryOptions);
    const total = await prisma.project.count(clientId ? { where: { client_id: clientId } } : undefined);

    // Get user permissions for this resource
    const permissions = getResourcePermissions(_user.role, 'projects')

    return NextResponse.json({
      data: projects,
      total,
      user_role: _user.role,
      permissions: {
        can_create: permissions.canCreate,
        can_update: permissions.canUpdate,
        can_delete: permissions.canDelete
      }
    });
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
})

// POST /api/projects - Create a new project
export const POST = withResourcePermission('projects', 'create', async (request: NextRequest, _user: AuthenticatedUser) => {
  try {
    const { name, clientId } = await request.json();
    
    // Input validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required and must be a non-empty string' }, { status: 400 })
    }
    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 })
    }

    // Verify client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const project = await prisma.project.create({
      data: { name: name.trim(), client_id: clientId },
      include: { 
        client: {
          include: { location: true }
        }, 
        equipments: true, 
        vehicles: true 
      },
    });
    
    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creating project:", error);
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
      return NextResponse.json({ error: 'Project with this name already exists for this client' }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
})

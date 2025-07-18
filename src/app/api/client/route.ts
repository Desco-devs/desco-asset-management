import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'
import { getResourcePermissions } from '@/lib/auth/utils'

const prisma = new PrismaClient()

// GET /api/client - View all clients with proper role-based access control
export const GET = withResourcePermission('clients', 'view', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const locationId = searchParams.get('locationId')

    const queryOptions: any = {
      include: { location: true, projects: true },
      orderBy: { created_at: 'desc' },
    }

    // Add filters if provided
    if (locationId) {
      queryOptions.where = { location_id: locationId }
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }
    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    const clients = await prisma.client.findMany(queryOptions)
    const countWhere = locationId ? { where: { location_id: locationId } } : undefined
    const total = await prisma.client.count(countWhere)

    // Get user permissions for this resource
    const permissions = getResourcePermissions(user.role, 'clients')

    return NextResponse.json({
      data: clients,
      total,
      user_role: user.role,
      permissions: {
        can_create: permissions.canCreate,
        can_update: permissions.canUpdate,
        can_delete: permissions.canDelete
      }
    })
  } catch (error) {
    console.error('Error fetching clients:', error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
})

// POST /api/client - Create a new client
export const POST = withResourcePermission('clients', 'create', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { name, locationId } = await request.json()
    
    // Input validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required and must be a non-empty string' }, { status: 400 })
    }
    if (!locationId || typeof locationId !== 'string') {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 })
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId }
    })
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    const newClient = await prisma.client.create({
      data: {
        name: name.trim(),
        location_id: locationId
      },
      include: { location: true, projects: true }
    })

    return NextResponse.json(newClient, { status: 201 })
  } catch (error: any) {
    console.error('Error creating client:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Client with this name already exists in this location' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
})

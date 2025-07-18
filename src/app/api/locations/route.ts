import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'
import { getResourcePermissions } from '@/lib/auth/utils'

const prisma = new PrismaClient()

function isPrismaError(err: unknown): err is { code?: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as any).code === 'string'
  )
}

// Define a common path to revalidate whenever data changes
const REVALIDATE_PATH = '/projects'

// GET /api/locations - View all locations with proper role-based access control
export const GET = withResourcePermission('locations', 'view', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const queryOptions: any = {
      include: { clients: true },
      orderBy: { created_at: 'desc' },
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }
    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    const locations = await prisma.location.findMany(queryOptions)
    const total = await prisma.location.count()

    // Get user permissions for this resource
    const permissions = getResourcePermissions(user.role, 'locations')

    return NextResponse.json({
      data: locations,
      total,
      user_role: user.role,
      permissions: {
        can_create: permissions.canCreate,
        can_update: permissions.canUpdate,
        can_delete: permissions.canDelete
      }
    })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})

// POST /api/locations - Create a new location
export const POST = withResourcePermission('locations', 'create', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { address } = await request.json()
    
    // Input validation
    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ error: 'Address is required and must be a non-empty string' }, { status: 400 })
    }

    const newLocation = await prisma.location.create({
      data: {
        address: address.trim(),
      },
      include: { clients: true }
    })

    // Revalidate the locations path to update clients in real-time
    revalidatePath(REVALIDATE_PATH)

    return NextResponse.json(newLocation, { status: 201 })
  } catch (error: any) {
    console.error('Error creating location:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Location with this address already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})

// PUT /api/locations - Update a location
export const PUT = withResourcePermission('locations', 'update', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { id, address } = await request.json()
    
    // Input validation
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'ID is required and must be a non-empty string' }, { status: 400 })
    }
    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ error: 'Address is required and must be a non-empty string' }, { status: 400 })
    }

    const updatedLocation = await prisma.location.update({
      where: { id: id },
      data: { address: address.trim() },
      include: { clients: true }
    })

    // Revalidate the locations path to update clients in real-time
    revalidatePath(REVALIDATE_PATH)

    return NextResponse.json(updatedLocation)
  } catch (error: unknown) {
    console.error('Error updating location:', error)

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})

// DELETE /api/locations - Delete a location
export const DELETE = withResourcePermission('locations', 'delete', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { id } = await request.json()
    
    // Input validation
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'ID is required and must be a non-empty string' }, { status: 400 })
    }

    // Check if location has clients before deletion
    const locationWithClients = await prisma.location.findUnique({
      where: { id: id },
      include: { clients: true }
    })

    if (!locationWithClients) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    if (locationWithClients.clients.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete location with existing clients. Please remove all clients first.' 
      }, { status: 400 })
    }

    await prisma.location.delete({
      where: { id: id },
    })

    // Revalidate the locations path to update clients in real-time
    revalidatePath(REVALIDATE_PATH)

    return NextResponse.json({ message: 'Location deleted successfully' })
  } catch (error: unknown) {
    console.error('Error deleting location:', error)

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
})
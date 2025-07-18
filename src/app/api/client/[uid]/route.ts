import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/client/[uid]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> } 
) {
  const { uid } = await params

  try {
    const client = await prisma.client.findUnique({
      where: { id: uid },
      include: {location: true, projects: true, },
    })
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }
    return NextResponse.json(client)
  } catch (err) {
    console.error('GET /client/[uid] error:', err)
    return NextResponse.json({ error: 'Failed to fetch client' }, { status: 500 })
  }
}

// PUT /api/client/[uid]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params
  const { name, locationId } = await request.json()

  if (!name || !locationId) {
    return NextResponse.json(
      { error: 'Missing name or locationId' },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.client.update({
      where: { id: uid },
      data: { name, location_id: locationId },
      include: { location: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    console.error('PUT /client/[uid] error:', err)
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
  }
}

// DELETE /api/client/[uid]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const { uid } = await params

  try {
    const deleted = await prisma.client.delete({ where: { id: uid } })
    return NextResponse.json(deleted)
  } catch (err) {
    console.error('DELETE /client/[uid] error:', err)
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 })
  }
}

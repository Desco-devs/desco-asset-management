import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/client
export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: { location: true, projects: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(clients)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 })
  }
}

// POST /api/client
export async function POST(request: Request) {
  const { name, locationId } = await request.json()
  if (!name || !locationId) {
    return NextResponse.json({ error: 'Missing name or locationId' }, { status: 400 })
  }

  try {
    const newClient = await prisma.client.create({ data: { name, locationId } })
    return NextResponse.json(newClient, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { revalidatePath } from 'next/cache'

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

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(locations)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { address } = await request.json()
    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    const newLocation = await prisma.location.create({
      data: {
        address: address.trim(),
      },
    })

    // Revalidate the locations path to update clients in real-time
    revalidatePath(REVALIDATE_PATH)

    return NextResponse.json(newLocation, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { id, address } = await request.json()
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'Invalid or missing id' }, { status: 400 })
    }
    if (!address || typeof address !== 'string' || !address.trim()) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 })
    }

    const updatedLocation = await prisma.location.update({
      where: { uid: id },
      data: { address: address.trim() },
    })

    // Revalidate the locations path to update clients in real-time
    revalidatePath(REVALIDATE_PATH)

    return NextResponse.json(updatedLocation)
  } catch (error: unknown) {
    console.error(error)

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'Invalid or missing id' }, { status: 400 })
    }

    await prisma.location.delete({
      where: { uid: id },
    })

    // Revalidate the locations path to update clients in real-time
    revalidatePath(REVALIDATE_PATH)

    return NextResponse.json({ message: 'Location deleted successfully' })
  } catch (error: unknown) {
    console.error(error)

    if (isPrismaError(error) && error.code === 'P2025') {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
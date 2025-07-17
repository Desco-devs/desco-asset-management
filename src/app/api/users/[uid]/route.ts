import { PrismaClient, Permission, user_status as UserStatusEnum } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

// Type for user_status values
type UserStatus = keyof typeof UserStatusEnum

// Input type for update
interface UpdateUserBody {
  username?: string
  full_name?: string
  phone?: string | null
  permissions?: Permission[]
  user_status?: UserStatus
}

const prisma = new PrismaClient()

// GET: Retrieve user by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        user_profile: true,
        permissions: true,
        user_status: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params

  try {
    const body = (await request.json()) as UpdateUserBody
    const { username, full_name, phone, permissions, user_status } = body

    // Validate input types
    if (username && typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }
    if (full_name && typeof full_name !== 'string') {
      return NextResponse.json({ error: 'Invalid full_name' }, { status: 400 })
    }
    if (phone && typeof phone !== 'string') {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }
    if (permissions && !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Invalid permissions' }, { status: 400 })
    }
    if (
      user_status &&
      !Object.values(UserStatusEnum).includes(user_status as UserStatus)
    ) {
      return NextResponse.json({ error: 'Invalid user status' }, { status: 400 })
    }

    const updateData: UpdateUserBody = {}

    if (username) updateData.username = username
    if (full_name) updateData.full_name = full_name
    if (phone !== undefined) updateData.phone = phone
    if (permissions) updateData.permissions = permissions
    if (user_status) updateData.user_status = user_status

    const user = await prisma.user.update({
      where: { id: uid },
      data: updateData,
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        permissions: true,
        user_status: true,
        created_at: true,
        updated_at: true,
      },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error('Error updating user:', error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
    }
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params

  try {
    await prisma.user.delete({
      where: { id: uid },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting user:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

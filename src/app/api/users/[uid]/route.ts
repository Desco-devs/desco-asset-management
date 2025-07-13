import { PrismaClient, Permission, userStatus as UserStatusEnum } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'

// Type for userStatus values
type UserStatus = keyof typeof UserStatusEnum

// Input type for update
interface UpdateUserBody {
  username?: string
  password?: string
  fullname?: string
  phone?: string | null
  permissions?: Permission[]
  userStatus?: UserStatus
}

const prisma = new PrismaClient()

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params

  try {
    const body = (await request.json()) as UpdateUserBody
    const { username, password, fullname, phone, permissions, userStatus } = body

    // Validate input types
    if (username && typeof username !== 'string') {
      return NextResponse.json({ error: 'Invalid username' }, { status: 400 })
    }
    if (password && typeof password !== 'string') {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 })
    }
    if (fullname && typeof fullname !== 'string') {
      return NextResponse.json({ error: 'Invalid fullname' }, { status: 400 })
    }
    if (phone && typeof phone !== 'string') {
      return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    }
    if (permissions && !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Invalid permissions' }, { status: 400 })
    }
    if (
      userStatus &&
      !Object.values(UserStatusEnum).includes(userStatus as UserStatus)
    ) {
      return NextResponse.json({ error: 'Invalid user status' }, { status: 400 })
    }

    const updateData: UpdateUserBody = {}

    if (username) updateData.username = username
    if (password) updateData.password = await bcrypt.hash(password, 10)
    if (fullname) updateData.fullname = fullname
    if (phone !== undefined) updateData.phone = phone
    if (permissions) updateData.permissions = permissions
    if (userStatus) updateData.userStatus = userStatus

    const user = await prisma.user.update({
      where: { uid },
      data: updateData,
      select: {
        uid: true,
        username: true,
        fullname: true,
        phone: true,
        permissions: true,
        userStatus: true,
        createdAt: true,
        updatedAt: true,
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
      where: { uid },
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

import { PrismaClient, Role, user_status as UserStatusEnum } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'

// Type for user_status values
type UserStatus = keyof typeof UserStatusEnum

// Input type for update
interface UpdateUserBody {
  username?: string
  full_name?: string
  phone?: string | null
  user_profile?: string | null
  role?: Role
  user_status?: UserStatus
}

const prisma = new PrismaClient()

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// GET: Retrieve user by ID
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  const { uid } = await context.params
  
  // Validate UUID format
  if (!isValidUUID(uid)) {
    return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
  }
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        user_profile: true,
        role: true,
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
  return withResourcePermission('users', 'update', async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const { uid } = await context.params
      
      // Validate UUID format
      if (!isValidUUID(uid)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
      
      const body = (await req.json()) as UpdateUserBody
      const { username, full_name, phone, user_profile, role, user_status } = body

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
      if (user_profile && typeof user_profile !== 'string') {
        return NextResponse.json({ error: 'Invalid user_profile' }, { status: 400 })
      }
      if (role && !Object.values(Role).includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
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
      if (user_profile !== undefined) updateData.user_profile = user_profile
      if (role) updateData.role = role
      if (user_status) updateData.user_status = user_status

      const updatedUser = await prisma.user.update({
        where: { id: uid },
        data: updateData,
        select: {
          id: true,
          username: true,
          full_name: true,
          phone: true,
          user_profile: true,
          role: true,
          user_status: true,
          created_at: true,
          updated_at: true,
        },
      })

      return NextResponse.json(updatedUser)
    } catch (error: unknown) {
      // Check if it's a validation error that shouldn't be logged
      const isValidationError = error instanceof Error && 'code' in error && 
                               (error.code === 'P2002' || error.code === 'P2025')
      
      if (!isValidationError) {
        // Only log actual server errors, not validation errors
        console.error('Error updating user:', error)
      }
      
      if (error instanceof Error && 'code' in error && error.code === 'P2002') {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  return withResourcePermission('users', 'delete', async (req: NextRequest, user: AuthenticatedUser) => {
    try {
      const { uid } = await context.params
      
      // Validate UUID format
      if (!isValidUUID(uid)) {
        return NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }

      // Prevent self-deletion
      if (uid === user.id) {
        return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 403 })
      }

      // Get the target user to check their role
      const targetUser = await prisma.user.findUnique({
        where: { id: uid },
        select: { id: true, role: true, full_name: true }
      })

      if (!targetUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Only SUPERADMIN can delete ADMIN accounts
      if (targetUser.role === 'ADMIN' && user.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Only Super Admin can delete Admin accounts' }, { status: 403 })
      }

      // Delete from public.users - your trigger handles everything
      await prisma.user.delete({
        where: { id: uid },
      })

      return NextResponse.json({ message: 'User deleted successfully' })
    } catch (error: unknown) {
      // Check if it's a validation error that shouldn't be logged
      const isValidationError = error instanceof Error && 'code' in error && error.code === 'P2025'
      
      if (!isValidationError) {
        // Only log actual server errors, not validation errors
        console.error('Error deleting user:', error)
      }
      
      if (error instanceof Error && 'code' in error && error.code === 'P2025') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  })(request)
}

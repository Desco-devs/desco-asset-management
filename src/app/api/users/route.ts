import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'

// Manually define user status enum as in your Prisma schema
enum UserStatusEnum {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
}

// Define the expected shape of the POST request body
interface CreateUserBody {
  username: string
  password: string
  fullname: string
  phone?: string
  // permissions?: Permission[] // Removed since we're using role-based system
  userStatus?: keyof typeof UserStatusEnum | string
}

const prisma = new PrismaClient()

// GET: View all users with proper role-based access control
export const GET = withResourcePermission('users', 'view', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    const queryOptions: any = {
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        role: true,
        user_status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }
    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    const users = await prisma.user.findMany(queryOptions)
    const total = await prisma.user.count()

    return NextResponse.json({
      data: users,
      total,
      user_role: user.role,
      permissions: {
        can_create: user.role === 'SUPERADMIN',
        can_update: user.role === 'SUPERADMIN',
        can_delete: user.role === 'SUPERADMIN'
      }
    })
  } catch (error: any) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// POST: User creation is handled by Supabase Auth
// This endpoint is removed as user creation should be done through Supabase Auth

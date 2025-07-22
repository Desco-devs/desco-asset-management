import { PrismaClient, Role, user_status } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { withResourcePermission, AuthenticatedUser } from '@/lib/auth/api-auth'

const prisma = new PrismaClient()

// GET: Fetch all users
export const GET = withResourcePermission('users', 'view', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')
    const search = searchParams.get('search')
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    const queryOptions: any = {
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        user_profile: true,
        role: true,
        user_status: true,
        is_online: true,
        last_seen: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: 'desc'
      }
    }

    // Build where clause for filtering
    const whereClause: any = {}
    
    if (search) {
      whereClause.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } }
      ]
    }
    
    if (role && Object.values(Role).includes(role as Role)) {
      whereClause.role = role as Role
    }
    
    if (status && Object.values(user_status).includes(status as user_status)) {
      whereClause.user_status = status as user_status
    }

    if (Object.keys(whereClause).length > 0) {
      queryOptions.where = whereClause
    }

    if (limit) {
      queryOptions.take = parseInt(limit, 10)
    }
    if (offset) {
      queryOptions.skip = parseInt(offset, 10)
    }

    const users = await prisma.user.findMany(queryOptions)
    const total = await prisma.user.count({ where: queryOptions.where })

    return NextResponse.json({
      data: users,
      total,
      user_role: user.role,
      permissions: {
        can_create: user.role === 'SUPERADMIN' || user.role === 'ADMIN',
        can_update: user.role === 'SUPERADMIN' || user.role === 'ADMIN',
        can_delete: user.role === 'SUPERADMIN' || user.role === 'ADMIN'
      }
    })
  } catch (error: unknown) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

// POST: Create new user via Supabase Auth
export const POST = withResourcePermission('users', 'create', async (request: NextRequest, user: AuthenticatedUser) => {
  try {
    const body = await request.json()
    const { email, password, username, full_name, phone, role: userRole = 'VIEWER' } = body

    if (!email || !password || !username || !full_name) {
      return NextResponse.json({ 
        error: 'Missing required fields: email, password, username, full_name' 
      }, { status: 400 })
    }

    if (!Object.values(Role).includes(userRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Import service role client
    const { createServiceRoleClient } = await import('@/lib/supabase-server')
    const supabaseAdmin = createServiceRoleClient()

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
        full_name,
        phone: phone || null,
        role: userRole,
      }
    })

    if (authError || !authUser.user) {
      console.error('Supabase Auth error:', authError)
      return NextResponse.json({ 
        error: authError?.message || 'Failed to create user in authentication system' 
      }, { status: 400 })
    }

    // Create user profile in database
    const newUser = await prisma.user.create({
      data: {
        id: authUser.user.id,
        username,
        full_name,
        phone: phone || null,
        role: userRole,
        user_status: 'ACTIVE',
      },
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
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error: unknown) {
    console.error('Error creating user:', error)
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

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

    // Use raw query to handle invalid UUIDs more gracefully
    let users = []
    let total = 0
    
    try {
      users = await prisma.user.findMany(queryOptions)
      total = await prisma.user.count({ where: queryOptions.where })
      
      // Fetch email data from Supabase Auth for each user
      const { createServiceRoleClient } = await import('@/lib/supabase-server')
      const supabaseAdmin = createServiceRoleClient()
      
      // Add email to each user from Supabase Auth
      const usersWithEmail = await Promise.all(
        users.map(async (user: any) => {
          try {
            const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
            return {
              ...user,
              email: authUser.user?.email || null
            }
          } catch (error) {
            console.warn(`Failed to fetch email for user ${user.id}:`, error)
            return {
              ...user,
              email: null
            }
          }
        })
      )
      
      users = usersWithEmail
    } catch (prismaError) {
      // If there's a UUID validation error, try to get valid users only
      if (prismaError instanceof Error && 'code' in prismaError && prismaError.code === 'P2023') {
        console.warn('UUID validation error in user query, filtering out invalid records')
        
        // Use raw query to filter out invalid UUIDs
        const limitClause = queryOptions.take ? `LIMIT ${queryOptions.take}` : ''
        const offsetClause = queryOptions.skip ? `OFFSET ${queryOptions.skip}` : ''
        
        const validUsers = await prisma.$queryRaw`
          SELECT id, username, full_name, phone, user_profile, role, user_status, 
                 is_online, last_seen, created_at, updated_at
          FROM "user" 
          WHERE id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          ORDER BY created_at DESC
        `
        
        // Add email to valid users from Supabase Auth
        const { createServiceRoleClient } = await import('@/lib/supabase-server')
        const supabaseAdmin = createServiceRoleClient()
        
        const validUsersWithEmail = await Promise.all(
          (validUsers as any[]).map(async (user: any) => {
            try {
              const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
              return {
                ...user,
                email: authUser.user?.email || null
              }
            } catch (error) {
              console.warn(`Failed to fetch email for user ${user.id}:`, error)
              return {
                ...user,
                email: null
              }
            }
          })
        )
        
        users = validUsersWithEmail
        total = users.length
      } else {
        throw prismaError
      }
    }

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
    
    // Handle Prisma UUID validation errors
    if (error instanceof Error && 'code' in error && error.code === 'P2023') {
      return NextResponse.json({ 
        error: 'Database contains invalid user ID format. Please contact administrator.' 
      }, { status: 500 })
    }
    
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

    // Create user in Supabase Auth with metadata
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
      // Check if it's a validation error that shouldn't be logged as an error
      const isValidationError = authError?.code === 'email_exists' || 
                               authError?.message?.includes('already been registered') ||
                               authError?.status === 422
      
      if (!isValidationError) {
        // Only log actual server errors, not validation errors
        console.error('Supabase Auth error:', authError)
      }
      
      return NextResponse.json({ 
        error: authError?.message || 'Failed to create user in authentication system' 
      }, { status: 400 })
    }

    // Wait a bit for the trigger to create the public.users record
    await new Promise(resolve => setTimeout(resolve, 200))

    // Fetch the created user record from database (created by trigger with all fields)
    const newUser = await prisma.user.findUnique({
      where: { id: authUser.user.id },
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        role: true,
        user_status: true,
        is_online: true,
        last_seen: true,
        created_at: true,
        updated_at: true,
      },
    })

    if (!newUser) {
      return NextResponse.json({ 
        error: 'User created in auth but profile not found in database' 
      }, { status: 500 })
    }

    return NextResponse.json(newUser, { status: 201 })
  } catch (error: unknown) {
    // Check if it's a validation error that shouldn't be logged
    const isValidationError = error instanceof Error && 'code' in error && error.code === 'P2002'
    
    if (!isValidationError) {
      // Only log actual server errors, not validation errors
      console.error('Error creating user:', error)
    }
    
    if (error instanceof Error && 'code' in error) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Username already exists' }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { PrismaClient } from '@prisma/client'
import { UserRole } from '@/types/auth'
import { hasPermission } from './utils'

const prisma = new PrismaClient()

export interface AuthenticatedUser {
  id: string
  username: string
  full_name: string
  role: UserRole
  user_status: 'ACTIVE' | 'INACTIVE'
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
  response?: NextResponse
}

// UUID validation helper
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Authenticate user from request headers/cookies
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return {
        success: false,
        error: 'Not authenticated',
        response: NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }

    // Validate user ID format before querying database
    if (!isValidUUID(user.id)) {
      console.error('Invalid user ID format from Supabase auth:', user.id, 'Length:', user.id.length, 'Type:', typeof user.id)
      
      // For debugging: log the first few characters to identify the pattern
      console.error('First 10 characters:', user.id.substring(0, 10))
      
      return {
        success: false,
        error: 'Invalid user ID format',
        response: NextResponse.json({ 
          error: 'Invalid user ID format',
          debug: process.env.NODE_ENV === 'development' ? {
            userId: user.id,
            length: user.id.length,
            firstChars: user.id.substring(0, 10)
          } : undefined
        }, { status: 400 })
      }
    }

    // Get user profile from database
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        user_status: true,
      },
    })

    if (!userProfile) {
      return {
        success: false,
        error: 'User profile not found',
        response: NextResponse.json({ error: 'User profile not found' }, { status: 404 })
      }
    }

    if (userProfile.user_status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Account inactive',
        response: NextResponse.json({ error: 'Account is inactive' }, { status: 403 })
      }
    }

    return {
      success: true,
      user: userProfile as AuthenticatedUser
    }
  } catch (error) {
    console.error('Authentication error:', error)
    
    // Handle Prisma UUID validation errors
    if (error instanceof Error && 'code' in error && error.code === 'P2023') {
      return {
        success: false,
        error: 'Invalid user ID format',
        response: NextResponse.json({ error: 'Invalid user ID format' }, { status: 400 })
      }
    }
    
    return {
      success: false,
      error: 'Authentication failed',
      response: NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
    }
  }
}

/**
 * Check if user has required role
 */
export function checkRole(user: AuthenticatedUser, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    VIEWER: 1,
    ADMIN: 2,
    SUPERADMIN: 3
  }

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole]
}

/**
 * Check if user has permission for specific action on resource
 */
export function checkResourcePermission(
  user: AuthenticatedUser,
  resource: 'users' | 'locations' | 'clients' | 'projects' | 'equipment' | 'vehicles' | 'maintenance_reports',
  action: 'view' | 'create' | 'update' | 'delete'
): boolean {
  return hasPermission(user.role, resource, action)
}

/**
 * Middleware wrapper for API routes that require authentication
 */
export function withAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    const authResult = await authenticateRequest(request)
    
    if (!authResult.success) {
      return authResult.response!
    }

    return handler(request, authResult.user!)
  }
}

/**
 * Middleware wrapper for API routes that require specific role
 */
export function withRole(requiredRole: UserRole, handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>) {
  return withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
    if (!checkRole(user, requiredRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    return handler(request, user)
  })
}

/**
 * Middleware wrapper for API routes that require specific resource permission
 */
export function withResourcePermission(
  resource: 'users' | 'locations' | 'clients' | 'projects' | 'equipment' | 'vehicles' | 'maintenance_reports',
  action: 'view' | 'create' | 'update' | 'delete',
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>
) {
  return withAuth(async (request: NextRequest, user: AuthenticatedUser) => {
    if (!checkResourcePermission(user, resource, action)) {
      return NextResponse.json({ 
        error: `Insufficient permissions. ${user.role} role cannot ${action} ${resource}` 
      }, { status: 403 })
    }

    return handler(request, user)
  })
}

/**
 * Apply role-based filters for VIEWER role
 */
export function applyViewerFilters(user: AuthenticatedUser) {
  if (user.role !== 'VIEWER') {
    return {} // No filters for ADMIN/SUPERADMIN
  }

  // For VIEWER role, they can only view data
  // In a real implementation, you might want to filter by:
  // - User's assigned locations
  // - User's assigned clients
  // - User's assigned projects
  // For now, we'll allow viewing all data but with read-only access
  return {}
}

export { prisma }
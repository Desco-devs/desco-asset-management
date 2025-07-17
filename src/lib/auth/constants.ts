import { UserRole, RouteAccess } from '@/types/auth'

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'VIEWER': 1,
  'ADMIN': 2,
  'SUPERADMIN': 3,
}

// Route access configuration based on RLS policies
export const ROUTE_ACCESS_CONFIG: RouteAccess[] = [
  // Dashboard routes - all authenticated users can access
  { path: '/home', requiredRole: 'VIEWER', allowedRoles: ['VIEWER', 'ADMIN', 'SUPERADMIN'] },
  
  // User management - only SUPERADMIN can fully manage users
  { path: '/users', requiredRole: 'VIEWER', allowedRoles: ['VIEWER', 'ADMIN', 'SUPERADMIN'] },
  
  // Equipment management - only ADMIN+ can access (create/update operations)
  { path: '/equipments', requiredRole: 'ADMIN', allowedRoles: ['ADMIN', 'SUPERADMIN'] },
  
  // Other resource management - ADMIN+ can create/update, VIEWER can view
  { path: '/locations', requiredRole: 'VIEWER', allowedRoles: ['VIEWER', 'ADMIN', 'SUPERADMIN'] },
  { path: '/projects', requiredRole: 'VIEWER', allowedRoles: ['VIEWER', 'ADMIN', 'SUPERADMIN'] },
  { path: '/vehicles', requiredRole: 'VIEWER', allowedRoles: ['VIEWER', 'ADMIN', 'SUPERADMIN'] },
  { path: '/assets', requiredRole: 'VIEWER', allowedRoles: ['VIEWER', 'ADMIN', 'SUPERADMIN'] },
  
  // API routes - handled by RLS policies at database level
  { path: '/api', requiredRole: 'VIEWER', allowedRoles: ['VIEWER', 'ADMIN', 'SUPERADMIN'] }
]

// Paths that should skip middleware to prevent redirect loops
export const SKIP_MIDDLEWARE_PATHS = [
  '/login',
  '/unauthorized', 
  '/api/auth'
]

// Role display names for UI
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  'VIEWER': 'Viewer',
  'ADMIN': 'Administrator',
  'SUPERADMIN': 'Super Administrator',
}

// Role colors for UI badges
export const ROLE_COLORS: Record<UserRole, string> = {
  'VIEWER': 'bg-blue-100 text-blue-800',
  'ADMIN': 'bg-green-100 text-green-800',
  'SUPERADMIN': 'bg-purple-100 text-purple-800',
}

// Default redirect paths based on role
export const DEFAULT_REDIRECT_PATHS: Record<UserRole, string> = {
  'VIEWER': '/assets',
  'ADMIN': '/home',
  'SUPERADMIN': '/home',
}
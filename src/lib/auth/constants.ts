import { UserRole, RouteAccess } from '@/types/auth'

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  'VIEWER': 1,
  'ADMIN': 2,
  'SUPERADMIN': 3,
}

// Dashboard routes that require authentication (any authenticated user can access /assets)
export const DASHBOARD_PROTECTED_ROUTES = [
  '/dashboard',
  '/users', 
  '/equipments',
  '/vehicles',
  '/locations',
  '/projects'
]

// Paths that should skip middleware to prevent redirect loops
export const SKIP_MIDDLEWARE_PATHS = [
  '/login',
  '/unauthorized', 
  '/api/auth',
  '/api/session' // Allow session API calls from middleware
]

// Public routes that don't require authentication
export const PUBLIC_ROUTES = [
  '/landing-page',
  '/login',
  '/unauthorized'
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
  'ADMIN': '/dashboard', 
  'SUPERADMIN': '/dashboard',
}

// Fallback redirect for when role is unknown
export const DEFAULT_AUTHENTICATED_REDIRECT = '/assets'
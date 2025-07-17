import { UserRole, RolePermissions, ResourceType } from '@/types/auth'
import { 
  ROLE_HIERARCHY, 
  ROLE_DISPLAY_NAMES, 
  ROLE_COLORS, 
  DEFAULT_REDIRECT_PATHS 
} from './constants'

/**
 * Check if a user has the minimum required role
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

/**
 * Get permissions for a user role and resource type
 */
export function getResourcePermissions(userRole: UserRole, resourceType: ResourceType): RolePermissions {
  const basePermissions: RolePermissions = {
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  }

  // All authenticated users can view all resources
  if (userRole) {
    basePermissions.canView = true
  }

  switch (resourceType) {
    case 'users':
      if (userRole === 'SUPERADMIN') {
        return {
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        }
      }
      // ADMIN and VIEWER can only view users
      return {
        ...basePermissions,
        canView: true,
      }

    case 'locations':
    case 'clients':
    case 'projects':
    case 'equipment':
    case 'vehicles':
    case 'maintenance_reports':
      if (userRole === 'SUPERADMIN') {
        return {
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: true,
        }
      }
      if (userRole === 'ADMIN') {
        return {
          canView: true,
          canCreate: true,
          canUpdate: true,
          canDelete: false,
        }
      }
      // VIEWER can only view
      return {
        ...basePermissions,
        canView: true,
      }

    default:
      return basePermissions
  }
}

/**
 * Check if a user can access a specific route
 */
export function canAccessRoute(userRole: UserRole, routePath: string): boolean {
  // Equipment management routes - only ADMIN+ can access
  if (routePath.startsWith('/equipments')) {
    return hasMinimumRole(userRole, 'ADMIN')
  }

  // All authenticated users can access these dashboard routes
  const generalDashboardRoutes = ['/home', '/locations', '/projects', '/vehicles', '/assets']
  
  if (generalDashboardRoutes.some(route => routePath.startsWith(route))) {
    return Boolean(userRole)
  }

  // User management routes - all roles can view users list
  if (routePath.startsWith('/users')) {
    return Boolean(userRole)
  }

  // API routes are protected by RLS policies
  if (routePath.startsWith('/api')) {
    return Boolean(userRole)
  }

  return false
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] || role
}

/**
 * Get CSS classes for role badge styling
 */
export function getRoleColor(role: UserRole): string {
  return ROLE_COLORS[role] || 'bg-gray-100 text-gray-800'
}

/**
 * Get default redirect path for a user role
 */
export function getDefaultRedirectPath(role: UserRole): string {
  return DEFAULT_REDIRECT_PATHS[role] || '/home'
}

/**
 * Check if a user has permission for a specific action on a resource
 */
export function hasPermission(
  userRole: UserRole, 
  resource: ResourceType, 
  action: 'view' | 'create' | 'update' | 'delete'
): boolean {
  const permissions = getResourcePermissions(userRole, resource)
  
  switch (action) {
    case 'view': return permissions.canView
    case 'create': return permissions.canCreate
    case 'update': return permissions.canUpdate
    case 'delete': return permissions.canDelete
    default: return false
  }
}

/**
 * Validate if a role is valid
 */
export function isValidRole(role: string): role is UserRole {
  return ['VIEWER', 'ADMIN', 'SUPERADMIN'].includes(role)
}
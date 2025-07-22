import { useMemo } from 'react'
import { UserRole, ResourceType } from '@/types/auth'
import { getResourcePermissions, hasPermission } from '@/lib/auth/utils'
import { useUserRole } from './useUserRole'

export function usePermissions(resource: ResourceType, userRole?: UserRole) {
  const { userRole: hookRole } = useUserRole()
  const currentRole = userRole || hookRole

  const permissions = useMemo(() => {
    if (!currentRole) {
      return {
        canView: false,
        canCreate: false,
        canUpdate: false,
        canDelete: false,
      }
    }
    return getResourcePermissions(currentRole, resource)
  }, [currentRole, resource])

  const checkPermission = useMemo(() => {
    return (action: 'view' | 'create' | 'update' | 'delete') => {
      if (!currentRole) return false
      return hasPermission(currentRole, resource, action)
    }
  }, [currentRole, resource])

  return {
    permissions,
    checkPermission,
    userRole: currentRole,
  }
}
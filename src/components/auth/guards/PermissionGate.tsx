'use client'

import { PermissionGateProps } from '@/types/auth'
import { usePermissions } from '@/hooks/auth'

export function PermissionGate({ 
  children, 
  resource, 
  action, 
  userRole: providedRole,
  fallback = null 
}: PermissionGateProps) {
  const { checkPermission, userRole } = usePermissions(resource, providedRole)
  
  if (!userRole || !checkPermission(action)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
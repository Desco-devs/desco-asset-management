'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RoleGuardProps } from '@/types/auth'
import { hasMinimumRole } from '@/lib/auth/utils'
import { useUserRole } from '@/hooks/auth'
import { Loader2 } from 'lucide-react'

export function RoleGuard({ 
  children, 
  requiredRole, 
  fallback = <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>,
  redirectTo = '/unauthorized' 
}: RoleGuardProps) {
  const { userRole, isLoading } = useUserRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && userRole && !hasMinimumRole(userRole, requiredRole)) {
      router.push(redirectTo)
    }
  }, [userRole, isLoading, requiredRole, redirectTo, router])

  if (isLoading) {
    return <>{fallback}</>
  }

  if (!userRole || !hasMinimumRole(userRole, requiredRole)) {
    return null
  }

  return <>{children}</>
}
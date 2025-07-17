'use client'

import { UserRole } from '@/types/auth'
import { getRoleDisplayName, getRoleColor } from '@/lib/auth/utils'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: UserRole
  className?: string
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const displayName = getRoleDisplayName(role)
  const colorClasses = getRoleColor(role)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClasses,
        className
      )}
    >
      {displayName}
    </span>
  )
}
'use client'

import { Badge } from '@/components/ui/badge'

interface UserHeaderProps {
  total?: number
}

export function UserHeader({ total }: UserHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold">Users Management</h1>
        <p className="text-gray-600 mt-1">Manage system users and their permissions</p>
      </div>
      {total !== undefined && (
        <Badge variant="outline" className="text-sm">
          {total} total users
        </Badge>
      )}
    </div>
  )
}
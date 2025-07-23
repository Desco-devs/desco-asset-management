'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'

interface UserHeaderProps {
  total?: number
  onCreateNew?: () => void
  canCreate?: boolean
}

export function UserHeader({ total, onCreateNew, canCreate }: UserHeaderProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Users Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-xs md:text-base">
            Manage system users and their permissions
          </p>
        </div>
        {canCreate && onCreateNew && (
          <Button 
            onClick={onCreateNew} 
            size="sm" 
            className="w-full sm:w-fit"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>
    </div>
  )
}
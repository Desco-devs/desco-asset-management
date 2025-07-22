'use client'

import { Card, CardContent } from '@/components/ui/card'
import { UsersCards } from '@/components/tables/UsersCards'
import { User, UsersApiResponse } from '@/types/users'

interface UserTableSectionProps {
  usersData: UsersApiResponse | undefined
  isLoading: boolean
  onEdit: (user: User) => void
  onDelete: (userId: string) => void
  onView: (user: User) => void
  onCreateNew: () => void
  deleteLoading?: boolean
  currentUserRole?: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
  isModalOpen?: boolean
}

export function UserTableSection({
  usersData,
  isLoading,
  onEdit,
  onDelete,
  onView,
  onCreateNew,
  deleteLoading = false,
  currentUserRole,
  isModalOpen = false,
}: UserTableSectionProps) {
  return (
    <div>
      <UsersCards
        users={usersData?.data || []}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        onCreateNew={onCreateNew}
        loading={isLoading}
        canEdit={usersData?.permissions.can_update}
        canDelete={usersData?.permissions.can_delete}
        canCreate={usersData?.permissions.can_create}
        deleteLoading={deleteLoading}
        currentUserRole={currentUserRole}
        isModalOpen={isModalOpen}
      />
    </div>
  )
}
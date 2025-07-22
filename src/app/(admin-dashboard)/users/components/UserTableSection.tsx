'use client'

import { Card, CardContent } from '@/components/ui/card'
import { UsersTable } from '@/components/tables/UsersTable'
import { User, UsersApiResponse } from '@/types/users'

interface UserTableSectionProps {
  usersData: UsersApiResponse | undefined
  isLoading: boolean
  onEdit: (user: User) => void
  onDelete: (userId: string) => void
  onView: (user: User) => void
  onCreateNew: () => void
}

export function UserTableSection({
  usersData,
  isLoading,
  onEdit,
  onDelete,
  onView,
  onCreateNew,
}: UserTableSectionProps) {
  return (
    <Card>
      <CardContent className="p-0">
        <UsersTable
          users={usersData?.data || []}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onCreateNew={onCreateNew}
          loading={isLoading}
          canEdit={usersData?.permissions.can_update}
          canDelete={usersData?.permissions.can_delete}
          canCreate={usersData?.permissions.can_create}
        />
      </CardContent>
    </Card>
  )
}
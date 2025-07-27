'use client'

import { Card, CardContent } from '@/components/ui/card'
import { UsersCards } from '@/components/tables/UsersCards'
import { useUsers } from '@/hooks/useUsersQuery'
import { useUsersRealtime } from '@/hooks/useUsersRealtime'
import { useUsersStore } from '@/stores/users-store'
import { useAuth } from '@/app/context/AuthContext'

interface UsersListProps {
  onEdit: (user: any) => void
  onDelete: (userId: string) => void
  onView: (user: any) => void
  onCreateNew: () => void
  deleteLoading?: boolean
}

export function UsersList({
  onEdit,
  onDelete,
  onView,
  onCreateNew,
  deleteLoading = false,
}: UsersListProps) {
  // Data layer
  const { data: usersData, isLoading, error } = useUsers()
  useUsersRealtime() // Activate realtime

  // UI layer
  const { user: currentUser } = useAuth()
  const getFilteredUsers = useUsersStore(state => state.getFilteredUsers)
  const isModalOpen = useUsersStore(state => state.isModalOpen)

  // Compute display data
  const allUsers = usersData?.data || []
  const usersWithoutCurrent = allUsers.filter(user => user.id !== currentUser?.id)
  const filteredUsers = getFilteredUsers(usersWithoutCurrent)

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
            <p>{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <UsersCards
      users={filteredUsers}
      onEdit={onEdit}
      onDelete={onDelete}
      onView={onView}
      onCreateNew={onCreateNew}
      loading={isLoading}
      canEdit={usersData?.permissions.can_update}
      canDelete={usersData?.permissions.can_delete}
      canCreate={usersData?.permissions.can_create}
      deleteLoading={deleteLoading}
      currentUserRole={currentUser?.role}
      currentUserId={currentUser?.id}
      isModalOpen={isModalOpen}
    />
  )
}
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { UserModal } from '@/components/modals/UserModal'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/api/use-users'
import { useUsersStore } from '@/stores/users-store'
import { CreateUserSchema, UpdateUserSchema } from '@/types/users'
import { parseUserRole, parseUserStatus } from '@/lib/constants/users'

// Page-specific components
import { UserHeader } from './components/UserHeader'
import { UserStats } from './components/UserStats'
import { UserFilters } from './components/UserFilters'
import { UserTableSection } from './components/UserTableSection'

export default function UsersPage() {
  // Zustand store for client state management
  const {
    modalState,
    filters,
    hasActiveFilters,
    openCreateModal,
    openEditModal,
    openViewModal,
    closeModal,
    setFilters,
    clearFilters,
  } = useUsersStore()

  // TanStack Query with Supabase realtime
  const { data: usersData, isLoading, error } = useUsers(filters)
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  // Handlers
  const handleCreateUser = async (data: CreateUserSchema) => {
    try {
      await createUserMutation.mutateAsync(data)
      // Only close modal on success
      closeModal()
    } catch (error) {
      // Error occurred - don't close modal, let user fix and retry
      console.error('Error creating user:', error)
    }
  }

  const handleUpdateUser = async (data: UpdateUserSchema) => {
    if (!modalState.user) return
    try {
      await updateUserMutation.mutateAsync({ id: modalState.user.id, data })
      // Only close modal on success
      closeModal()
    } catch (error) {
      // Error occurred - don't close modal, let user fix and retry
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    await deleteUserMutation.mutateAsync(userId)
  }

  const handleModalSubmit = async (data: CreateUserSchema | UpdateUserSchema) => {
    if (modalState.mode === 'create') {
      await handleCreateUser(data as CreateUserSchema)
    } else if (modalState.mode === 'edit') {
      await handleUpdateUser(data as UpdateUserSchema)
    }
  }

  // Filter handlers
  const handleSearchChange = (search: string) => {
    setFilters({ search: search || undefined })
  }

  const handleRoleFilter = (role: string) => {
    setFilters({ role: parseUserRole(role) })
  }

  const handleStatusFilter = (status: string) => {
    setFilters({ status: parseUserStatus(status) })
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-red-600">
              <h3 className="text-lg font-semibold mb-2">Error Loading Users</h3>
              <p>{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <UserHeader total={usersData?.originalTotal || usersData?.total} />

      {/* Stats Cards */}
      {usersData?.data && (
        <UserStats 
          users={usersData.data} 
          total={usersData.originalTotal || usersData.total} 
        />
      )}

      {/* Filters */}
      <UserFilters
        filters={filters}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={handleSearchChange}
        onRoleFilter={handleRoleFilter}
        onStatusFilter={handleStatusFilter}
        onClearFilters={clearFilters}
      />

      {/* Users Table */}
      <UserTableSection
        usersData={usersData}
        isLoading={isLoading}
        onEdit={openEditModal}
        onDelete={handleDeleteUser}
        onView={openViewModal}
        onCreateNew={openCreateModal}
      />

      {/* User Modal */}
      <UserModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        user={modalState.user}
        mode={modalState.mode}
        loading={
          createUserMutation.isPending || 
          updateUserMutation.isPending
        }
      />
    </div>
  )
}
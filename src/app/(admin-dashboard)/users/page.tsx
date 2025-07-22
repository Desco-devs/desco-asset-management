'use client'

import { Card, CardContent } from '@/components/ui/card'
import { UserModal } from '@/components/modals/UserModal'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/api/use-users'
import { useUsersStore } from '@/stores/users-store'
import { CreateUserSchema, UpdateUserSchema } from '@/types/users'
import { parseUserRole, parseUserStatus } from '@/lib/constants/users'
import { useAuth } from '@/app/context/AuthContext'

// Page-specific components
import { UserHeader } from './components/UserHeader'
import { UserStats } from './components/UserStats'
import { UserFilters } from './components/UserFilters'
import { UserTableSection } from './components/UserTableSection'

export default function UsersPage() {
  // Get current authenticated user
  const { user: currentUser } = useAuth()
  
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

  // TanStack Query with Supabase realtime - filter out current user
  const { data: usersData, isLoading, error } = useUsers(filters, currentUser?.id)
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
      const updatedUser = await updateUserMutation.mutateAsync({ id: modalState.user.id, data })
      // Close modal on success
      closeModal()
      // Note: The UsersCards component will handle reopening the drawer with updated data
      // via the userBeingEdited state and modal close detection
    } catch (error) {
      // Error occurred - don't close modal, let user fix and retry
      console.error('Error updating user:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    // Use mutateAsync which will throw on error, allowing the modal to stay open on failure
    return deleteUserMutation.mutateAsync(userId)
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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <UserHeader 
        total={usersData?.originalTotal || usersData?.total}
        onCreateNew={openCreateModal}
        canCreate={usersData?.permissions.can_create}
      />

      {/* Stats Cards */}
      {usersData && (
        <UserStats 
          usersData={usersData}
          currentUserId={currentUser?.id}
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
        deleteLoading={deleteUserMutation.isPending}
        currentUserRole={currentUser?.role}
        isModalOpen={modalState.isOpen}
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
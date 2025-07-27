'use client'

import { UserModal } from '@/components/modals/UserModal'
import { useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/useUsersQuery'
import { useUsersStore } from '@/stores/users-store'
import { CreateUserSchema, UpdateUserSchema } from '@/types/users'
import { useAuth } from '@/app/context/AuthContext'

// Components
import { UserHeader } from './components/UserHeader'
import { UserStats } from './components/UserStats'
import { UserSearchAndActions } from './components/UserSearchAndActions'
import { UsersList } from './components/UsersList'

export default function UsersPage() {
  // Data layer
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  // UI layer
  const { user: currentUser } = useAuth()
  const {
    isModalOpen,
    selectedUser,
    modalMode,
    searchQuery,
    filterRole,
    filterStatus,
    openCreateModal,
    openEditModal,
    openViewModal,
    closeModal,
    setSearchQuery,
    setFilterRole,
    setFilterStatus,
    resetFilters,
    getFilteredUsers,
  } = useUsersStore()

  // Handlers
  const handleCreateUser = async (data: CreateUserSchema) => {
    await createUserMutation.mutateAsync(data)
    closeModal()
  }

  const handleUpdateUser = async (data: UpdateUserSchema) => {
    if (!selectedUser) return
    await updateUserMutation.mutateAsync({ id: selectedUser.id, data })
    closeModal()
  }

  const handleDeleteUser = async (userId: string) => {
    return deleteUserMutation.mutateAsync(userId)
  }

  const handleModalSubmit = async (data: CreateUserSchema | UpdateUserSchema) => {
    if (modalMode === 'create') {
      await handleCreateUser(data as CreateUserSchema)
    } else if (modalMode === 'edit') {
      await handleUpdateUser(data as UpdateUserSchema)
    }
  }

  const hasActiveFilters = !!(searchQuery || filterRole || filterStatus)

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <UserHeader />

      {/* Stats - TODO: Implement if needed */}
      
      {/* Search and Actions */}
      <UserSearchAndActions
        searchQuery={searchQuery}
        filterRole={filterRole}
        filterStatus={filterStatus}
        hasActiveFilters={hasActiveFilters}
        onSearchChange={setSearchQuery}
        onRoleFilter={setFilterRole}
        onStatusFilter={setFilterStatus}
        onClearFilters={resetFilters}
        onCreateNew={openCreateModal}
      />

      {/* Users List */}
      <UsersList
        onEdit={openEditModal}
        onDelete={handleDeleteUser}
        onView={openViewModal}
        onCreateNew={openCreateModal}
        deleteLoading={deleteUserMutation.isPending}
      />

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleModalSubmit}
        user={selectedUser}
        mode={modalMode}
        loading={createUserMutation.isPending || updateUserMutation.isPending}
      />
    </div>
  )
}
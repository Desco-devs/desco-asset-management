'use client'

import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UsersTable } from '@/components/tables/UsersTable'
import { UserModal } from '@/components/modals/UserModal'
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '@/hooks/api/use-users'
import { useUsersStore } from '@/stores/users-store'
import { User, CreateUserSchema, UpdateUserSchema } from '@/types/users'

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
    await createUserMutation.mutateAsync(data)
    closeModal()
  }

  const handleUpdateUser = async (data: UpdateUserSchema) => {
    if (!modalState.user) return
    await updateUserMutation.mutateAsync({ id: modalState.user.id, data })
    closeModal()
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
    setFilters({ role: role === 'all' ? undefined : role as any })
  }

  const handleStatusFilter = (status: string) => {
    setFilters({ status: status === 'all' ? undefined : status as any })
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-gray-600 mt-1">Manage system users and their permissions</p>
        </div>
        {usersData?.data && (
          <Badge variant="outline" className="text-sm">
            {usersData.total} total users
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      {usersData?.data && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersData.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Online Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {usersData.data.filter(u => u.is_online).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {usersData.data.filter(u => u.user_status === 'ACTIVE').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {usersData.data.filter(u => u.role === 'ADMIN' || u.role === 'SUPERADMIN').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search by username, name, or phone..."
                  className="pl-10"
                  value={filters.search || ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
            
            <Select 
              value={filters.role || 'all'} 
              onValueChange={handleRoleFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.status || 'all'} 
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              Clear Filters
              {hasActiveFilters && <Badge variant="secondary" className="ml-2">Active</Badge>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {/* Debug: Show permissions */}
          {usersData && (
            <div className="p-4 bg-gray-100 text-sm">
              <strong>Debug - Current User Role:</strong> {usersData.user_role}<br/>
              <strong>Permissions:</strong> 
              Create: {usersData.permissions.can_create ? '✅' : '❌'}, 
              Update: {usersData.permissions.can_update ? '✅' : '❌'}, 
              Delete: {usersData.permissions.can_delete ? '✅' : '❌'}
            </div>
          )}
          
          <UsersTable
            users={usersData?.data || []}
            onEdit={openEditModal}
            onDelete={handleDeleteUser}
            onView={openViewModal}
            onCreateNew={openCreateModal}
            loading={isLoading}
            canEdit={usersData?.permissions.can_update}
            canDelete={usersData?.permissions.can_delete}
            canCreate={usersData?.permissions.can_create}
          />
        </CardContent>
      </Card>

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
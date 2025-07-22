'use client'

import { useState, useEffect } from 'react'
import { Edit, Trash2, Eye, UserPlus, Phone, Mail, Globe, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { User, ROLE_COLORS, STATUS_COLORS, USER_ROLES, USER_STATUSES } from '@/types/users'
import { formatDistanceToNow } from 'date-fns'

interface UsersCardsProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (userId: string) => void
  onView: (user: User) => void
  onCreateNew: () => void
  loading?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canCreate?: boolean
  deleteLoading?: boolean
  currentUserRole?: 'SUPERADMIN' | 'ADMIN' | 'VIEWER'
  isModalOpen?: boolean
}

export function UsersCards({
  users,
  onEdit,
  onDelete,
  onView,
  onCreateNew,
  loading = false,
  canEdit = false,
  canDelete = false,
  canCreate = false,
  deleteLoading = false,
  currentUserRole,
  isModalOpen = false,
}: UsersCardsProps) {
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [userBeingEdited, setUserBeingEdited] = useState<User | null>(null)
  const [isDataUpdating, setIsDataUpdating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  
  // Responsive pagination - like vehicles pattern
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])
  
  const itemsPerPage = isMobile ? 6 : 12
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedUsers = users.slice(startIndex, startIndex + itemsPerPage)
  const totalPages = Math.ceil(users.length / itemsPerPage)
  
  // Reset to page 1 when users data changes (filtering, etc.)
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1)
    }
  }, [users.length, currentPage, totalPages])
  
  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }
  
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  useEffect(() => {
    if (!deleteLoading) {
      setLoadingUserId(null)
    }
  }, [deleteLoading])

  const handleDelete = async (user: User) => {
    setLoadingUserId(user.id)
    try {
      await onDelete(user.id)
      setDeleteUser(null) // Close dialog on success
    } catch (error) {
      console.error('Failed to delete user:', error)
      setLoadingUserId(null) // Reset loading state on error
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatLastSeen = (lastSeen: string | null, isOnline: boolean) => {
    if (isOnline) return 'Online now'
    if (!lastSeen) return 'Never'
    
    try {
      return formatDistanceToNow(new Date(lastSeen), { addSuffix: true })
    } catch {
      return 'Unknown'
    }
  }

  const handleCardClick = (user: User) => {
    setSelectedUser(user)
    setIsDrawerOpen(true)
  }

  const handleEditClick = (user: User) => {
    setUserBeingEdited(user)
    setIsDrawerOpen(false)
    onEdit(user)
  }

  // Reopen drawer when modal closes if user was being edited
  useEffect(() => {
    if (!isModalOpen && userBeingEdited) {
      // Modal closed and we have a user that was being edited, reopen drawer with updated data
      // Find the most current user data from the users array (includes real-time updates)
      const currentUserData = users.find(u => u.id === userBeingEdited.id) || userBeingEdited
      setSelectedUser(currentUserData)
      setIsDrawerOpen(true)
      setUserBeingEdited(null)
    }
  }, [isModalOpen, userBeingEdited, users])

  // Real-time data synchronization workflow:
  // 1. Supabase → Streams DB changes via WebSockets to TanStack Query
  // 2. TanStack Query → Updates users array with real-time cache updates  
  // 3. Component → Detects changes and updates selectedUser with fresh data
  // 4. UI → Shows subtle visual indicators during updates
  useEffect(() => {
    if (selectedUser && isDrawerOpen) {
      // Find updated user data from the full users array (not paginated)
      const updatedUser = users.find(u => u.id === selectedUser.id)
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(selectedUser)) {
        // User data has changed, show subtle updating indicator
        setIsDataUpdating(true)
        
        // Update the selectedUser with real-time data
        setSelectedUser(updatedUser)
        
        // Hide updating indicator after brief delay for smooth UX
        setTimeout(() => setIsDataUpdating(false), 500)
      }
    }
  }, [users, selectedUser, isDrawerOpen])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No users found</h3>
          <p className="text-gray-600 mb-4">Get started by adding your first user.</p>
          {canCreate && (
            <Button onClick={onCreateNew}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {paginatedUsers.map((user) => (
          <Card 
            key={user.id} 
            className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            onClick={() => handleCardClick(user)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div 
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      user.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm">{user.full_name}</h3>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${ROLE_COLORS[user.role as keyof typeof ROLE_COLORS]}`}
                      >
                        {USER_ROLES[user.role as keyof typeof USER_ROLES]}
                      </Badge>
                      <Badge 
                        variant="outline"
                        className={`text-xs ${STATUS_COLORS[user.user_status as keyof typeof STATUS_COLORS]}`}
                      >
                        {USER_STATUSES[user.user_status as keyof typeof USER_STATUSES]}
                      </Badge>
                    </div>
                    {/* Eye icon - Visual indicator for clickable card like vehicles */}
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                  
                  <p className="text-xs text-gray-500 mb-1">@{user.username}</p>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {user.phone_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {user.phone_number}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {formatLastSeen(user.last_seen, user.is_online)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination Controls - Vehicle-style */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 px-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="gap-2 min-w-[80px] justify-center"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              {currentPage} of {totalPages}
            </Badge>
            <span className="text-xs text-gray-500 hidden sm:inline">
              ({users.length} total users)
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="gap-2 min-w-[80px] justify-center"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* User Details Drawer */}
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerContent className="!max-h-[95vh]">
          {selectedUser && (
            <>
              <DrawerHeader className="border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {getInitials(selectedUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div 
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white transition-all duration-300 ${
                          selectedUser.is_online ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                      {/* Real-time update indicator */}
                      {isDataUpdating && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div>
                      <DrawerTitle className="text-lg font-semibold text-left flex items-center gap-2">
                        {selectedUser.full_name}
                        {isDataUpdating && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        )}
                      </DrawerTitle>
                      <DrawerDescription className="text-sm text-gray-500 text-left">
                        @{selectedUser.username}
                      </DrawerDescription>
                    </div>
                  </div>
                  
                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsDrawerOpen(false)}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DrawerHeader>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* User Details - Role and Status */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">User Details</h3>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500">Full Name</p>
                        <p className="text-sm font-medium">{selectedUser.full_name}</p>
                      </div>
                      <div className="flex gap-3">
                        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Role</p>
                          <Badge 
                            variant="outline"
                            className={`mt-1 text-xs ${ROLE_COLORS[selectedUser.role as keyof typeof ROLE_COLORS]}`}
                          >
                            {USER_ROLES[selectedUser.role as keyof typeof USER_ROLES]}
                          </Badge>
                        </div>
                        <div className="flex-1 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500">Status</p>
                          <Badge 
                            variant="outline"
                            className={`mt-1 text-xs ${STATUS_COLORS[selectedUser.user_status as keyof typeof STATUS_COLORS]}`}
                          >
                            {USER_STATUSES[selectedUser.user_status as keyof typeof USER_STATUSES]}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">Contact Information</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-500">Email/Username</p>
                          <p className="text-sm font-medium">{selectedUser.username}</p>
                        </div>
                      </div>
                      {selectedUser.phone_number && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Phone Number</p>
                            <p className="text-sm font-medium">{selectedUser.phone_number}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Activity */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">Activity Status</h3>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg transition-all duration-300">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Last Seen</p>
                        <p className="text-sm font-medium">{formatLastSeen(selectedUser.last_seen, selectedUser.is_online)}</p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Footer Actions */}
              <DrawerFooter className="border-t p-4">
                <div className="flex gap-2 w-full">
                  {canDelete && selectedUser.role !== 'SUPERADMIN' && (currentUserRole === 'SUPERADMIN' || currentUserRole === 'ADMIN') && (
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteUser(selectedUser)}
                      className="flex-1 gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  )}
                  {canEdit && (
                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => handleEditClick(selectedUser)}
                      className="flex-1 gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                  )}
                </div>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => !loadingUserId && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.full_name}</strong>? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!loadingUserId}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteUser && handleDelete(deleteUser)}
              disabled={!!loadingUserId}
              className="bg-red-600 hover:bg-red-700"
            >
              {loadingUserId === deleteUser?.id ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
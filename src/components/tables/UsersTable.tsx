'use client'

import { useState } from 'react'
import { MoreHorizontal, Edit, Trash2, Eye, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { User, ROLE_COLORS, STATUS_COLORS, USER_ROLES, USER_STATUSES } from '@/types/users'
import { formatDistanceToNow } from 'date-fns'

interface UsersTableProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (userId: string) => void
  onView: (user: User) => void
  onCreateNew: () => void
  loading?: boolean
  canEdit?: boolean
  canDelete?: boolean
  canCreate?: boolean
}

export function UsersTable({
  users,
  onEdit,
  onDelete,
  onView,
  onCreateNew,
  loading = false,
  canEdit = false,
  canDelete = false,
  canCreate = false,
}: UsersTableProps) {
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null)

  const handleDeleteConfirm = () => {
    if (deleteUserId) {
      onDelete(deleteUserId)
      setDeleteUserId(null)
    }
  }

  const formatLastSeen = (lastSeen: Date | null, isOnline: boolean) => {
    if (isOnline) return 'Online now'
    if (!lastSeen) return 'Never'
    return `${formatDistanceToNow(new Date(lastSeen))} ago`
  }

  const getInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-16 bg-gray-100 animate-pulse rounded"></div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Users Management</h2>
        {canCreate && (
          <Button onClick={onCreateNew}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[70px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span 
                            className={`w-2 h-2 rounded-full ${
                              user.is_online ? 'bg-green-500' : 'bg-gray-400'
                            }`}
                          />
                          {user.is_online ? 'Online' : 'Offline'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{user.username}</TableCell>
                  <TableCell>{user.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[user.role]}>
                      {USER_ROLES[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[user.user_status]}>
                      {USER_STATUSES[user.user_status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatLastSeen(user.last_seen, user.is_online)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {formatDistanceToNow(new Date(user.created_at))} ago
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteUserId(user.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(user)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => onEdit(user)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteUserId(user.id)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
              All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { UserForm } from '@/components/forms/UserForm'
import { User, CreateUserSchema, UpdateUserSchema } from '@/types/users'
import { useUsersStore } from '@/stores/users-store'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: CreateUserSchema | UpdateUserSchema) => Promise<void>
  user?: User | null
  loading?: boolean
  mode: 'create' | 'edit' | 'view'
}

export function UserModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  user, 
  loading = false, 
  mode
}: UserModalProps) {
  const { openEditModal } = useUsersStore()

  const handleSubmit = async (data: CreateUserSchema | UpdateUserSchema) => {
    await onSubmit(data)
    onClose()
  }

  const handleEditFromView = () => {
    if (user) {
      onClose() // Close current modal
      setTimeout(() => {
        openEditModal(user) // Open edit modal after delay
      }, 100)
    }
  }

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Create New User'
      case 'edit': return 'Edit User'
      case 'view': return 'User Details'
      default: return 'User'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{getTitle()}</span>
            {mode === 'view' && (
              <Button 
                onClick={handleEditFromView}
                size="sm"
                variant="outline"
              >
                Edit User
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <UserForm
          user={user || undefined}
          onSubmit={handleSubmit}
          onCancel={onClose}
          loading={loading}
          mode={mode}
        />
      </DialogContent>
    </Dialog>
  )
}
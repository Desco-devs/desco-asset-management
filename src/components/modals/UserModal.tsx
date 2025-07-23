'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSubmit = async (data: CreateUserSchema | UpdateUserSchema) => {
    // Don't close modal here - let parent handle success/error
    await onSubmit(data)
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

  const content = (
    <UserForm
      user={user || undefined}
      onSubmit={handleSubmit}
      onCancel={onClose}
      loading={loading}
      mode={mode}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="!max-h-[95vh] flex flex-col dark:!bg-gray-900">
          <DrawerHeader className="p-4 pb-4 flex-shrink-0 border-b relative dark:!bg-gray-900 dark:!border-gray-700">
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-4 rounded-full h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="flex items-center justify-between pr-8 dark:!text-white">
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
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4 dark:!bg-gray-900">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 pb-4 flex-shrink-0 border-b">
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
        
        <div className="flex-1 overflow-y-auto p-4">
          {content}
        </div>
      </DialogContent>
    </Dialog>
  )
}
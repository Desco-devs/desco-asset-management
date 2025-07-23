'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ClientForm } from '../forms/ClientForm'
import { useProjectsStore } from '@/stores/projects-store'
import { useClients } from '@/hooks/api/use-projects'

export function ClientModal() {
  const isOpen = useProjectsStore(state => state.isClientModalOpen)
  const editingId = useProjectsStore(state => state.editingClientId)
  const setModal = useProjectsStore(state => state.setClientModal)
  const { data: clients } = useClients()
  
  const client = editingId ? clients?.find(c => c.id === editingId) : null
  const isEditing = !!editingId

  const handleSuccess = () => {
    setModal(false)
  }

  const handleCancel = () => {
    setModal(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setModal(open)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Client' : 'Create New Client'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the client information.' 
              : 'Add a new client to this location.'
            }
          </DialogDescription>
        </DialogHeader>
        <ClientForm
          client={client}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}
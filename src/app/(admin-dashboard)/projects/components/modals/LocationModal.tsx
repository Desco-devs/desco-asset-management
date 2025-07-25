'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LocationForm } from '../forms/LocationForm'
import { useProjectsStore } from '@/stores/projects-store'
import { useLocations } from '@/hooks/api/use-projects'

export function LocationModal() {
  const isOpen = useProjectsStore(state => state.isLocationModalOpen)
  const editingId = useProjectsStore(state => state.editingLocationId)
  const setModal = useProjectsStore(state => state.setLocationModal)
  const { data: locations } = useLocations()
  
  const location = editingId ? locations?.find(loc => loc.id === editingId) : null
  const isEditing = !!editingId

  const handleSuccess = () => {
    setModal(false)
  }

  const handleCancel = () => {
    setModal(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => setModal(open)}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="break-words hyphens-auto leading-relaxed">
            {isEditing ? 'Edit Location' : 'Create New Location'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the location information.' 
              : 'Add a new location to organize your clients and projects.'
            }
          </DialogDescription>
        </DialogHeader>
        <LocationForm
          location={location}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}
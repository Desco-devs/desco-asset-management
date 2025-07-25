'use client'

import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProjectForm } from '../forms/ProjectForm'
import { useProjectsStore } from '@/stores/projects-store'
import { useProjects } from '@/hooks/api/use-projects'

export function ProjectModal() {
  const isOpen = useProjectsStore(state => state.isProjectModalOpen)
  const editingId = useProjectsStore(state => state.editingProjectId)
  const setModal = useProjectsStore(state => state.setProjectModal)
  const { data: projects } = useProjects()
  
  const project = editingId ? projects?.data?.find(p => p.id === editingId) : null
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
            {isEditing ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the project information.' 
              : 'Add a new project to this client.'
            }
          </DialogDescription>
        </DialogHeader>
        <ProjectForm
          project={project}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  )
}
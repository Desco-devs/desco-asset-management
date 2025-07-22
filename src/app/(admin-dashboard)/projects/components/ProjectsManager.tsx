'use client'

import React from 'react'
import { LocationsTable } from './tables/LocationsTable'
import { ClientsTable } from './tables/ClientsTable'
import { ProjectsTable } from './tables/ProjectsTable'
import { LocationModal } from './modals/LocationModal'
import { ClientModal } from './modals/ClientModal'
import { ProjectModal } from './modals/ProjectModal'
import { useProjectsStore } from '@/stores/projects-store'

export function ProjectsManager() {
  const currentView = useProjectsStore(state => state.currentView)
  const selectedLocationId = useProjectsStore(state => state.selectedLocationId)
  const selectedClientId = useProjectsStore(state => state.selectedClientId)

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Navigation breadcrumb */}
      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        <span className={currentView === 'locations' ? 'text-foreground font-medium' : ''}>
          Locations
        </span>
        {(currentView === 'clients' || currentView === 'projects') && (
          <>
            <span>/</span>
            <span className={currentView === 'clients' ? 'text-foreground font-medium' : ''}>
              Clients
            </span>
          </>
        )}
        {currentView === 'projects' && (
          <>
            <span>/</span>
            <span className="text-foreground font-medium">Projects</span>
          </>
        )}
      </div>

      {/* Main content */}
      {currentView === 'locations' && (
        <LocationsTable selectedLocationId={selectedLocationId} />
      )}
      
      {currentView === 'clients' && (
        <ClientsTable />
      )}
      
      {currentView === 'projects' && (
        <ProjectsTable />
      )}

      {/* Modals */}
      <LocationModal />
      <ClientModal />
      <ProjectModal />
    </div>
  )
}
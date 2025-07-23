'use client'

import React, { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { LocationsTable } from './tables/LocationsTable'
import { ClientsTable } from './tables/ClientsTable'
import { ProjectsTable } from './tables/ProjectsTable'
import { LocationModal } from './modals/LocationModal'
import { ClientModal } from './modals/ClientModal'
import { ProjectModal } from './modals/ProjectModal'
import { TableSkeleton } from './TableSkeleton'
import { useProjectsStore } from '@/stores/projects-store'
import { useProjectsRealtime } from '@/hooks/api/use-projects-realtime'

export function ProjectsManager() {
  const [activeTab, setActiveTab] = React.useState('projects')
  
  // Setup realtime subscriptions for instant updates
  useProjectsRealtime()

  // Store actions
  const setProjectModal = useProjectsStore(state => state.setProjectModal)
  const setClientModal = useProjectsStore(state => state.setClientModal)  
  const setLocationModal = useProjectsStore(state => state.setLocationModal)

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h1 className="text-3xl font-bold">Projects Management</h1>
          <p className="text-muted-foreground">
            Manage projects, clients, and locations all in one place
          </p>
        </div>
        
        {/* Action Buttons Section - Mobile First */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => {
              if (activeTab === 'locations') setLocationModal(true)
              else if (activeTab === 'clients') setClientModal(true)
              else setProjectModal(true)
            }}
            className="gap-2 flex-1 sm:flex-none font-semibold"
          >
            <Plus className="h-4 w-4" />
            {activeTab === 'locations' ? 'Add Location' : 
             activeTab === 'clients' ? 'Add Client' : 
             'Add Project'}
          </Button>
        </div>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
        
        <TabsContent value="locations" className="space-y-4">
          <Suspense fallback={<TableSkeleton />}>
            <LocationsTable onSelectLocation={() => {}} selectedLocationId={null} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-4">
          <Suspense fallback={<TableSkeleton />}>
            <ClientsTable onSelectClient={() => {}} />
          </Suspense>
        </TabsContent>
        
        <TabsContent value="projects" className="space-y-4">
          <Suspense fallback={<TableSkeleton />}>
            <ProjectsTable />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <LocationModal />
      <ClientModal />
      <ProjectModal />
    </div>
  )
}
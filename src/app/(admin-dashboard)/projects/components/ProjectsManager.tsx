'use client'

import React, { Suspense } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Projects Management</h1>
        <p className="text-muted-foreground">
          Manage projects, clients, and locations all in one place
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
        <div className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>
        </div>
        
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
'use client'

import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LocationsTable } from './tables/LocationsTable'
import { ClientsTable } from './tables/ClientsTable'
import { ProjectsTable } from './tables/ProjectsTable'
import { LocationModal } from './modals/LocationModal'
import { ClientModal } from './modals/ClientModal'
import { ProjectModal } from './modals/ProjectModal'
import { useProjectsStore } from '@/stores/projects-store'

export function ProjectsManager() {
  const [activeTab, setActiveTab] = React.useState('projects')

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>
        
        <TabsContent value="locations" className="space-y-4">
          <LocationsTable onSelectLocation={() => {}} selectedLocationId={null} />
        </TabsContent>
        
        <TabsContent value="clients" className="space-y-4">
          <ClientsTable onSelectClient={() => {}} />
        </TabsContent>
        
        <TabsContent value="projects" className="space-y-4">
          <ProjectsTable />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <LocationModal />
      <ClientModal />
      <ProjectModal />
    </div>
  )
}
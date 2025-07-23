"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjectsRealtime } from "@/hooks/api/use-projects-realtime";
import React, { Suspense } from "react";
import { ClientModal } from "./modals/ClientModal";
import { LocationModal } from "./modals/LocationModal";
import { ProjectModal } from "./modals/ProjectModal";
import { ClientsTable } from "./tables/ClientsTable";
import { LocationsTable } from "./tables/LocationsTable";
import { ProjectsTable } from "./tables/ProjectsTable";
import { TableSkeleton } from "./TableSkeleton";

export function ProjectsManager() {
  const [activeTab, setActiveTab] = React.useState("projects");

  // Setup realtime subscriptions for instant updates
  useProjectsRealtime();

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
      </div>

      {/* Tabbed Interface */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-3"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4">
          <Suspense fallback={<TableSkeleton />}>
            <LocationsTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Suspense fallback={<TableSkeleton />}>
            <ClientsTable />
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
  );
}

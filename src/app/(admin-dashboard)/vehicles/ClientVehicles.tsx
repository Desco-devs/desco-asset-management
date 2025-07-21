"use client";

import { Suspense, useState } from "react";
import { useVehiclesList, useVehiclesReferenceData } from "@/hooks/useVehiclesData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import VehiclesList from "./VehiclesList";

function VehiclesSkeleton() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="mb-6 flex flex-wrap gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="p-0">
              <Skeleton className="h-48 w-full" />
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function VehiclesContent() {
  const [currentPage, setCurrentPage] = useState(1);
  const { vehicles, totalCount, totalPages, isLoading, error } = useVehiclesList(currentPage, 12);
  const { data: referenceData, isLoading: isReferenceLoading } = useVehiclesReferenceData();

  // Debug logging
  console.log('VehiclesContent Debug:', {
    vehicles,
    totalCount,
    totalPages,
    isLoading,
    error,
    vehiclesLength: vehicles?.length
  });

  const handleVehicleAdded = () => {
    // React Query will handle cache invalidation automatically
    setCurrentPage(1); // Reset to first page
  };

  if (isLoading || isReferenceLoading) {
    return <VehiclesSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load vehicles</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    projects = [],
    clients = [],
    locations = [],
    users = [],
    maintenanceReports = []
  } = referenceData || {};

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Vehicles</h1>
        <p className="text-muted-foreground">
          Manage your vehicle fleet ({totalCount} total vehicles)
        </p>
      </div>
      
      <VehiclesList
        vehicles={vehicles}
        clients={clients}
        locations={locations}
        projects={projects}
        users={users}
        maintenanceReports={maintenanceReports}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
        onVehicleAdded={handleVehicleAdded}
      />
    </div>
  );
}

export default function ClientVehicles() {
  return (
    <Suspense fallback={<VehiclesSkeleton />}>
      <VehiclesContent />
    </Suspense>
  );
}
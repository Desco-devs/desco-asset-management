"use client";

import VehicleModal from "@/app/(dashboard)/vehicles/vehicles-components/VehicleModal";
import VehicleCard from "@/components/assets/cards/VehicleCard";
import SharedFilters from "@/components/assets/filters/SharedFilters";
import { filterVehicles, hasActiveFilters } from "@/components/assets/utils/filterUtils";
import { useFilterState } from "@/hooks/assets/useFilterState";
import type { Vehicle, Client, Location, Project } from "@/types/assets";
import { useMemo, useState } from "react";

interface VehicleClientViewerProps {
  vehicles: Vehicle[];
  clients: Client[];
  locations: Location[];
  projects: Project[];
  newItemIds: Set<string>;
}

export default function VehicleClientViewer({
  vehicles,
  clients,
  locations,
  projects,
  newItemIds,
}: VehicleClientViewerProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter state management
  const { filterState, updateFilter, clearFilters } = useFilterState();

  // Filter vehicles based on selected filters and search query
  const filteredVehicles = useMemo(() => {
    return filterVehicles(vehicles, filterState);
  }, [vehicles, filterState]);

  // Get projects filtered by selected client and location
  const availableProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesClient =
        filterState.selectedClient === "all" ||
        project.client.uid === filterState.selectedClient;
      const projectClient = clients.find((c) => c.uid === project.client.uid);
      const matchesLocation =
        filterState.selectedLocation === "all" ||
        (projectClient && projectClient.location.uid === filterState.selectedLocation);

      return matchesClient && matchesLocation;
    });
  }, [projects, clients, filterState.selectedClient, filterState.selectedLocation]);

  // Check if any filters are active
  const activeFilters = hasActiveFilters(filterState);

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <SharedFilters
        clients={clients}
        locations={locations}
        projects={availableProjects}
        filterState={filterState}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={activeFilters}
        resultsCount={filteredVehicles.length}
        totalCount={vehicles.length}
      />

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle, index) => (
          <VehicleCard
            key={vehicle.uid || `vehicle-${index}`}
            vehicle={vehicle}
            isNew={newItemIds.has(vehicle.uid)}
            onClick={() => {
              setSelectedVehicle(vehicle);
              setIsModalOpen(true);
            }}
          />
        ))}
      </div>

      {filteredVehicles.length === 0 && (
        <div className="p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No vehicles found</p>
            <p className="text-sm">
              {filterState.searchQuery
                ? `No vehicles match your search "${filterState.searchQuery}"`
                : "No vehicles available to display"}
            </p>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      {selectedVehicle && (
        <VehicleModal
          vehicle={selectedVehicle}
          isOpen={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedVehicle(null);
            }
          }}
        />
      )}
    </div>
  );
}
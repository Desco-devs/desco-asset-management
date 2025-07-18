"use client";

import EquipmentModal from "@/app/(dashboard)/equipments/equipment-components/EquipmentModal";
import EquipmentCard from "@/components/assets/cards/EquipmentCard";
import SharedFilters from "@/components/assets/filters/SharedFilters";
import { filterEquipment, hasActiveFilters } from "@/components/assets/utils/filterUtils";
import { useFilterState } from "@/hooks/assets/useFilterState";
import type { Equipment, Client, Location, Project } from "@/types/assets";
import { useMemo, useState } from "react";

interface EquipmentClientViewerProps {
  equipment: Equipment[];
  clients: Client[];
  locations: Location[];
  projects: Project[];
  newItemIds: Set<string>;
}

export default function EquipmentClientViewer({
  equipment,
  clients,
  locations,
  projects,
  newItemIds,
}: EquipmentClientViewerProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter state management
  const { filterState, updateFilter, clearFilters } = useFilterState();

  // Filter equipment based on selected filters and search query
  const filteredEquipment = useMemo(() => {
    const filtered = filterEquipment(equipment, filterState);
    return filtered;
  }, [equipment, filterState]);

  // Get projects filtered by selected client and location
  const availableProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesClient =
        filterState.selectedClient === "all" || project.client.uid === filterState.selectedClient;
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
        resultsCount={filteredEquipment.length}
        totalCount={equipment.length}
      />

      {/* Equipment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipment.map((item, index) => (
          <EquipmentCard
            key={item.uid || `equipment-${index}`}
            equipment={item}
            isNew={newItemIds.has(item.uid)}
            reportCount={0}
            onClick={() => {
              setSelectedEquipment(item);
              setIsModalOpen(true);
            }}
          />
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No equipment found</p>
            <p className="text-sm">
              {filterState.searchQuery
                ? `No equipment matches your search "${filterState.searchQuery}"`
                : "No equipment available to display"}
            </p>
          </div>
        </div>
      )}

      {/* Equipment Modal */}
      {selectedEquipment && (
        <EquipmentModal
          equipment={selectedEquipment}
          isOpen={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedEquipment(null);
            }
          }}
        />
      )}

    </div>
  );
}
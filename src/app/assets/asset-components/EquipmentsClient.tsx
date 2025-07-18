"use client";

import EquipmentModal from "@/app/(dashboard)/equipments/equipment-components/EquipmentModal";
import { MaintenanceReport } from "@/app/(dashboard)/equipments/equipment-components/MaintenanceReportModal";
import ViewReportsModal from "@/app/(dashboard)/equipments/equipment-components/ViewReportsModal";
import EquipmentCard from "@/components/assets/cards/EquipmentCard";
import SharedFilters from "@/components/assets/filters/SharedFilters";
import { filterEquipment, hasActiveFilters } from "@/components/assets/utils/filterUtils";
import { useFilterState } from "@/hooks/assets/useFilterState";
import type { Equipment, Client, Location, Project } from "@/types/assets";
import { useEffect, useMemo, useState } from "react";

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

  // Maintenance reports states
  const [reportCounts, setReportCounts] = useState<{
    [equipmentId: string]: number;
  }>({});
  const [showViewReportsModal, setShowViewReportsModal] = useState(false);
  const [viewReportsEquipment, setViewReportsEquipment] =
    useState<Equipment | null>(null);
  const [viewReportsData, setViewReportsData] = useState<MaintenanceReport[]>(
    []
  );

  // Filter state management
  const { filterState, updateFilter, clearFilters } = useFilterState();

  // Filter equipment based on selected filters and search query
  const filteredEquipment = useMemo(() => {
    return filterEquipment(equipment, filterState);
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

  // Fetch report count for a specific equipment
  const fetchReportCount = async (equipmentId: string) => {
    if (!equipmentId || equipmentId === 'undefined') {
      return;
    }
    try {
      const response = await fetch(
        `/api/reports/equipment/${equipmentId}/count`
      );
      if (response.ok) {
        const data = await response.json();
        setReportCounts((prev) => ({ ...prev, [equipmentId]: data.count }));
      }
    } catch (error) {
      console.error("Error fetching report count:", error);
    }
  };

  // Fetch equipment reports for viewing
  const fetchEquipmentReports = async (
    equipmentId: string
  ): Promise<MaintenanceReport[]> => {
    if (!equipmentId || equipmentId === 'undefined') {
      return [];
    }
    try {
      const response = await fetch(`/api/reports/equipment/${equipmentId}`);
      if (response.ok) {
        const data = await response.json();
        return data.reports || [];
      }
    } catch (error) {
      console.error("Error fetching equipment reports:", error);
    }
    return [];
  };

  // Handle viewing maintenance reports
  const handleViewReports = async (
    e: React.MouseEvent,
    equipment: Equipment
  ) => {
    e.stopPropagation();
    const reports = await fetchEquipmentReports(equipment.uid);
    setViewReportsData(reports);
    setViewReportsEquipment(equipment);
    setShowViewReportsModal(true);
  };

  // Fetch report counts for all equipment when data loads
  useEffect(() => {
    const fetchAllReportCounts = async () => {
      for (const item of filteredEquipment) {
        if (item.uid && item.uid !== 'undefined') {
          await fetchReportCount(item.uid);
        }
      }
    };

    if (filteredEquipment.length > 0) {
      fetchAllReportCounts();
    }
  }, [filteredEquipment]);

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
            reportCount={reportCounts[item.uid] || 0}
            onClick={() => {
              setSelectedEquipment(item);
              setIsModalOpen(true);
            }}
            onViewReports={reportCounts[item.uid] > 0 ? (e) => handleViewReports(e, item) : undefined}
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

      {/* View Reports Modal */}
      {viewReportsEquipment && (
        <ViewReportsModal
          equipment={viewReportsEquipment}
          reports={viewReportsData}
          isOpen={showViewReportsModal}
          onOpenChange={(open) => {
            setShowViewReportsModal(open);
            if (!open) {
              setViewReportsEquipment(null);
              setViewReportsData([]);
            }
          }}
        />
      )}
    </div>
  );
}
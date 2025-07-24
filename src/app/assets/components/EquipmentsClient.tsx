"use client";

import EquipmentModal from "@/app/(admin-dashboard)/equipments/equipment-components/EquipmentModal";
import EquipmentCard from "@/components/assets/cards/EquipmentCard";
import EquipmentCardSkeleton from "@/components/assets/cards/EquipmentCardSkeleton";
import SharedFilters from "@/components/assets/filters/SharedFilters";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { Client, Location, Project } from "@/types/assets";
import { useMemo, useState } from "react";
import { useAssetsStore } from "../stores/assetsStore";
import { useEquipmentList } from "../hooks/useAssetsQueries";

interface EquipmentClientViewerProps {
  clients: Client[];
  locations: Location[];
  projects: Project[];
  totalEquipmentCount: number;
}

export default function EquipmentClientViewer({
  clients,
  locations,
  projects,
  totalEquipmentCount,
}: EquipmentClientViewerProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Zustand store for client state
  const {
    filters,
    setFilters,
    resetFilters,
    hasActiveFilters,
    getFilteredParams,
    ui: { currentPage, newItemIds },
    setCurrentPage,
  } = useAssetsStore();

  // TanStack Query for server state
  const {
    data: equipmentData,
    isLoading,
    isFetching,
    error,
  } = useEquipmentList(getFilteredParams(), currentPage);

  // Get projects filtered by selected client and location
  const availableProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesClient =
        filters.clientId === "" ||
        project.client.uid === filters.clientId;
      const projectClient = clients.find((c) => c.uid === project.client.uid);
      const matchesLocation =
        filters.locationId === "" ||
        (projectClient &&
          projectClient.location &&
          projectClient.location.uid === filters.locationId);

      return matchesClient && matchesLocation;
    });
  }, [
    projects,
    clients,
    filters.clientId,
    filters.locationId,
  ]);

  // Equipment data with fallbacks
  const equipment = equipmentData?.equipment || [];
  const totalPages = equipmentData?.totalPages || 1;
  const totalCount = equipmentData?.totalCount || totalEquipmentCount;

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters({ [key]: value });
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <SharedFilters
        clients={clients}
        locations={locations}
        projects={availableProjects}
        filterState={{
          searchQuery: filters.search,
          selectedLocation: filters.locationId || "all",
          selectedClient: filters.clientId || "all",
          selectedProject: filters.projectId || "all",
          selectedStatus: filters.status,
        }}
        onFilterChange={handleFilterChange}
        onClearFilters={resetFilters}
        hasActiveFilters={hasActiveFilters()}
        resultsCount={equipment.length}
        totalCount={totalCount}
      />

      {/* Equipment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading || isFetching ? (
          // Show skeleton cards while loading
          Array.from({ length: 12 }).map((_, index) => (
            <EquipmentCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          equipment.map((item: any, index: number) => (
            <EquipmentCard
              key={item.id || `equipment-${index}`}
              equipment={{
                uid: item.id,
                brand: item.brand || "Unknown",
                model: item.model || "Unknown Model",
                type: item.type || "Unknown Type",
                status: item.status,
                owner: item.owner || "Unknown Owner",
                image_url: item.image_url,
                insuranceExpirationDate: item.insurance_expiration_date || "",
                plateNumber: item.plate_number,
                remarks: item.remarks,
                originalReceiptUrl: item.original_receipt_url,
                equipmentRegistrationUrl: item.equipment_registration_url,
                thirdpartyInspectionImage: item.thirdparty_inspection_image,
                pgpcInspectionImage: item.pgpc_inspection_image,
                project: item.project
                  ? {
                      uid: item.project.id,
                      name: item.project.name,
                      client: item.project.client
                        ? {
                            uid: item.project.client.id,
                            name: item.project.client.name,
                            location: item.project.client.location
                              ? {
                                  uid: item.project.client.location.id,
                                  address: item.project.client.location.address,
                                }
                              : {
                                  uid: "unknown",
                                  address: "Unknown Location",
                                },
                          }
                        : {
                            uid: "unknown",
                            name: "Unknown Client",
                            location: {
                              uid: "unknown",
                              address: "Unknown Location",
                            },
                          },
                    }
                  : {
                      uid: "unknown",
                      name: "Unknown Project",
                      client: {
                        uid: "unknown",
                        name: "Unknown Client",
                        location: {
                          uid: "unknown",
                          address: "Unknown Location",
                        },
                      },
                    },
              }}
              isNew={newItemIds.has(item.id)}
              reportCount={item.maintenanceReportCount || 0}
              onClick={() => {
                setSelectedEquipment(item);
                setIsModalOpen(true);
              }}
            />
          ))
        )}
      </div>

      {equipment.length === 0 && !isLoading && (
        <div className="p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No equipment found</p>
            <p className="text-sm">
              {filters.search
                ? `No equipment matches your search "${filters.search}"`
                : "No equipment available to display"}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-8">
          <div className="text-center text-destructive">
            <p className="text-lg font-medium mb-2">Error loading equipment</p>
            <p className="text-sm">Please try again later.</p>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalCount > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center gap-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => handlePageChange(currentPage - 1)}
                  className={
                    currentPage <= 1
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => handlePageChange(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  }

                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    );
                  }

                  return null;
                }
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-50"
                      : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>

          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * 12 + 1} to{" "}
            {Math.min(currentPage * 12, totalCount)} of{" "}
            {totalCount} results
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

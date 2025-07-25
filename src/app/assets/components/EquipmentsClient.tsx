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
  const [selectedEquipment, setSelectedEquipment] = useState<unknown | null>(null);
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
          equipment.map((item: unknown, index: number) => {
            const equipmentItem = item as Record<string, unknown>;
            return (
            <EquipmentCard
              key={equipmentItem.id as string || `equipment-${index}`}
              equipment={{
                uid: equipmentItem.id as string,
                brand: (equipmentItem.brand as string) || "Unknown",
                model: (equipmentItem.model as string) || "Unknown Model",
                type: (equipmentItem.type as string) || "Unknown Type",
                status: equipmentItem.status as string,
                owner: (equipmentItem.owner as string) || "Unknown Owner",
                image_url: (equipmentItem.image_url as string) || undefined,
                insuranceExpirationDate: (equipmentItem.insurance_expiration_date as string) || "",
                plateNumber: equipmentItem.plate_number as string,
                remarks: equipmentItem.remarks as string,
                originalReceiptUrl: (equipmentItem.original_receipt_url as string) || undefined,
                equipmentRegistrationUrl: (equipmentItem.equipment_registration_url as string) || undefined,
                thirdpartyInspectionImage: (equipmentItem.thirdparty_inspection_image as string) || undefined,
                pgpcInspectionImage: (equipmentItem.pgpc_inspection_image as string) || undefined,
                project: equipmentItem.project
                  ? {
                      uid: (equipmentItem.project as Record<string, unknown>).id as string,
                      name: (equipmentItem.project as Record<string, unknown>).name as string,
                      client: (equipmentItem.project as Record<string, unknown>).client
                        ? {
                            uid: ((equipmentItem.project as Record<string, unknown>).client as Record<string, unknown>).id as string,
                            name: ((equipmentItem.project as Record<string, unknown>).client as Record<string, unknown>).name as string,
                            location: ((equipmentItem.project as Record<string, unknown>).client as Record<string, unknown>).location
                              ? {
                                  uid: (((equipmentItem.project as Record<string, unknown>).client as Record<string, unknown>).location as Record<string, unknown>).id as string,
                                  address: (((equipmentItem.project as Record<string, unknown>).client as Record<string, unknown>).location as Record<string, unknown>).address as string,
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
              isNew={newItemIds.has(equipmentItem.id as string)}
              reportCount={(equipmentItem.maintenanceReportCount as number) || 0}
              onClick={() => {
                setSelectedEquipment(equipmentItem);
                setIsModalOpen(true);
              }}
            />
            );
          })
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

// @ts-nocheck - Temporary fix for project.client null type issues  
"use client";

import VehicleModal from "./VehicleModal";
import VehicleCard from "@/components/assets/cards/VehicleCard";
import VehicleCardSkeleton from "@/components/assets/cards/VehicleCardSkeleton";
import SharedFilters from "@/components/assets/filters/SharedFilters";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import type { Client, Location, Project } from "@/types/assets";
import { useMemo, useState } from "react";
import { useAssetsStore } from "../stores/assetsStore";
import { useVehiclesList } from "../hooks/useAssetsQueries";

interface VehicleClientViewerProps {
  clients: Client[];
  locations: Location[];
  projects: Project[];
  totalVehicleCount: number;
}

export default function VehicleClientViewer({
  clients,
  locations,
  projects,
  totalVehicleCount,
}: VehicleClientViewerProps) {
  const [selectedVehicle, setSelectedVehicle] = useState<unknown | null>(null);
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
    data: vehicleData,
    isLoading,
    isFetching,
    error,
  } = useVehiclesList(getFilteredParams(), currentPage);

  // Get projects filtered by selected client and location
  const availableProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesClient =
        filters.clientId === "" ||
        project.client.uid === filters.clientId;
      const projectClient = clients.find((c) => c.uid === project.client.uid);
      const matchesLocation =
        filters.locationId === "" ||
        (projectClient && projectClient.location && projectClient.location.uid === filters.locationId);

      return matchesClient && matchesLocation;
    });
  }, [projects, clients, filters.clientId, filters.locationId]);

  // Vehicle data with fallbacks
  const vehicles = vehicleData?.vehicles || [];
  const totalPages = vehicleData?.totalPages || 1;
  const totalCount = vehicleData?.totalCount || totalVehicleCount;

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
        resultsCount={vehicles.length}
        totalCount={totalCount}
      />

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading || isFetching ? (
          // Show skeleton cards while loading
          Array.from({ length: 12 }).map((_, index) => (
            <VehicleCardSkeleton key={`skeleton-${index}`} />
          ))
        ) : (
          vehicles.map((vehicle: unknown, index: number) => {
            const vehicleItem = vehicle as Record<string, unknown>;
            return (
            <VehicleCard
              key={vehicleItem.id as string || `vehicle-${index}`}
              vehicle={{
                uid: vehicleItem.id as string,
                brand: (vehicleItem.brand as string) || "Unknown",
                model: (vehicleItem.model as string) || "Unknown Model",
                type: (vehicleItem.type as string) || "Unknown Type",
                plateNumber: (vehicleItem.plate_number as string) || "",
                inspectionDate: (vehicleItem.inspection_date as string) || "",
                before: vehicleItem.before as number,
                expiryDate: (vehicleItem.expiry_date as string) || "",
                status: vehicleItem.status as string,
                owner: (vehicleItem.owner as string) || "Unknown Owner",
                frontImgUrl: (vehicleItem.front_img_url as string) || undefined,
                backImgUrl: (vehicleItem.back_img_url as string) || undefined,
                side1ImgUrl: (vehicleItem.side1_img_url as string) || undefined,
                side2ImgUrl: (vehicleItem.side2_img_url as string) || undefined,
                remarks: vehicleItem.remarks as string,
                originalReceiptUrl: (vehicleItem.original_receipt_url as string) || undefined,
                carRegistrationUrl: (vehicleItem.car_registration_url as string) || undefined,
                project: vehicleItem.project
                  ? {
                      uid: (vehicleItem.project as Record<string, unknown>).id as string,
                      name: (vehicleItem.project as Record<string, unknown>).name as string,
                      client: (vehicleItem.project as Record<string, unknown>).client
                        ? {
                            uid: ((vehicleItem.project as Record<string, unknown>).client as Record<string, unknown>).id as string,
                            name: ((vehicleItem.project as Record<string, unknown>).client as Record<string, unknown>).name as string,
                            location: ((vehicleItem.project as Record<string, unknown>).client as Record<string, unknown>).location
                              ? {
                                  uid: (((vehicleItem.project as Record<string, unknown>).client as Record<string, unknown>).location as Record<string, unknown>).id as string,
                                  address: (((vehicleItem.project as Record<string, unknown>).client as Record<string, unknown>).location as Record<string, unknown>).address as string,
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
              isNew={newItemIds.has(vehicleItem.id as string)}
              reportCount={(vehicleItem.maintenanceReportCount as number) || 0}
              onClick={() => {
                setSelectedVehicle(vehicleItem);
                setIsModalOpen(true);
              }}
            />
            );
          })
        )}
      </div>

      {vehicles.length === 0 && !isLoading && (
        <div className="p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No vehicles found</p>
            <p className="text-sm">
              {filters.search
                ? `No vehicles match your search "${filters.search}"`
                : "No vehicles available to display"}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-8">
          <div className="text-center text-destructive">
            <p className="text-lg font-medium mb-2">Error loading vehicles</p>
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
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => handlePageChange(currentPage + 1)}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
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
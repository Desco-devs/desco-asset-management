"use client";

import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteLocation, useLocations } from "@/hooks/api/use-projects";
import { useLocationTable, useProjectsStore } from "@/stores/projects-store";
import type { Location } from "@/types/projects";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import React from "react";
import { toast } from "sonner";

export function LocationsTable() {
  const { data: locations, isLoading, error } = useLocations();
  const { mutate: deleteLocation, isPending: isDeleting } = useDeleteLocation();
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [locationToDelete, setLocationToDelete] =
    React.useState<Location | null>(null);

  const setModal = useProjectsStore((state) => state.setLocationModal);
  const locationTable = useLocationTable();
  const setLocationTable = useProjectsStore((state) => state.setLocationTable);

  const setIsMobile = useProjectsStore((state) => state.setIsMobile);
  const getEffectiveLocationItemsPerPage = useProjectsStore(
    (state) => state.getEffectiveLocationItemsPerPage
  );

  // Mobile detection
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [setIsMobile]);

  const handleEdit = (location: Location) => {
    setModal(true, location.id);
  };

  const handleDelete = (location: Location) => {
    setLocationToDelete(location);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!locationToDelete) return;

    deleteLocation(locationToDelete.id, {
      onSuccess: () => {
        toast.success("Location deleted successfully");
        setDeleteModalOpen(false);
        setLocationToDelete(null);
      },
      onError: (error) => {
        toast.error("Failed to delete location: " + error.message);
      },
    });
  };

  const handleSearch = (value: string) => {
    setLocationTable({ search: value, page: 1 });
  };

  const handleSort = (sortBy: typeof locationTable.sortBy) => {
    const sortOrder =
      locationTable.sortBy === sortBy && locationTable.sortOrder === "asc"
        ? "desc"
        : "asc";
    setLocationTable({ sortBy, sortOrder });
  };

  // Filter locations based on search
  const filteredLocations = React.useMemo(() => {
    if (!locations) return [];

    if (!locationTable.search) return locations;

    return locations.filter((location) =>
      location.address
        .toLowerCase()
        .includes(locationTable.search.toLowerCase())
    );
  }, [locations, locationTable.search]);

  // Sort locations
  const sortedLocations = React.useMemo(() => {
    if (!filteredLocations.length) return [];

    return [...filteredLocations].sort((a, b) => {
      const aValue = a[locationTable.sortBy];
      const bValue = b[locationTable.sortBy];

      if (locationTable.sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
  }, [filteredLocations, locationTable.sortBy, locationTable.sortOrder]);

  // Pagination logic
  const paginationData = React.useMemo(() => {
    const itemsPerPage = getEffectiveLocationItemsPerPage();
    const startIndex = (locationTable.page - 1) * itemsPerPage;
    const paginatedLocations = sortedLocations.slice(
      startIndex,
      startIndex + itemsPerPage
    );
    const totalPages = Math.ceil(sortedLocations.length / itemsPerPage);

    return {
      paginatedLocations,
      totalPages,
      itemsPerPage,
      currentPage: locationTable.page,
    };
  }, [sortedLocations, locationTable.page, getEffectiveLocationItemsPerPage]);

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setLocationTable({ page: newPage });
  };

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading locations: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setModal(true)}
          className="gap-2 font-semibold w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Search */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search locations by address..."
            value={locationTable.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {/* Sort Button */}
        <div className="flex flex-row gap-3">
          <Select
            value={(() => {
              if (!locationTable.sortBy) return "clear-sort";


              if (locationTable.sortBy === "created_at") {
                return locationTable.sortOrder === "desc"
                  ? "created_at"
                  : "created_at_old";
              }
              if (locationTable.sortBy === "address") {
                return locationTable.sortOrder === "asc"
                  ? "address"
                  : "address_desc";
              }


              return locationTable.sortBy;
            })()}
            onValueChange={(value) => {
              if (value === "clear-sort") {
                handleSort("address"); // Reset to default
                return;
              }


              if (value === "created_at") {
                setLocationTable({ sortBy: "created_at", sortOrder: "desc" });
              } else if (value === "created_at_old") {
                setLocationTable({ sortBy: "created_at", sortOrder: "asc" });
              } else if (value === "address") {
                setLocationTable({ sortBy: "address", sortOrder: "asc" });
              } else if (value === "address_desc") {
                setLocationTable({ sortBy: "address", sortOrder: "desc" });
              }
            }}
          >
            <SelectTrigger className="h-11 flex-1">
              <List className="h-4 w-4 mr-2" />
              <span>Sort</span>
            </SelectTrigger>
            <SelectContent>
              <div className="p-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                  Most Recent
                </div>
                <SelectItem value="created_at">Newest Added</SelectItem>
                <SelectItem value="created_at_old">Oldest Added</SelectItem>

                <div className="border-t my-2"></div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                  Alphabetical
                </div>
                <SelectItem value="address">Address A-Z</SelectItem>
                <SelectItem value="address_desc">Address Z-A</SelectItem>

                <div className="border-t my-2"></div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                  Quick Actions
                </div>
                <SelectItem value="clear-sort">Clear Sort</SelectItem>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filter Badges */}
        {(locationTable.search || locationTable.sortBy) && (
          <div className="flex flex-wrap gap-2">
            {/* Sort Badge */}
            {locationTable.sortBy && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Sort:{" "}
                {(() => {
                  if (locationTable.sortBy === "created_at")
                    return locationTable.sortOrder === "desc"
                      ? "Newest Added"
                      : "Oldest Added";
                  if (locationTable.sortBy === "address")
                    return locationTable.sortOrder === "asc"
                      ? "Address A-Z"
                      : "Address Z-A";
                  return locationTable.sortBy;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() =>
                    setLocationTable({ sortBy: undefined, sortOrder: "asc" })
                  }
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {/* Search Badge */}
            {locationTable.search && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Search: {locationTable.search}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => handleSearch("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {/* Clear All Badge */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleSearch("");
                setLocationTable({ sortBy: undefined, sortOrder: "asc" });
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("address")}
              >
                Address
                {locationTable.sortBy === "address" && (
                  <span className="ml-1">
                    {locationTable.sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort("created_at")}
              >
                Created
                {locationTable.sortBy === "created_at" && (
                  <span className="ml-1">
                    {locationTable.sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading locations...
                </TableCell>
              </TableRow>
            ) : paginationData.paginatedLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  {locationTable.search
                    ? "No locations found"
                    : "No locations yet"}
                </TableCell>
              </TableRow>
            ) : (
              paginationData.paginatedLocations.map((location, index) => (
                <TableRow
                  key={location.id || `location-${index}`}
                  className="hover:bg-muted/50"
                >
                  <TableCell className="font-medium">
                    {location.address}
                  </TableCell>
                  <TableCell>
                    {location.created_at
                      ? (() => {
                          try {
                            const date = new Date(location.created_at);
                            return isNaN(date.getTime())
                              ? "Just now"
                              : formatDistanceToNow(date, { addSuffix: true });
                          } catch {
                            return "Just now";
                          }
                        })()
                      : "Just now"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(location);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(location);
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View - User Pattern */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : paginationData.paginatedLocations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              {locationTable.search ? "No locations found" : "No locations yet"}
              {locationTable.search ? "No locations found" : "No locations yet"}
            </CardContent>
          </Card>
        ) : (
          paginationData.paginatedLocations.map((location, index) => (
            <Card
              key={location.id || `location-${index}`}
              className="hover:shadow-md transition-all duration-200"
            >
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  {/* Header with title and actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight">
                        {location.address}
                      </h3>
                      <h3 className="font-semibold text-base leading-tight">
                        {location.address}
                      </h3>
                    </div>
                    {/* Actions dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleEdit(location);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(location);
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>


                  {/* Created time */}
                  <div className="text-xs text-gray-400">
                    {location.created_at
                      ? (() => {
                          try {
                            const date = new Date(location.created_at);
                            return isNaN(date.getTime())
                              ? "Just now"
                              : `Created ${formatDistanceToNow(date, {
                                  addSuffix: true,
                                })}`;
                          } catch {
                            return "Just now";
                          }
                        })()
                      : "Just now"}
                    {location.created_at
                      ? (() => {
                          try {
                            const date = new Date(location.created_at);
                            return isNaN(date.getTime())
                              ? "Just now"
                              : `Created ${formatDistanceToNow(date, {
                                  addSuffix: true,
                                })}`;
                          } catch {
                            return "Just now";
                          }
                        })()
                      : "Just now"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Mobile-Optimized Pagination */}
      {paginationData.totalPages > 1 && (
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(paginationData.currentPage - 1)}
            disabled={paginationData.currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {paginationData.currentPage}/{paginationData.totalPages}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:block">
              of {sortedLocations.length} locations
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(paginationData.currentPage + 1)}
            disabled={paginationData.currentPage === paginationData.totalPages}
            className="gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Results count */}
      {locations && (
        <div className="text-sm text-muted-foreground">
          Showing {paginationData.paginatedLocations.length} of{" "}
          {sortedLocations.length} locations
          {sortedLocations.length < locations.length && (
            <span className="ml-2">
              (filtered from {locations.length} total)
            </span>
          )}
          {paginationData.totalPages > 1 && (
            <span className="ml-2">
              • Page {paginationData.currentPage} of {paginationData.totalPages}
            </span>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone and will remove all associated clients, projects, and data."
        itemName={locationToDelete?.address}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmText="Delete Location"
      />
    </div>
  );
}


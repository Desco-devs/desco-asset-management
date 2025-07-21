"use client";

import { useEffect } from "react";
import { Eye, Search, Filter, Plus } from "lucide-react";
import { useVehiclesStore, selectFilterInfo, selectIsMobile } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData, useSupabaseRealtime } from "@/hooks/useVehiclesQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";

export default function VehiclesListModern() {
  // TanStack Query - Server state
  const { vehicles, projects, isLoading, isError, error } = useVehiclesWithReferenceData();
  
  // Supabase realtime integration
  const { isConnected } = useSupabaseRealtime();
  
  // Simplified state access - no complex selectors
  const currentPage = useVehiclesStore(state => state.currentPage);
  const searchQuery = useVehiclesStore(state => state.searchQuery);
  const filterStatus = useVehiclesStore(state => state.filterStatus);
  const isMobile = useVehiclesStore(state => state.isMobile);
  
  // Simple pagination
  const itemsPerPage = isMobile ? 6 : 12;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehicles = vehicles.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(vehicles.length / itemsPerPage);
  
  // Zustand actions
  const {
    setSelectedVehicle,
    setIsModalOpen,
    setIsCreateModalOpen,
    setCurrentPage,
    setIsMobile,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setFilterStatus,
    setFilterProject,
    resetFilters
  } = useVehiclesStore();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  const handleVehicleClick = (vehicle: any) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (isError) {
    return <ErrorState error={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Real-time connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPERATIONAL">Operational</SelectItem>
            <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
          </SelectContent>
        </Select>

        <div className="col-span-2 text-sm text-muted-foreground">
          More filters coming in next features
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, vehicles.length)} of {vehicles.length} vehicles
        </div>
      </div>

      {/* Vehicle Cards */}
      <div className="space-y-4">
        {paginatedVehicles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-muted-foreground">
              No vehicles found. Add your first vehicle to get started.
            </div>
          </div>
        ) : (
          paginatedVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="group border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleVehicleClick(vehicle)}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left column: Vehicle Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-muted-foreground">Plate: {vehicle.plate_number}</p>
                    <p className="text-muted-foreground">Type: {vehicle.type}</p>
                    <p className="text-muted-foreground">Owner: {vehicle.owner}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-5 w-5 text-primary" />
                  </div>
                </div>

                {/* Middle column: Project Info */}
                <div>
                  <p className="text-sm text-muted-foreground">Project:</p>
                  <p className="font-medium">{vehicle.project?.name || 'No project'}</p>
                  <p className="text-sm text-muted-foreground">Client:</p>
                  <p className="font-medium">{vehicle.project?.client?.name || 'No client'}</p>
                  <p className="text-sm text-muted-foreground">Location:</p>
                  <p className="font-medium">{vehicle.project?.client?.location?.address || 'No location'}</p>
                </div>

                {/* Right column: Status & Dates */}
                <div>
                  <p className="text-sm text-muted-foreground">Status:</p>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    vehicle.status === 'OPERATIONAL' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {vehicle.status}
                  </span>
                  <p className="text-sm text-muted-foreground mt-2">Inspection:</p>
                  <p className="text-sm">{new Date(vehicle.inspection_date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Expiry:</p>
                  <p className="text-sm">{new Date(vehicle.expiry_date).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Before: {vehicle.before} days</p>
                </div>
              </div>

              {/* Remarks section */}
              {vehicle.remarks && (
                <div className="mt-4 p-3 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">Remarks:</p>
                  <p className="text-sm">{vehicle.remarks}</p>
                </div>
              )}

              {/* Footer with creation date */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(vehicle.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
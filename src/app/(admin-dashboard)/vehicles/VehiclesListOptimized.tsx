"use client";

import { useState, useEffect } from "react";
import { useVehiclesOptimized, useVehiclesPagination, useVehiclesRealtime, Vehicle } from "@/hooks/useVehiclesOptimized";
import VehicleModal from "./VehicleModal";
import CreateVehicleDialog from "./CreateVehicleDialog";
import { Eye } from "lucide-react";

export default function VehiclesListOptimized() {
  // React Query data fetching
  const { data, isLoading, error } = useVehiclesOptimized();
  
  // Extract data with fallbacks
  const {
    vehicles: allVehicles = [],
    projects = [],
    clients = [],
    locations = [],
    users = [],
    maintenanceReports = [],
    totalCount = 0
  } = data || {};

  // Use React Query data directly instead of local state
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingPage, setIsLoadingPage] = useState(false);

  // Pagination logic using React Query data directly
  const {
    currentPage,
    setCurrentPage,
    currentPageData,
    totalPages,
    effectiveItemsPerPage,
    isMobile,
    loadPage
  } = useVehiclesPagination(allVehicles, 12);

  // Simplified realtime that just invalidates React Query cache
  const { isRealtimeConnected } = useVehiclesRealtime(
    allVehicles,
    () => {}, // No setter needed, React Query handles updates
    projects,
    clients,
    currentPage,
    effectiveItemsPerPage
  );

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  // Loading states
  if (isLoading) {
    return (
      <div className="h-full container mx-auto py-[5dvh]">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading vehicles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full container mx-auto py-[5dvh]">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to Load Vehicle Data
            </h3>
            <p className="text-gray-500 mb-4">{error instanceof Error ? error.message : 'An error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <p className="text-gray-600">Total vehicles: {totalCount}</p>
          <div className="flex items-center gap-2">
            <div 
              className={`w-2 h-2 rounded-full ${
                isRealtimeConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-500">
              {isRealtimeConnected ? 'Real-time connected' : 'Real-time disconnected'}
            </span>
          </div>
        </div>
        
        {/* Add Vehicle Button */}
        <CreateVehicleDialog 
          projects={projects.map(p => ({
            id: p.id,
            name: p.name
          }))}
        />
      </div>

      {/* Skeleton loading while loading new page */}
      {isLoadingPage ? (
        <div className="space-y-4">
          {Array.from({ length: effectiveItemsPerPage }).map((_, index) => (
            <div key={`skeleton-${currentPage}-${isMobile ? 'mobile' : 'desktop'}-${index}`} className="border rounded-lg p-4 bg-white shadow-sm animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="h-6 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-1 w-1/3"></div>
                  <div className="h-5 bg-gray-200 rounded"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-16 bg-gray-200 rounded"></div>
                  <div className="h-8 w-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Vehicle Cards - matching your original design */}
          {currentPageData.map((vehicle) => (
            <div 
              key={vehicle.id} 
              className="group border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => handleVehicleClick(vehicle)}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Left column: Vehicle Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <p className="text-gray-600">Plate: {vehicle.plate_number}</p>
                    <p className="text-gray-600">Type: {vehicle.type}</p>
                    <p className="text-gray-600">Owner: {vehicle.owner}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-5 w-5 text-blue-500" />
                  </div>
                </div>
                
                {/* Middle column: Project Info */}
                <div>
                  <p className="text-sm text-gray-500">Project:</p>
                  <p className="font-medium">{vehicle.project?.name || 'Loading...'}</p>
                  <p className="text-sm text-gray-500">Client:</p>
                  <p className="font-medium">{vehicle.project?.client?.name || 'Loading...'}</p>
                  <p className="text-sm text-gray-500">Location:</p>
                  <p className="font-medium">{vehicle.project?.client?.location?.address || 'Loading...'}</p>
                </div>
                
                {/* Right column: Status & Dates */}
                <div>
                  <p className="text-sm text-gray-500">Status:</p>
                  <span className={`inline-block px-2 py-1 rounded text-sm font-medium ${
                    vehicle.status === 'OPERATIONAL' ? 'bg-green-100 text-green-800' :
                    vehicle.status === 'NON_OPERATIONAL' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {vehicle.status}
                  </span>
                  <p className="text-sm text-gray-500 mt-2">Inspection:</p>
                  <p className="text-sm">{new Date(vehicle.inspection_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">Expiry:</p>
                  <p className="text-sm">{new Date(vehicle.expiry_date).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">Before: {vehicle.before} days</p>
                </div>
              </div>
              
              {/* Remarks section */}
              {vehicle.remarks && (
                <div className="mt-4 p-3 bg-gray-50 rounded">
                  <p className="text-sm text-gray-500">Remarks:</p>
                  <p className="text-sm">{vehicle.remarks}</p>
                </div>
              )}
              
              {/* Footer with creation date */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  Created: {new Date(vehicle.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoadingPage && totalCount > effectiveItemsPerPage && (
        <div className="mt-6 flex flex-col items-center space-y-4">
          <div className="text-sm text-gray-700 text-center">
            Showing {((currentPage - 1) * effectiveItemsPerPage) + 1} to {Math.min(currentPage * effectiveItemsPerPage, totalCount)} of {totalCount} vehicles
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Previous Button */}
            <button
              onClick={() => loadPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 md:px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {isMobile ? '←' : 'Previous'}
            </button>
            
            {/* Page numbers - simplified for mobile */}
            {Array.from({ length: Math.ceil(totalCount / effectiveItemsPerPage) }, (_, i) => i + 1)
              .filter(page => {
                const totalPages = Math.ceil(totalCount / effectiveItemsPerPage);
                if (isMobile) {
                  // Mobile: Show fewer page numbers
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 1;
                } else {
                  // Desktop: Show more page numbers
                  return page === 1 || 
                         page === totalPages || 
                         Math.abs(page - currentPage) <= 2;
                }
              })
              .map((page, index, filteredPages) => {
                const showEllipsis = index > 0 && page - filteredPages[index - 1] > 1;
                return (
                  <div key={page} className="flex items-center space-x-2">
                    {showEllipsis && <span className="text-gray-400">...</span>}
                    <button
                      onClick={() => loadPage(page)}
                      className={`px-2 md:px-3 py-1 text-sm border rounded hover:bg-gray-50 ${
                        currentPage === page 
                          ? 'bg-blue-500 text-white border-blue-500' 
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
            
            {/* Next Button */}
            <button
              onClick={() => loadPage(currentPage + 1)}
              disabled={currentPage === Math.ceil(totalCount / effectiveItemsPerPage)}
              className="px-2 md:px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              {isMobile ? '→' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Vehicle Modal */}
      <VehicleModal
        vehicle={selectedVehicle}
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        projects={projects}
        locations={locations}
        users={users}
        initialMaintenanceReports={maintenanceReports}
      />
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Eye, Search, Filter, Plus, Download, Car, List, X } from "lucide-react";
import { useVehiclesStore, selectFilterInfo, selectIsMobile } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData, useSupabaseRealtime } from "@/hooks/useVehiclesQuery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import LoadingSkeleton from "./LoadingSkeleton";
import ErrorState from "./ErrorState";
import VehicleFiltersAdvanced from "./components/VehicleFiltersAdvanced";
import { ExportDialog } from "./components/ExportDialog";

export default function VehiclesListModern() {
  // TanStack Query - Server state
  const { vehicles, projects, maintenanceReports, isLoading, isError, error } = useVehiclesWithReferenceData();
  
  // Supabase Realtime - Live updates
  const { isConnected } = useSupabaseRealtime();
  
  
  // Use store state directly and compute results
  const currentPage = useVehiclesStore(state => state.currentPage);
  const searchQuery = useVehiclesStore(state => state.searchQuery);
  const filterStatus = useVehiclesStore(state => state.filterStatus);
  const filterProject = useVehiclesStore(state => state.filterProject);
  const filterType = useVehiclesStore(state => state.filterType);
  const filterOwner = useVehiclesStore(state => state.filterOwner);
  const filterMaintenance = useVehiclesStore(state => state.filterMaintenance);
  const isMobile = useVehiclesStore(state => state.isMobile);
  const isExportModalOpen = useVehiclesStore(state => state.isExportModalOpen);
  
  // Get store functions once
  const getFilteredVehicles = useVehiclesStore(state => state.getFilteredVehicles);
  const getSortedVehicles = useVehiclesStore(state => state.getSortedVehicles);
  const getPaginatedVehicles = useVehiclesStore(state => state.getPaginatedVehicles);
  const getTotalPages = useVehiclesStore(state => state.getTotalPages);
  const getEffectiveItemsPerPage = useVehiclesStore(state => state.getEffectiveItemsPerPage);
  
  // Compute results using the functions with current vehicles data (including maintenance reports)
  const filtered = getFilteredVehicles(vehicles, maintenanceReports);
  
  // Apply sorting manually since getSortedVehicles re-filters
  const sortBy = useVehiclesStore(state => state.sortBy);
  const sortOrder = useVehiclesStore(state => state.sortOrder);
  
  const sorted = sortBy ? [...filtered].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'brand':
        aValue = a.brand.toLowerCase();
        bValue = b.brand.toLowerCase();
        break;
      case 'model':
        aValue = a.model.toLowerCase();
        bValue = b.model.toLowerCase();
        break;
      case 'plate_number':
        aValue = a.plate_number.toLowerCase();
        bValue = b.plate_number.toLowerCase();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'expiry_date':
        aValue = new Date(a.expiry_date);
        bValue = new Date(b.expiry_date);
        break;
      case 'created_at':
        aValue = new Date(a.created_at);
        bValue = new Date(b.created_at);
        break;
      case 'owner':
        aValue = a.owner.toLowerCase();
        bValue = b.owner.toLowerCase();
        break;
      default:
        return 0;
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  }) : filtered;
  
  const filteredVehicles = sorted;
  const itemsPerPage = getEffectiveItemsPerPage();
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVehicles = sorted.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  
  // Zustand actions
  const {
    setSelectedVehicle,
    setIsModalOpen,
    setIsCreateModalOpen,
    setIsExportModalOpen,
    setCurrentPage,
    setIsMobile,
    setSearchQuery,
    setSortBy,
    setSortOrder,
    setFilterStatus,
    setFilterProject,
    setFilterType,
    setFilterOwner,
    setFilterMaintenance,
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
    <div className="space-y-6 md:space-y-8">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="h-7 w-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Vehicle Management</h1>
        </div>
        
        {/* Realtime Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
          <span className="text-xs text-muted-foreground">
            {isConnected ? 'Live' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2 flex-1 sm:flex-none font-semibold">
          <Plus className="h-4 w-4" />
          Add New Vehicle
        </Button>
        <Button 
          variant="outline" 
          onClick={() => setIsExportModalOpen(true)} 
          className="gap-2 flex-1 sm:flex-none font-medium"
          disabled={vehicles.length === 0}
        >
          <Download className="h-4 w-4" />
          Export Maintenance Report
        </Button>
      </div>

      {/* Search, Filter & Sort Section */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isMobile ? "Search vehicles..." : "Search vehicles by brand, model, plate, owner, project, client, location..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {/* Sort and Filter Buttons */}
        <div className="flex gap-3">
          {/* Filter Button */}
          <Select value={(() => {
            // Return compound value to match filter dropdown options
            if (filterStatus === 'OPERATIONAL') return 'status-operational';
            if (filterStatus === 'NON_OPERATIONAL') return 'status-non-operational';
            if (filterMaintenance === 'has_issues') return 'maintenance-has-issues';
            if (filterMaintenance === 'no_issues') return 'maintenance-no-issues';
            if (filterProject !== 'all') return `project-${filterProject}`;
            if (filterType !== 'all') return `type-${filterType}`;
            if (filterOwner !== 'all') return `owner-${filterOwner}`;
            return '';
          })()} onValueChange={(value) => {
            // Handle filter selections
            if (value === 'status-operational') setFilterStatus('OPERATIONAL');
            else if (value === 'status-non-operational') setFilterStatus('NON_OPERATIONAL');
            else if (value === 'maintenance-has-issues') setFilterMaintenance('has_issues');
            else if (value === 'maintenance-no-issues') setFilterMaintenance('no_issues');
            else if (value === 'clear-all') resetFilters();
            // Project filters
            else if (value.startsWith('project-')) {
              const projectId = value.replace('project-', '');
              setFilterProject(projectId);
            }
            // Type filters
            else if (value.startsWith('type-')) {
              const type = value.replace('type-', '');
              setFilterType(type);
            }
            // Owner filters  
            else if (value.startsWith('owner-')) {
              const owner = value.replace('owner-', '');
              setFilterOwner(owner);
            }
          }}>
            <SelectTrigger className="h-11 flex-1">
              <Filter className="h-4 w-4 mr-2" />
              <span>Filter</span>
            </SelectTrigger>
            <SelectContent className="w-80">
              <div className="p-3 max-h-96 overflow-y-auto">
                {/* Status Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</div>
                  <div className="space-y-1">
                    <SelectItem value="status-operational">Operational</SelectItem>
                    <SelectItem value="status-non-operational">Non-Operational</SelectItem>
                  </div>
                </div>

                {/* Project Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Projects</div>
                  <div className="space-y-1">
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={`project-${project.id}`}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </div>
                </div>

                {/* Vehicle Type Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vehicle Type</div>
                  <div className="space-y-1">
                    {[...new Set(vehicles?.map(v => v.type))].filter(Boolean).sort().map((type) => (
                      <SelectItem key={type} value={`type-${type}`}>
                        {type}
                      </SelectItem>
                    ))}
                  </div>
                </div>

                {/* Owner Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Owner</div>
                  <div className="space-y-1">
                    {[...new Set(vehicles?.map(v => v.owner))].filter(Boolean).sort().map((owner) => (
                      <SelectItem key={owner} value={`owner-${owner}`}>
                        {owner}
                      </SelectItem>
                    ))}
                  </div>
                </div>

                {/* Maintenance Status */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Maintenance</div>
                  <div className="space-y-1">
                    <SelectItem value="maintenance-has-issues">Has Open Issues</SelectItem>
                    <SelectItem value="maintenance-no-issues">No Issues</SelectItem>
                  </div>
                </div>
                
                <div className="border-t pt-3 mt-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Quick Actions</div>
                  <SelectItem value="clear-all">Clear All Filters</SelectItem>
                </div>
              </div>
            </SelectContent>
          </Select>

          {/* Sort Button */}
          <Select value={(() => {
            // Return compound value to match dropdown options
            if (!sortBy) return 'clear-sort';
            
            // Handle special cases with specific value mappings
            if (sortBy === 'created_at') {
              return sortOrder === 'desc' ? 'created_at' : 'created_at_old';
            }
            if (sortBy === 'expiry_date') {
              return sortOrder === 'asc' ? 'expiry_date' : 'expiry_date_late';
            }
            if (sortBy === 'status') {
              return sortOrder === 'asc' ? 'status' : 'status_issues';
            }
            
            // Handle other fields with _desc suffix
            if (sortOrder === 'desc') {
              return `${sortBy}_desc`;
            }
            
            return sortBy;
          })()} onValueChange={(value) => {
            console.log('🔄 Sort selection changed to:', value);
            
            // Handle clear sort
            if (value === 'clear-sort') {
              setSortBy('');
              setSortOrder('asc');
              return;
            }
            
            // Handle sort with direction
            if (value === 'created_at') {
              // Newest added (desc)
              setSortBy('created_at');
              setSortOrder('desc');
            } else if (value === 'created_at_old') {
              // Oldest added (asc)
              setSortBy('created_at');
              setSortOrder('asc');
            } else if (value === 'expiry_date') {
              // Expiring soon (asc)
              setSortBy('expiry_date');
              setSortOrder('asc');
            } else if (value === 'expiry_date_late') {
              // Expiring later (desc)
              setSortBy('expiry_date');
              setSortOrder('desc');
            } else if (value === 'status') {
              // Operational first (asc)
              setSortBy('status');
              setSortOrder('asc');
            } else if (value === 'status_issues') {
              // Issues first (desc)
              setSortBy('status');
              setSortOrder('desc');
            } else if (value.includes('_desc')) {
              // Generic desc handling
              const field = value.replace('_desc', '');
              setSortBy(field as any);
              setSortOrder('desc');
            } else {
              // Default asc handling
              setSortBy(value as any);
              setSortOrder('asc');
            }
          }}>
            <SelectTrigger className="h-11 flex-1">
              <List className="h-4 w-4 mr-2" />
              <span>Sort</span>
            </SelectTrigger>
            <SelectContent>
              <div className="p-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">Most Recent</div>
                <SelectItem value="created_at">Newest Added</SelectItem>
                <SelectItem value="created_at_old">Oldest Added</SelectItem>
                
                <div className="border-t my-2"></div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">By Priority</div>
                <SelectItem value="expiry_date">Expiring Soon</SelectItem>
                <SelectItem value="expiry_date_late">Expiring Later</SelectItem>
                <SelectItem value="status">Operational First</SelectItem>
                <SelectItem value="status_issues">Issues First</SelectItem>
                
                <div className="border-t my-2"></div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">Alphabetical</div>
                <SelectItem value="brand">Brand A-Z</SelectItem>
                <SelectItem value="brand_desc">Brand Z-A</SelectItem>
                <SelectItem value="model">Model A-Z</SelectItem>
                <SelectItem value="model_desc">Model Z-A</SelectItem>
                <SelectItem value="plate_number">Plate A-Z</SelectItem>
                <SelectItem value="plate_number_desc">Plate Z-A</SelectItem>
                <SelectItem value="owner">Owner A-Z</SelectItem>
                <SelectItem value="owner_desc">Owner Z-A</SelectItem>
                
                <div className="border-t my-2"></div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">Quick Actions</div>
                <SelectItem value="clear-sort">Clear Sort</SelectItem>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filter Badges */}
        {(filterStatus !== 'all' || filterProject !== 'all' || filterType !== 'all' || filterOwner !== 'all' || filterMaintenance !== 'all' || sortBy) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {/* Sort Badge */}
            {sortBy && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Sort: {(() => {
                  if (sortBy === 'created_at') return sortOrder === 'desc' ? 'Newest Added' : 'Oldest Added';
                  if (sortBy === 'expiry_date') return sortOrder === 'asc' ? 'Expiring Soon' : 'Expiring Later';
                  if (sortBy === 'status') return sortOrder === 'asc' ? 'Operational First' : 'Issues First';
                  if (sortBy === 'brand') return sortOrder === 'asc' ? 'Brand A-Z' : 'Brand Z-A';
                  if (sortBy === 'model') return sortOrder === 'asc' ? 'Model A-Z' : 'Model Z-A';
                  if (sortBy === 'plate_number') return sortOrder === 'asc' ? 'Plate A-Z' : 'Plate Z-A';
                  if (sortBy === 'owner') return sortOrder === 'asc' ? 'Owner A-Z' : 'Owner Z-A';
                  return sortBy;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setSortBy('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {/* Status Filter Badge */}
            {filterStatus !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Status: {filterStatus === 'OPERATIONAL' ? 'Operational' : 'Non-Operational'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterStatus('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {/* Project Filter Badge */}
            {filterProject !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Project: {projects?.find(p => p.id === filterProject)?.name || filterProject}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterProject('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {/* Type Filter Badge */}
            {filterType !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Type: {filterType}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterType('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {/* Owner Filter Badge */}
            {filterOwner !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Owner: {filterOwner}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterOwner('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {/* Maintenance Filter Badge */}
            {filterMaintenance !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Maintenance: {filterMaintenance === 'has_issues' ? 'Has Issues' : 'No Issues'}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterMaintenance('all')}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            
            {/* Clear All Badge */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Advanced Filters - Now integrated into Filter button above */}

      {/* Results Summary - Mobile Friendly */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
        <div className="text-xs md:text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{filteredVehicles.length}</span> vehicle{filteredVehicles.length !== 1 ? 's' : ''}
          {filteredVehicles.length !== vehicles.length && (
            <span className="text-muted-foreground/70"> of {vehicles.length}</span>
          )}
          <span className="hidden sm:inline text-muted-foreground/60 ml-2">
            • Sorted by {
              sortBy === 'created_at' ? 'date' :
              sortBy === 'brand' ? 'brand' :
              sortBy === 'model' ? 'model' :
              sortBy === 'plate_number' ? 'plate' :
              sortBy === 'status' ? 'status' :
              sortBy === 'expiry_date' ? 'expiry' : 'date'
            } ({sortOrder === 'desc' ? 'newest first' : 'oldest first'})
          </span>
        </div>
        {isMobile && (
          <Badge variant="secondary" className="text-xs">
            Page {currentPage}/{totalPages}
          </Badge>
        )}
      </div>

      {/* Vehicle Cards Grid - Following Equipment Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedVehicles.length === 0 ? (
          <div className="col-span-full">
            <Card className="py-12">
              <CardContent className="text-center">
                <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
                <div className="text-muted-foreground">
                  {filteredVehicles.length === 0 ? (
                    vehicles.length === 0 ? 
                      "No vehicles yet. Click 'Add New Vehicle' to get started!" :
                      "No vehicles match your filters. Try adjusting your search."
                  ) : (
                    "No vehicles on this page."
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          paginatedVehicles.map((vehicle) => (
            <Card
              key={vehicle.id}
              className="hover:shadow-lg transition-shadow cursor-pointer relative"
              onClick={() => handleVehicleClick(vehicle)}
            >
              <div className="p-3 pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="text-sm flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Car className="h-5 w-5" />
                        <span className="font-semibold">{vehicle.brand} {vehicle.model}</span>
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="font-medium text-gray-600 text-xs">
                      {vehicle.type}
                    </div>

                    {/* Status and Badges Row */}
                    <div className="flex flex-row flex-wrap gap-2">
                      <Badge className={vehicle.status === 'OPERATIONAL' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}>
                        {vehicle.status}
                      </Badge>

                      {vehicle.plate_number && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Car className="h-3 w-3" />
                          {vehicle.plate_number}
                        </Badge>
                      )}

                      {/* Expiry Badge */}
                      {vehicle.before <= 30 && (
                        <Badge className={vehicle.before <= 7 ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-orange-500 text-white hover:bg-orange-600'}>
                          {vehicle.before <= 7 ? 'Expired' : 'Expiring Soon'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 px-3">
                {/* Vehicle Image */}
                {vehicle.front_img_url && (
                  <div className="aspect-video bg-white rounded-md overflow-hidden">
                    <img
                      src={vehicle.front_img_url}
                      alt={`${vehicle.brand} ${vehicle.model}`}
                      className="w-full h-full object-contain object-center"
                      loading="lazy"
                    />
                  </div>
                )}

                {/* Placeholder if no image */}
                {!vehicle.front_img_url && (
                  <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                    <Car className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Vehicle Info Footer */}
                <div className="pb-3 border-t text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between pt-2">
                    <span>Owner:</span>
                    <span className="font-medium">{vehicle.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Project:</span>
                    <span className="font-medium truncate ml-2" title={vehicle.project?.name || 'Unassigned'}>
                      {vehicle.project?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Client:</span>
                    <span className="font-medium truncate ml-2" title={vehicle.project?.client?.name || 'No client'}>
                      {vehicle.project?.client?.name || 'No client'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Location:</span>
                    <span className="font-medium truncate ml-2" title={vehicle.project?.client?.location?.address || 'No location'}>
                      {vehicle.project?.client?.location?.address?.split(',')[0] || 'No location'}
                    </span>
                  </div>
                  {vehicle.expiry_date && (
                    <div className="flex justify-between">
                      <span>Expires:</span>
                      <span className={`font-medium ${
                        vehicle.before <= 7 ? 'text-red-600' : 
                        vehicle.before <= 30 ? 'text-orange-600' : ''
                      }`}>
                        {new Date(vehicle.expiry_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {vehicle.remarks && (
                    <div className="pt-2">
                      <div className="p-2 bg-muted/50 rounded text-sm">
                        <span className="text-muted-foreground">Note: </span>
                        <span className="text-foreground">{vehicle.remarks}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Mobile-Optimized Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {currentPage}/{totalPages}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:block">
              of {filteredVehicles.length} vehicles
            </span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
          </Button>
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        vehicles={vehicles.map(v => ({
          id: v.id,
          brand: v.brand,
          model: v.model,
          plate_number: v.plate_number
        }))}
      />
    </div>
  );
}
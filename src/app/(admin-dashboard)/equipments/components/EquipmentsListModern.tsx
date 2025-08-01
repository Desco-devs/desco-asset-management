"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { useEquipments } from "@/hooks/useEquipmentQuery";
import { useProjects } from "@/hooks/api/use-projects";
import { useEquipmentRealtime } from "@/hooks/useEquipmentRealtime";
import type { Equipment } from "@/types/equipment";
import { 
  useEquipmentStore, 
  selectCurrentPage,
  selectSearchQuery,
  selectFilterStatus,
  selectFilterProject,
  selectFilterType,
  selectFilterOwner,
  selectFilterMaintenance,
  selectIsMobile,
  selectSortBy,
  selectSortOrder,
  selectActiveModal
} from "@/stores/equipmentStore";
import {
  AlertTriangle,
  Wrench,
  Download,
  Eye,
  Filter,
  List,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useEffect } from "react";
import ErrorState from "./ui/ErrorState";
import LoadingSkeleton from "./ui/LoadingSkeleton";
import ExportDialog from "./ExportDialog";

export default function EquipmentsListModern() {
  // TanStack Query - Server state (standardized approach)
  const { data: equipments = [], isLoading, isError, error } = useEquipments();
  const { data: projects = [] } = useProjects();

  // Supabase Realtime - Live updates
  useEquipmentRealtime();
  const isConnected = true; // Always show connected since we're using realtime

  // Use store state with proper selectors
  const currentPage = useEquipmentStore(selectCurrentPage);
  const searchQuery = useEquipmentStore(selectSearchQuery);
  const filterStatus = useEquipmentStore(selectFilterStatus);
  const filterProject = useEquipmentStore(selectFilterProject);
  const filterType = useEquipmentStore(selectFilterType);
  const filterOwner = useEquipmentStore(selectFilterOwner);
  const filterMaintenance = useEquipmentStore(selectFilterMaintenance);
  const isMobile = useEquipmentStore(selectIsMobile);
  const isExportModalOpen = useEquipmentStore((state) => state.isExportModalOpen);

  // Helper function to check if equipment has maintenance issues
  const hasMaintenanceIssues = (equipment: Equipment) => {
    // Since Equipment type doesn't include maintenance_reports,
    // we'll return false for now. This can be enhanced later if needed.
    return false;
  };

  // Get store functions once
  const getFilteredEquipments = useEquipmentStore(
    (state) => state.getFilteredEquipments
  );
  const getEffectiveItemsPerPage = useEquipmentStore(
    (state) => state.getEffectiveItemsPerPage
  );

  // Compute results using the functions with current equipments data
  const filtered = getFilteredEquipments(equipments);

  // Get filtered and sorted equipments (store handles this internally)
  const filteredEquipments = filtered;
  
  // Get current sort state for UI display
  const sortBy = useEquipmentStore(selectSortBy);
  const sortOrder = useEquipmentStore(selectSortOrder);
  const itemsPerPage = getEffectiveItemsPerPage();
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEquipments = filteredEquipments.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(filteredEquipments.length / itemsPerPage);

  // Zustand actions
  const {
    setSelectedEquipment,
    setIsModalOpen,
    setIsCreateModalOpen,
    setActiveModal,
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
    resetFilters,
  } = useEquipmentStore();

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  const handleEquipmentClick = (equipment: Equipment) => {
    // Use unified modal coordination
    setActiveModal('equipment');
    setSelectedEquipment(equipment);
    setIsModalOpen(true);
  };

  // Helper function to calculate days until expiry
  const getDaysUntilExpiry = (expiryDate: string | Date | undefined) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
          <Wrench className="h-7 w-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Equipment Management
          </h1>
        </div>

        {/* Realtime Status Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? "bg-green-500" : "bg-gray-400"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isConnected ? "Live" : "Offline"}
          </span>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 flex-1 sm:flex-none font-semibold"
        >
          <Plus className="h-4 w-4" />
          Add New Equipment
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsExportModalOpen(true)}
          className="gap-2 flex-1 sm:flex-none font-medium"
          disabled={equipments.length === 0}
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
            placeholder={
              isMobile
                ? "Search equipment..."
                : "Search equipment by brand, model, type, owner, project, client, location..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {/* Sort and Filter Buttons */}
        <div className="flex gap-3">
          {/* Filter Button */}
          <Select
            value={(() => {
              // Return compound value to match filter dropdown options
              if (filterStatus === "OPERATIONAL") return "status-operational";
              if (filterStatus === "NON_OPERATIONAL")
                return "status-non-operational";
              if (filterMaintenance === "has_issues")
                return "maintenance-has-issues";
              if (filterMaintenance === "no_issues")
                return "maintenance-no-issues";
              if (filterProject !== "all") return `project-${filterProject}`;
              if (filterType !== "all") return `type-${filterType}`;
              if (filterOwner !== "all") return `owner-${filterOwner}`;
              return "";
            })()}
            onValueChange={(value) => {
              // Handle filter selections
              if (value === "status-operational")
                setFilterStatus("OPERATIONAL");
              else if (value === "status-non-operational")
                setFilterStatus("NON_OPERATIONAL");
              else if (value === "maintenance-has-issues")
                setFilterMaintenance("has_issues");
              else if (value === "maintenance-no-issues")
                setFilterMaintenance("no_issues");
              else if (value === "clear-all") resetFilters();
              // Project filters
              else if (value.startsWith("project-")) {
                const projectId = value.replace("project-", "");
                setFilterProject(projectId);
              }
              // Type filters
              else if (value.startsWith("type-")) {
                const type = value.replace("type-", "");
                setFilterType(type);
              }
              // Owner filters
              else if (value.startsWith("owner-")) {
                const owner = value.replace("owner-", "");
                setFilterOwner(owner);
              }
            }}
          >
            <SelectTrigger className="h-11 flex-1">
              <Filter className="h-4 w-4 mr-2" />
              <span>Filter</span>
            </SelectTrigger>
            <SelectContent className="w-80">
              <div className="p-3 max-h-96 overflow-y-auto">
                {/* Status Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Status
                  </div>
                  <div className="space-y-1">
                    <SelectItem value="status-operational">
                      Operational
                    </SelectItem>
                    <SelectItem value="status-non-operational">
                      Non-Operational
                    </SelectItem>
                  </div>
                </div>

                {/* Project Filter - Temporarily disabled for simplified implementation */}
                {/*
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Projects
                  </div>
                  <div className="space-y-1">
                    {projects?.map((project, index) => (
                      <SelectItem
                        key={project.id || `project-${index}`}
                        value={`project-${project.id}`}
                      >
                        {project.name}
                      </SelectItem>
                    ))}
                  </div>
                </div>
                */}

                {/* Equipment Type Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Equipment Type
                  </div>
                  <div className="space-y-1">
                    {[...new Set(equipments?.map((e) => e.type))]
                      .filter(Boolean)
                      .sort()
                      .map((type, index) => (
                        <SelectItem key={`type-${type}-${index}`} value={`type-${type}`}>
                          {type}
                        </SelectItem>
                      ))}
                  </div>
                </div>

                {/* Owner Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Owner
                  </div>
                  <div className="space-y-1">
                    {[...new Set(equipments?.map((e) => e.owner))]
                      .filter(Boolean)
                      .sort()
                      .map((owner, index) => (
                        <SelectItem key={`owner-${owner}-${index}`} value={`owner-${owner}`}>
                          {owner}
                        </SelectItem>
                      ))}
                  </div>
                </div>

                {/* Maintenance Status */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Maintenance
                  </div>
                  <div className="space-y-1">
                    <SelectItem value="maintenance-has-issues">
                      Has Open Issues
                    </SelectItem>
                    <SelectItem value="maintenance-no-issues">
                      No Issues
                    </SelectItem>
                  </div>
                </div>

                <div className="border-t pt-3 mt-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Quick Actions
                  </div>
                  <SelectItem value="clear-all">Clear All Filters</SelectItem>
                </div>
              </div>
            </SelectContent>
          </Select>

          {/* Sort Button */}
          <Select
            value={(() => {
              // Return compound value to match dropdown options
              if (!sortBy) return "clear-sort";

              // Handle special cases with specific value mappings
              if (sortBy === "insuranceExpirationDate") {
                return sortOrder === "asc" ? "insuranceExpirationDate" : "insuranceExpirationDate_late";
              }
              if (sortBy === "registrationExpiry") {
                return sortOrder === "asc" ? "registrationExpiry" : "registrationExpiry_late";
              }
              if (sortBy === "status") {
                return sortOrder === "asc" ? "status" : "status_issues";
              }

              // Handle other fields with _desc suffix
              if (sortOrder === "desc") {
                return `${sortBy}_desc`;
              }

              return sortBy;
            })()}
            onValueChange={(value) => {
              // Handle clear sort
              if (value === "clear-sort") {
                setSortBy("");
                setSortOrder("asc");
                return;
              }

              // Handle sort with direction
              if (value === "insuranceExpirationDate") {
                // Expiring soon (asc)
                setSortBy("insuranceExpirationDate");
                setSortOrder("asc");
              } else if (value === "insuranceExpirationDate_late") {
                // Expiring later (desc)
                setSortBy("insuranceExpirationDate");
                setSortOrder("desc");
              } else if (value === "registrationExpiry") {
                // Registration expiring soon (asc)
                setSortBy("registrationExpiry");
                setSortOrder("asc");
              } else if (value === "registrationExpiry_late") {
                // Registration expiring later (desc)
                setSortBy("registrationExpiry");
                setSortOrder("desc");
              } else if (value === "status") {
                // Operational first (asc)
                setSortBy("status");
                setSortOrder("asc");
              } else if (value === "status_issues") {
                // Issues first (desc)
                setSortBy("status");
                setSortOrder("desc");
              } else if (value.includes("_desc")) {
                // Generic desc handling
                const field = value.replace("_desc", "");
                setSortBy(field as "brand" | "status" | "insuranceExpirationDate" | "registrationExpiry" | "model" | "type" | "owner" | "");
                setSortOrder("desc");
              } else {
                // Default asc handling
                setSortBy(value as "brand" | "status" | "insuranceExpirationDate" | "registrationExpiry" | "model" | "type" | "owner" | "");
                setSortOrder("asc");
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
                  By Priority
                </div>
                <SelectItem value="insuranceExpirationDate">Insurance Expiring Soon</SelectItem>
                <SelectItem value="insuranceExpirationDate_late">Insurance Expiring Later</SelectItem>
                <SelectItem value="registrationExpiry">Registration Expiring Soon</SelectItem>
                <SelectItem value="registrationExpiry_late">Registration Expiring Later</SelectItem>
                <SelectItem value="status">Operational First</SelectItem>
                <SelectItem value="status_issues">Issues First</SelectItem>

                <div className="border-t my-2"></div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                  Alphabetical
                </div>
                <SelectItem value="brand">Brand A-Z</SelectItem>
                <SelectItem value="brand_desc">Brand Z-A</SelectItem>
                <SelectItem value="model">Model A-Z</SelectItem>
                <SelectItem value="model_desc">Model Z-A</SelectItem>
                <SelectItem value="type">Type A-Z</SelectItem>
                <SelectItem value="type_desc">Type Z-A</SelectItem>
                <SelectItem value="owner">Owner A-Z</SelectItem>
                <SelectItem value="owner_desc">Owner Z-A</SelectItem>

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
        {(filterStatus !== "all" ||
          filterProject !== "all" ||
          filterType !== "all" ||
          filterOwner !== "all" ||
          filterMaintenance !== "all" ||
          sortBy) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {/* Sort Badge */}
            {sortBy && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Sort:{" "}
                {(() => {
                  if (sortBy === "insuranceExpirationDate")
                    return sortOrder === "asc"
                      ? "Insurance Expiring Soon"
                      : "Insurance Expiring Later";
                  if (sortBy === "registrationExpiry")
                    return sortOrder === "asc"
                      ? "Registration Expiring Soon"
                      : "Registration Expiring Later";
                  if (sortBy === "status")
                    return sortOrder === "asc"
                      ? "Operational First"
                      : "Issues First";
                  if (sortBy === "brand")
                    return sortOrder === "asc" ? "Brand A-Z" : "Brand Z-A";
                  if (sortBy === "model")
                    return sortOrder === "asc" ? "Model A-Z" : "Model Z-A";
                  if (sortBy === "type")
                    return sortOrder === "asc" ? "Type A-Z" : "Type Z-A";
                  if (sortBy === "owner")
                    return sortOrder === "asc" ? "Owner A-Z" : "Owner Z-A";
                  return sortBy;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setSortBy("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {/* Status Filter Badge */}
            {filterStatus !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Status:{" "}
                {filterStatus === "OPERATIONAL"
                  ? "Operational"
                  : "Non-Operational"}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterStatus("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {/* Project Filter Badge */}
            {filterProject !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Project:{" "}
                filterProject
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterProject("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {/* Type Filter Badge */}
            {filterType !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Type: {filterType}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterType("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {/* Owner Filter Badge */}
            {filterOwner !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Owner: {filterOwner}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterOwner("all")}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}

            {/* Maintenance Filter Badge */}
            {filterMaintenance !== "all" && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Maintenance:{" "}
                {filterMaintenance === "has_issues"
                  ? "Has Issues"
                  : "No Issues"}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setFilterMaintenance("all")}
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

      {/* Results Summary - Mobile Friendly */}
      <div className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
        <div className="text-xs md:text-sm text-muted-foreground">
          <span className="font-medium text-foreground">
            {filteredEquipments.length}
          </span>{" "}
          equipment{filteredEquipments.length !== 1 ? "s" : ""}
          {filteredEquipments.length !== equipments.length && (
            <span className="text-muted-foreground/70">
              {" "}
              of {equipments.length}
            </span>
          )}
          <span className="hidden sm:inline text-muted-foreground/60 ml-2">
            • Sorted by{" "}
            {sortBy === "brand"
              ? "brand"
              : sortBy === "model"
              ? "model"
              : sortBy === "type"
              ? "type"
              : sortBy === "status"
              ? "status"
              : sortBy === "insuranceExpirationDate"
              ? "insurance expiry"
              : sortBy === "registrationExpiry"
              ? "registration expiry"
              : sortBy === "owner"
              ? "owner"
              : "default"}{" "}
            ({sortOrder === "desc" ? "Z-A" : "A-Z"})
          </span>
        </div>
        {isMobile && (
          <Badge variant="secondary" className="text-xs">
            Page {currentPage}/{totalPages}
          </Badge>
        )}
      </div>

      {/* Equipment Cards Grid - Following Vehicle Design */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {paginatedEquipments.length === 0 ? (
          <div className="col-span-full">
            <Card className="py-12">
              <CardContent className="text-center">
                <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No equipment found</h3>
                <div className="text-muted-foreground">
                  {filteredEquipments.length === 0
                    ? equipments.length === 0
                      ? "No equipment yet. Click 'Add New Equipment' to get started!"
                      : "No equipment matches your filters. Try adjusting your search."
                    : "No equipment on this page."}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          paginatedEquipments.map((equipment, index) => {
            const daysUntilInsuranceExpiry = getDaysUntilExpiry(equipment.insurance_expiration_date || undefined);
            const daysUntilRegistrationExpiry = getDaysUntilExpiry(equipment.registration_expiry || undefined);
            
            return (
              <Card
                key={equipment.id || `equipment-${index}`}
                className="hover:shadow-lg transition-shadow cursor-pointer relative"
                onClick={() => handleEquipmentClick(equipment)}
              >
                <div className="p-3 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <div className="text-sm flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-5 w-5" />
                          <span className="font-semibold">
                            {equipment.brand} {equipment.model}
                          </span>
                        </div>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="font-medium text-gray-600 text-xs">
                        {equipment.type}
                      </div>

                      {/* Status and Badges Row */}
                      <div className="flex flex-row flex-wrap gap-2">
                        <Badge
                          className={
                            equipment.status === "OPERATIONAL"
                              ? "bg-green-100 text-green-800 hover:bg-green-200"
                              : "bg-red-100 text-red-800 hover:bg-red-200"
                          }
                        >
                          {equipment.status}
                        </Badge>

                        {equipment.plate_number && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            <Wrench className="h-3 w-3" />
                            {equipment.plate_number}
                          </Badge>
                        )}

                        {/* Expiry Badge */}
                        {(daysUntilInsuranceExpiry !== null && daysUntilInsuranceExpiry <= 30) || 
                         (daysUntilRegistrationExpiry !== null && daysUntilRegistrationExpiry <= 30) ? (
                          <Badge
                            className={
                              (daysUntilInsuranceExpiry !== null && daysUntilInsuranceExpiry <= 7) ||
                              (daysUntilRegistrationExpiry !== null && daysUntilRegistrationExpiry <= 7)
                                ? "bg-red-500 text-white hover:bg-red-600"
                                : "bg-orange-500 text-white hover:bg-orange-600"
                            }
                          >
                            {((daysUntilInsuranceExpiry !== null && daysUntilInsuranceExpiry <= 0) ||
                              (daysUntilRegistrationExpiry !== null && daysUntilRegistrationExpiry <= 0))
                              ? "Expired" : "Expiring Soon"}
                          </Badge>
                        ) : null}

                        {/* Maintenance Issue Badge */}
                        {hasMaintenanceIssues(equipment) && (
                          <Badge className="bg-yellow-500 text-white hover:bg-yellow-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="hidden sm:inline">Maintenance Issue</span>
                            <span className="sm:hidden">Issue</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 px-3">
                  {/* Equipment Image */}
                  {equipment.image_url && (
                    <div className="aspect-video bg-white rounded-md overflow-hidden relative">
                      <Image
                        src={equipment.image_url}
                        alt={`${equipment.brand} ${equipment.model}`}
                        fill
                        className="object-contain object-center"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Placeholder if no image */}
                  {!equipment.image_url && (
                    <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                      <Wrench className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Equipment Info Footer */}
                  <div className="pb-3 border-t text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between pt-2">
                      <span>Owner:</span>
                      <span className="font-medium">{equipment.owner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Project:</span>
                      <span
                        className="font-medium truncate ml-2"
                        title={equipment.project?.name || "Unassigned"}
                      >
                        {equipment.project?.name || "Unassigned"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Client:</span>
                      <span
                        className="font-medium truncate ml-2"
                        title={equipment.project?.client?.name || "No client"}
                      >
                        {equipment.project?.client?.name || "No client"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Location:</span>
                      <span
                        className="font-medium truncate ml-2"
                        title={
                          equipment.project?.client?.location?.address ||
                          "No location"
                        }
                      >
                        {equipment.project?.client?.location?.address?.split(
                          ","
                        )[0] || "No location"}
                      </span>
                    </div>
                    {equipment.registration_expiry && (
                      <div className="flex justify-between">
                        <span>Registration Expires:</span>
                        <span
                          className={`font-medium ${
                            daysUntilRegistrationExpiry !== null && daysUntilRegistrationExpiry <= 7
                              ? "text-red-600"
                              : daysUntilRegistrationExpiry !== null && daysUntilRegistrationExpiry <= 30
                              ? "text-orange-600"
                              : ""
                          }`}
                        >
                          {new Date(equipment.registration_expiry).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {equipment.insurance_expiration_date && (
                      <div className="flex justify-between">
                        <span>Insurance Expires:</span>
                        <span
                          className={`font-medium ${
                            daysUntilInsuranceExpiry !== null && daysUntilInsuranceExpiry <= 7
                              ? "text-red-600"
                              : daysUntilInsuranceExpiry !== null && daysUntilInsuranceExpiry <= 30
                              ? "text-orange-600"
                              : ""
                          }`}
                        >
                          {new Date(equipment.insurance_expiration_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {equipment.remarks && (
                      <div className="pt-2">
                        <div className="p-2 bg-muted/50 rounded text-sm">
                          <span className="text-muted-foreground">Note: </span>
                          <span className="text-foreground">
                            {equipment.remarks}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
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
              of {filteredEquipments.length} equipment
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
        equipments={equipments.map((e) => ({
          id: e.id,
          brand: e.brand,
          model: e.model,
          plate_number: e.plate_number || undefined
        }))}
      />
    </div>
  );
}
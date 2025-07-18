"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { FilterProps } from "@/types/assets";

export default function SharedFilters({
  clients,
  locations,
  projects,
  filterState,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  resultsCount,
  totalCount,
}: FilterProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg overflow-hidden">
      {/* Search Section - Always Visible */}
      <div className="p-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search equipment & vehicles..."
            value={filterState.searchQuery}
            onChange={(e) => onFilterChange("searchQuery", e.target.value)}
            className="pl-10 h-11"
          />
        </div>
      </div>

      {/* Mobile Filter Toggle */}
      <div className="md:hidden px-4 pb-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between h-10"
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          {showFilters ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Filter Selects - Collapsible on Mobile */}
      <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
        <div className="px-4 pb-4">
          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-3">
            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground md:hidden block">
                Location
              </label>
              <Select
                value={filterState.selectedLocation}
                onValueChange={(value) => onFilterChange("selectedLocation", value)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map((location, index) => (
                    <SelectItem key={location.uid || `location-${index}`} value={location.uid}>
                      {location.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground md:hidden block">
                Client
              </label>
              <Select
                value={filterState.selectedClient}
                onValueChange={(value) => onFilterChange("selectedClient", value)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients
                    .filter(
                      (client) =>
                        filterState.selectedLocation === "all" ||
                        client.location.uid === filterState.selectedLocation
                    )
                    .map((client, index) => (
                      <SelectItem key={client.uid || `client-${index}`} value={client.uid}>
                        {client.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Project Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground md:hidden block">
                Project
              </label>
              <Select
                value={filterState.selectedProject}
                onValueChange={(value) => onFilterChange("selectedProject", value)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects
                    .filter((project) => {
                      const matchesClient =
                        filterState.selectedClient === "all" ||
                        project.client.uid === filterState.selectedClient;
                      const projectClient = clients.find(
                        (c) => c.uid === project.client.uid
                      );
                      const matchesLocation =
                        filterState.selectedLocation === "all" ||
                        (projectClient &&
                          projectClient.location.uid === filterState.selectedLocation);
                      return matchesClient && matchesLocation;
                    })
                    .map((project, index) => (
                      <SelectItem key={project.uid || `project-${index}`} value={project.uid}>
                        {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground md:hidden block">
                Status
              </label>
              <Select
                value={filterState.selectedStatus}
                onValueChange={(value) => onFilterChange("selectedStatus", value)}
              >
                <SelectTrigger className="h-10 w-full">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="OPERATIONAL">Operational</SelectItem>
                  <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary and Clear Filters */}
      <div className="px-4 py-3 bg-muted/30 border-t border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{resultsCount}</span> of{" "}
            <span className="font-medium">{totalCount}</span> items
            {hasActiveFilters && (
              <span className="text-primary ml-1">(filtered)</span>
            )}
          </p>
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClearFilters}
              className="h-8 px-3 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
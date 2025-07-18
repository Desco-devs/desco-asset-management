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
import { Search, X } from "lucide-react";
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
  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by brand, model, type, owner, plate number..."
          value={filterState.searchQuery}
          onChange={(e) => onFilterChange("searchQuery", e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Selects */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Select
          value={filterState.selectedLocation}
          onValueChange={(value) => onFilterChange("selectedLocation", value)}
        >
          <SelectTrigger>
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

        <Select
          value={filterState.selectedClient}
          onValueChange={(value) => onFilterChange("selectedClient", value)}
        >
          <SelectTrigger>
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

        <Select
          value={filterState.selectedProject}
          onValueChange={(value) => onFilterChange("selectedProject", value)}
        >
          <SelectTrigger>
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

        <Select
          value={filterState.selectedStatus}
          onValueChange={(value) => onFilterChange("selectedStatus", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="OPERATIONAL">Operational</SelectItem>
            <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results Summary and Clear Filters */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {resultsCount} of {totalCount} items
          {hasActiveFilters && " (filtered)"}
        </p>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}
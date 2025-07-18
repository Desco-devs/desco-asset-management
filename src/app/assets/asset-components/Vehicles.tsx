"use client";

import VehicleModal from "@/app/(dashboard)/vehicles/vehicles-components/VehicleModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car, FileText, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number;
  expiryDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  frontImgUrl?: string;
  backImgUrl?: string;
  side1ImgUrl?: string;
  side2ImgUrl?: string;
  originalReceiptUrl?: string;
  carRegistrationUrl?: string;
  project: {
    uid: string;
    name: string;
    client: {
      uid: string;
      name: string;
      location: {
        uid: string;
        address: string;
      };
    };
  };
}

interface Client {
  uid: string;
  name: string;
  location: {
    uid: string;
    address: string;
  };
}

interface Location {
  uid: string;
  address: string;
}

interface Project {
  uid: string;
  name: string;
  client: {
    uid: string;
    name: string;
  };
}

export default function VehicleViewer() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter states
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [vehiclesData, clientsData, locationsData, projectsData] =
          await Promise.all([
            fetch("/api/vehicles/getall").then((res) => res.json()),
            fetch("/api/clients/getall").then((res) => res.json()),
            fetch("/api/locations/getall").then((res) => res.json()),
            fetch("/api/projects/getall").then((res) => res.json()),
          ]);

        setVehicles(vehiclesData);
        setClients(clientsData);
        setLocations(locationsData);
        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter vehicles based on selected filters and search query
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((vehicle) => {
      const matchesClient =
        selectedClient === "all" ||
        vehicle.project.client.uid === selectedClient;
      const matchesLocation =
        selectedLocation === "all" ||
        vehicle.project.client.location.uid === selectedLocation;
      const matchesProject =
        selectedProject === "all" || vehicle.project.uid === selectedProject;
      const matchesStatus =
        selectedStatus === "all" || vehicle.status === selectedStatus;

      // Search functionality - searches through multiple fields
      const matchesSearch =
        searchQuery === "" ||
        vehicle.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.project.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        vehicle.project.client.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        vehicle.project.client.location.address
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (vehicle.remarks &&
          vehicle.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      return (
        matchesClient &&
        matchesLocation &&
        matchesProject &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    vehicles,
    selectedClient,
    selectedLocation,
    selectedProject,
    selectedStatus,
    searchQuery,
  ]);

  // Get projects filtered by selected client and location
  const availableProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesClient =
        selectedClient === "all" || project.client.uid === selectedClient;
      // For location filtering of projects, we need to check if the project's client is in the selected location
      const projectClient = clients.find((c) => c.uid === project.client.uid);
      const matchesLocation =
        selectedLocation === "all" ||
        (projectClient && projectClient.location.uid === selectedLocation);

      return matchesClient && matchesLocation;
    });
  }, [projects, clients, selectedClient, selectedLocation]);

  // Clear all filters
  const clearFilters = () => {
    setSelectedClient("all");
    setSelectedLocation("all");
    setSelectedProject("all");
    setSelectedStatus("all");
    setSearchQuery("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    selectedClient !== "all" ||
    selectedLocation !== "all" ||
    selectedProject !== "all" ||
    selectedStatus !== "all" ||
    searchQuery !== "";

  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const isExpiringSoon = (expiryDate: string, beforeMonths: number) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const warningDate = new Date(expiry);
    warningDate.setMonth(warningDate.getMonth() - beforeMonths);
    return today >= warningDate && today < expiry;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const getExpirationBadge = (expiryDate: string, beforeMonths: number) => {
    if (isExpired(expiryDate)) {
      return (
        <Badge className="bg-red-500 text-white hover:bg-red-600">
          Expired
        </Badge>
      );
    } else if (isExpiringSoon(expiryDate, beforeMonths)) {
      return (
        <Badge className="bg-orange-500 text-white hover:bg-orange-600">
          Expiring Soon
        </Badge>
      );
    }
    return null;
  };

  const getDocumentCount = (vehicle: Vehicle) => {
    let count = 0;
    if (vehicle.frontImgUrl) count++;
    if (vehicle.backImgUrl) count++;
    if (vehicle.side1ImgUrl) count++;
    if (vehicle.side2ImgUrl) count++;
    if (vehicle.originalReceiptUrl) count++;
    if (vehicle.carRegistrationUrl) count++;
    return count;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Client Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Client
            </label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all-clients" value="all">
                  All Clients
                </SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.uid} value={client.uid}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Location
            </label>
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all-locations" value="all">
                  All Locations
                </SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.uid} value={location.uid}>
                    {location.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Project
            </label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all-projects" value="all">
                  All Projects
                </SelectItem>
                {availableProjects.map((project) => (
                  <SelectItem key={project.uid} value={project.uid}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Status
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem key="all-status" value="all">
                  All Status
                </SelectItem>
                <SelectItem key="operational" value="OPERATIONAL">
                  Operational
                </SelectItem>
                <SelectItem key="non-operational" value="NON_OPERATIONAL">
                  Non-Operational
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-transparent"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Results count and clear filters */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {filteredVehicles.length} of {vehicles.length} vehicles
            {hasActiveFilters && " (filtered)"}
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </Card>

      {/* Vehicle Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => (
          <Card
            key={vehicle.uid}
            className="hover:shadow-lg transition-shadow cursor-pointer z-40 bg-chart-3/20"
            onClick={() => {
              setSelectedVehicle(vehicle);
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <div className="space-y-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {vehicle.brand} {vehicle.model}
                </CardTitle>
                <CardDescription className="font-medium text-accent-foreground/70 text-xs">
                  {vehicle.type} • {vehicle.plateNumber}
                </CardDescription>

                <div className="flex flex-row flex-wrap gap-2">
                  <Badge className={getStatusColor(vehicle.status)}>
                    {vehicle.status}
                  </Badge>
                  {getExpirationBadge(vehicle.expiryDate, vehicle.before)}
                </div>

                {getDocumentCount(vehicle) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>
                      {getDocumentCount(vehicle)} document
                      {getDocumentCount(vehicle) !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {vehicle.frontImgUrl ? (
                <div className="aspect-video rounded-md overflow-hidden bg-white">
                  <img
                    src={vehicle.frontImgUrl}
                    alt={`${vehicle.brand} ${vehicle.model} - Front`}
                    className="w-full h-full object-contain object-center"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-md flex items-center justify-center">
                  <Car className="h-12 w-12 text-gray-400" />
                </div>
              )}

              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Owner:</span>
                  <span className="font-medium">{vehicle.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span>Project:</span>
                  <span
                    className="font-medium truncate ml-2"
                    title={vehicle.project.name}
                  >
                    {vehicle.project.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span
                    className="font-medium truncate ml-2"
                    title={vehicle.project.client.name}
                  >
                    {vehicle.project.client.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span
                    className="font-medium truncate ml-2"
                    title={vehicle.project.client.location.address}
                  >
                    {vehicle.project.client.location.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span
                    className={`font-medium ${
                      isExpired(vehicle.expiryDate)
                        ? "text-red-600"
                        : isExpiringSoon(vehicle.expiryDate, vehicle.before)
                        ? "text-orange-600"
                        : ""
                    }`}
                  >
                    {new Date(vehicle.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredVehicles.length === 0 && vehicles.length > 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
            <p>
              {searchQuery
                ? `No vehicles match your search "${searchQuery}". Try a different search term or adjust your filters.`
                : "Try adjusting your filters to see more results."}
            </p>
          </div>
        </Card>
      )}

      {vehicles.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
            <p>Check back later for vehicle listings.</p>
          </div>
        </Card>
      )}

      <VehicleModal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => setSelectedVehicle(null), 200);
          }
          setIsModalOpen(open);
        }}
        vehicle={selectedVehicle}
      />
    </div>
  );
}

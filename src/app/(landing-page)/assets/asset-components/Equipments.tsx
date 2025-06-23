"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Car,
  FileText,
  Shield,
  CheckCircle,
  Filter,
  X,
  Search,
} from "lucide-react";
import EquipmentModal from "@/app/(dashboard)/equipments/equip-components/EquipmentModal";
import { Input } from "@/components/ui/input";

interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
  plateNumber?: string;
  originalReceiptUrl?: string;
  equipmentRegistrationUrl?: string;
  thirdpartyInspectionImage?: string;
  pgpcInspectionImage?: string;
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

export default function EquipmentViewer() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
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
        const [equipmentsData, clientsData, locationsData, projectsData] =
          await Promise.all([
            fetch("/api/equipments/getall").then((res) => res.json()),
            fetch("/api/clients/getall").then((res) => res.json()),
            fetch("/api/locations/getall").then((res) => res.json()),
            fetch("/api/projects/getall").then((res) => res.json()),
          ]);

        setEquipments(equipmentsData);
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

  // Filter equipments based on selected filters and search query
  const filteredEquipments = useMemo(() => {
    return equipments.filter((equipment) => {
      const matchesClient =
        selectedClient === "all" ||
        equipment.project.client.uid === selectedClient;
      const matchesLocation =
        selectedLocation === "all" ||
        equipment.project.client.location.uid === selectedLocation;
      const matchesProject =
        selectedProject === "all" || equipment.project.uid === selectedProject;
      const matchesStatus =
        selectedStatus === "all" || equipment.status === selectedStatus;

      // Search functionality - searches through multiple fields
      const matchesSearch =
        searchQuery === "" ||
        equipment.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        equipment.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        equipment.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        equipment.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        equipment.project.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        equipment.project.client.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        equipment.project.client.location.address
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (equipment.plateNumber &&
          equipment.plateNumber
            .toLowerCase()
            .includes(searchQuery.toLowerCase())) ||
        (equipment.remarks &&
          equipment.remarks.toLowerCase().includes(searchQuery.toLowerCase()));

      return (
        matchesClient &&
        matchesLocation &&
        matchesProject &&
        matchesStatus &&
        matchesSearch
      );
    });
  }, [
    equipments,
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

  const isExpiringSoon = (insuranceExpirationDate: string) => {
    const expiry = new Date(insuranceExpirationDate);
    const today = new Date();
    const daysDiff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 30 && daysDiff >= 0;
  };

  const isExpired = (insuranceExpirationDate: string) => {
    const expiry = new Date(insuranceExpirationDate);
    const today = new Date();
    return expiry < today;
  };

  const getDocumentCount = (equipment: Equipment) => {
    let count = 0;
    if (equipment.image_url) count++;
    if (equipment.originalReceiptUrl) count++;
    if (equipment.equipmentRegistrationUrl) count++;
    if (equipment.thirdpartyInspectionImage) count++;
    if (equipment.pgpcInspectionImage) count++;
    return count;
  };

  const getInspectionBadges = (equipment: Equipment) => {
    const badges = [];
    if (equipment.thirdpartyInspectionImage) {
      badges.push(
        <Badge
          key="thirdparty"
          variant="outline"
          className="flex items-center gap-1 text-orange-600 border-orange-200"
        >
          <Shield className="h-3 w-3" />
        </Badge>
      );
    }
    if (equipment.pgpcInspectionImage) {
      badges.push(
        <Badge
          key="pgpc"
          variant="outline"
          className="flex items-center gap-1 text-teal-600 border-teal-200"
        >
          <CheckCircle className="h-3 w-3" />
        </Badge>
      );
    }
    return badges;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading equipment...</p>
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
                <SelectItem value="all">All Clients</SelectItem>
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
                <SelectItem value="all">All Locations</SelectItem>
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
                <SelectItem value="all">All Projects</SelectItem>
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPERATIONAL">Operational</SelectItem>
                <SelectItem value="NON_OPERATIONAL">Non-Operational</SelectItem>
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
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
            Showing {filteredEquipments.length} of {equipments.length} equipment
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

      {/* Equipment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEquipments.map((equipment) => (
          <Card
            key={equipment.uid}
            className="hover:shadow-lg cursor-pointer z-40 bg-chart-3/20"
            onClick={() => {
              setSelectedEquipment(equipment);
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <div className="space-y-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {equipment.brand} {equipment.model}
                </CardTitle>
                <CardDescription className="font-medium text-accent-foreground/70 text-xs">
                  {equipment.type}
                </CardDescription>

                <div className="flex flex-row flex-wrap gap-2">
                  <Badge className={getStatusColor(equipment.status)}>
                    {equipment.status}
                  </Badge>

                  {equipment.plateNumber && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Car className="h-3 w-3" />
                      {equipment.plateNumber}
                    </Badge>
                  )}

                  {getInspectionBadges(equipment).length > 0 && (
                    <div className="flex flex-row flex-wrap gap-2">
                      {getInspectionBadges(equipment)}
                    </div>
                  )}
                </div>

                {getDocumentCount(equipment) > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <FileText className="h-3 w-3" />
                    <span>
                      {getDocumentCount(equipment)} document
                      {getDocumentCount(equipment) !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {equipment.image_url ? (
                <div className="aspect-video rounded-md overflow-hidden bg-white">
                  <img
                    src={equipment.image_url}
                    alt={`${equipment.brand} ${equipment.model}`}
                    className="w-full h-full object-contain object-center"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-md flex items-center justify-center">
                  <Settings className="h-12 w-12 text-gray-400" />
                </div>
              )}

              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Owner:</span>
                  <span className="font-medium">{equipment.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span>Project:</span>
                  <span
                    className="font-medium truncate ml-2"
                    title={equipment.project.name}
                  >
                    {equipment.project.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span
                    className="font-medium truncate ml-2"
                    title={equipment.project.client.name}
                  >
                    {equipment.project.client.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Location:</span>
                  <span
                    className="font-medium truncate ml-2"
                    title={equipment.project.client.location.address}
                  >
                    {equipment.project.client.location.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Expires:</span>
                  <span
                    className={`font-medium ${
                      isExpired(equipment.insuranceExpirationDate)
                        ? "text-red-600"
                        : isExpiringSoon(equipment.insuranceExpirationDate)
                        ? "text-orange-600"
                        : ""
                    }`}
                  >
                    {new Date(
                      equipment.insuranceExpirationDate
                    ).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEquipments.length === 0 && equipments.length > 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No equipment found</h3>
            <p>
              {searchQuery
                ? `No equipment matches your search "${searchQuery}". Try a different search term or adjust your filters.`
                : "Try adjusting your filters to see more results."}
            </p>
          </div>
        </Card>
      )}

      {equipments.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No equipment found</h3>
            <p>Check back later for equipment listings.</p>
          </div>
        </Card>
      )}

      <EquipmentModal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => setSelectedEquipment(null), 200);
          }
          setIsModalOpen(open);
        }}
        equipment={selectedEquipment}
      />
    </div>
  );
}

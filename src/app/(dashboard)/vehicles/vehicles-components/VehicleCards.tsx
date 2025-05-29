"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  User,
  Building2,
  MapPin,
  Car,
  FileText,
  Image,
} from "lucide-react";
import VehicleModal from "./VehicleModal";

// Types based on your Prisma schema
interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number; // in months
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

interface VehicleCardsProps {
  vehicles?: Vehicle[];
  clients?: Client[];
  locations?: Location[];
}

const VehicleCards = ({
  vehicles = [],
  clients = [],
  locations = [],
}: VehicleCardsProps) => {
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(vehicles);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter vehicles based on selected client and location
  useEffect(() => {
    let filtered = vehicles;

    if (selectedClient !== "all") {
      filtered = filtered.filter(
        (vehicle) => vehicle.project.client.uid === selectedClient
      );
    }

    if (selectedLocation !== "all") {
      filtered = filtered.filter(
        (vehicle) => vehicle.project.client.location.uid === selectedLocation
      );
    }

    setFilteredVehicles(filtered);
  }, [vehicles, selectedClient, selectedLocation]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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

  const getNextInspectionDate = (
    lastInspection: string,
    beforeMonths: number
  ) => {
    const lastDate = new Date(lastInspection);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + beforeMonths);
    return nextDate;
  };

  const vehicleImages = (vehicle: Vehicle) => {
    const images = [
      { url: vehicle.frontImgUrl, label: "Front" },
      { url: vehicle.backImgUrl, label: "Back" },
      { url: vehicle.side1ImgUrl, label: "Side 1" },
      { url: vehicle.side2ImgUrl, label: "Side 2" },
    ].filter((img) => img.url);

    return images;
  };

  const handleCardClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const closeModal = (open: boolean) => {
    if (!open) {
      // Only clear selectedVehicle after the dialog has closed
      // Use setTimeout to wait for the closing animation
      setTimeout(() => {
        setSelectedVehicle(null);
      }, 200); // Adjust timing based on your dialog animation duration
    }
    setIsModalOpen(open);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">
            Filter by Client
          </label>
          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger>
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

        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">
            Filter by Location
          </label>
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger>
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
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredVehicles.length} vehicle
        {filteredVehicles.length !== 1 ? "s" : ""}
        {selectedClient !== "all" && (
          <span>
            {" "}
            • Client: {clients.find((c) => c.uid === selectedClient)?.name}
          </span>
        )}
        {selectedLocation !== "all" && (
          <span>
            {" "}
            • Location:{" "}
            {locations.find((l) => l.uid === selectedLocation)?.address}
          </span>
        )}
      </div>

      {/* Vehicle Cards Grid - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => (
          <Card
            key={vehicle.uid}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleCardClick(vehicle)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-sm flex items-center gap-2 ">
                    <Car className="h-5 w-5" />
                    {vehicle.brand} {vehicle.model}
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-600">
                    {vehicle.type} • {vehicle.plateNumber}
                  </CardDescription>
                  <Badge
                    className={`${getStatusColor(vehicle.status)} text-xs`}
                  >
                    {vehicle.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Front Image Only */}
              {vehicle.frontImgUrl && (
                <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={vehicle.frontImgUrl}
                    alt={`${vehicle.brand} ${vehicle.model} - Front`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Placeholder if no front image */}
              {!vehicle.frontImgUrl && (
                <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                  <Car className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredVehicles.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        </Card>
      )}

      <VehicleModal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        vehicle={selectedVehicle}
      />
    </div>
  );
};

export default VehicleCards;

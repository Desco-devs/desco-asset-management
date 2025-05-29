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
import { Settings } from "lucide-react";
import EquipmentModal from "./EquipmentModal";

// Types based on your Prisma schema
interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  expirationDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
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

interface EquipmentCardsProps {
  equipments?: Equipment[];
  clients?: Client[];
  locations?: Location[];
}

const EquipmentCards = ({
  equipments = [],
  clients = [],
  locations = [],
}: EquipmentCardsProps) => {
  const [filteredEquipments, setFilteredEquipments] =
    useState<Equipment[]>(equipments);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter equipments based on selected client and location
  useEffect(() => {
    let filtered = equipments;

    if (selectedClient !== "all") {
      filtered = filtered.filter(
        (equipment) => equipment.project.client.uid === selectedClient
      );
    }

    if (selectedLocation !== "all") {
      filtered = filtered.filter(
        (equipment) =>
          equipment.project.client.location.uid === selectedLocation
      );
    }

    setFilteredEquipments(filtered);
  }, [equipments, selectedClient, selectedLocation]);

  // Helper functions used only in cards view
  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const handleCardClick = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsModalOpen(true);
  };

  const closeModal = (open: boolean) => {
    if (!open) {
      // Only clear selectedEquipment after the dialog has closed
      // Use setTimeout to wait for the closing animation
      setTimeout(() => {
        setSelectedEquipment(null);
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
        Showing {filteredEquipments.length} equipment
        {filteredEquipments.length !== 1 ? "s" : ""}
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

      {/* Equipment Cards Grid - Simplified */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEquipments.map((equipment) => (
          <Card
            key={equipment.uid}
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => handleCardClick(equipment)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    {equipment.brand} {equipment.model}
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-600 text-xs">
                    {equipment.type}
                  </CardDescription>
                  <Badge className={getStatusColor(equipment.status)}>
                    {equipment.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Equipment Image */}
              {equipment.image_url && (
                <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={equipment.image_url}
                    alt={`${equipment.brand} ${equipment.model}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Placeholder if no image */}
              {!equipment.image_url && (
                <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                  <Settings className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredEquipments.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No equipment found</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        </Card>
      )}

      {/* Equipment Modal */}
      <EquipmentModal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        equipment={selectedEquipment}
      />
    </div>
  );
};

export default EquipmentCards;

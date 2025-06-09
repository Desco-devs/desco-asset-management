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
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Car, Edit, Trash2, AlertTriangle } from "lucide-react";
import VehicleModal from "./VehicleModal";
import AddVehicleModal from "./AddVehicleModal";
import { toast } from "sonner";

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
  onVehicleAdded: () => void;
}

const VehicleCards = ({
  vehicles = [],
  clients = [],
  locations = [],
  onVehicleAdded,
}: VehicleCardsProps) => {
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>(vehicles);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(
    null
  );

  // Delete confirmation dialog states
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    if (!isEditMode) {
      setSelectedVehicle(vehicle);
      setIsModalOpen(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation(); // Prevent card click
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, vehicle: Vehicle) => {
    e.stopPropagation(); // Prevent card click
    setVehicleToDelete(vehicle);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete) return;

    setDeletingVehicleId(vehicleToDelete.uid);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(
        `/api/vehicles?vehicleId=${vehicleToDelete.uid}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete vehicle");
      }

      const result = await response.json();

      toast.success(
        `Vehicle ${vehicleToDelete.brand} ${vehicleToDelete.model} deleted successfully`
      );

      // Show additional info if some images failed to delete
      if (result.imagesDeletionStatus?.failed > 0) {
        toast.warning(
          `Vehicle deleted, but ${result.imagesDeletionStatus.failed} images couldn't be removed from storage`
        );
      }

      onVehicleAdded(); // Refresh the vehicle list
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast.error(
        `Failed to delete vehicle: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`
      );
    } finally {
      setDeletingVehicleId(null);
      setVehicleToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setVehicleToDelete(null);
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

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-row gap-4 items-center">
          <div className="">
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

          <div className="">
            <label className="text-sm font-medium mb-2 block">
              Filter by Location
            </label>
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant={isEditMode ? "default" : "outline"}
            onClick={toggleEditMode}
            className={`${
              isEditMode ? "bg-blue-600 hover:bg-blue-700" : ""
            } dark:text-accent-foreground`}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditMode ? "Exit Edit" : "Edit Mode"}
          </Button>

          <AddVehicleModal onVehicleAdded={onVehicleAdded} editVehicle={null} />
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
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => (
          <Card
            key={vehicle.uid}
            className={`hover:shadow-lg transition-shadow ${
              !isEditMode ? "cursor-pointer" : ""
            }`}
            onClick={() => handleCardClick(vehicle)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
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

                {/* Edit and Delete Buttons */}
                {isEditMode && (
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleEditClick(e, vehicle)}
                      disabled={deletingVehicleId === vehicle.uid}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => handleDeleteClick(e, vehicle)}
                      disabled={deletingVehicleId === vehicle.uid}
                    >
                      {deletingVehicleId === vehicle.uid ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
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

      {/* Edit Vehicle Modal */}
      {isEditMode && selectedVehicle && (
        <AddVehicleModal
          onVehicleAdded={() => {
            onVehicleAdded();
            setIsModalOpen(false);
            setSelectedVehicle(null);
          }}
          editVehicle={selectedVehicle}
          isOpen={isModalOpen}
          onOpenChange={closeModal}
        />
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 " />
              Delete Vehicle
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {vehicleToDelete?.brand} {vehicleToDelete?.model}
              </span>{" "}
              with plate number{" "}
              <span className="font-semibold">
                {vehicleToDelete?.plateNumber}
              </span>
              ?
            </AlertDialogDescription>
            <AlertDialogDescription className="text-red-600 font-medium">
              This will permanently delete the vehicle and all its images. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 dark:text-accent-foreground"
            >
              Delete Vehicle
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VehicleCards;

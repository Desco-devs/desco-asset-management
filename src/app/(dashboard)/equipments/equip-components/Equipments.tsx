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
import { Settings, Edit, Trash2, AlertTriangle } from "lucide-react";
import EquipmentModal from "./EquipmentModal";
import AddEquipmentModal from "./EquipmentAddModal";
import { toast } from "sonner";

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
  onEquipmentAdded: () => void;
}

const EquipmentCards = ({
  equipments = [],
  clients = [],
  locations = [],
  onEquipmentAdded,
}: EquipmentCardsProps) => {
  const [filteredEquipments, setFilteredEquipments] =
    useState<Equipment[]>(equipments);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deletingEquipmentId, setDeletingEquipmentId] = useState<string | null>(
    null
  );

  // Delete confirmation dialog states
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    if (!isEditMode) {
      setSelectedEquipment(equipment);
      setIsModalOpen(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent, equipment: Equipment) => {
    e.stopPropagation(); // Prevent card click
    setSelectedEquipment(equipment);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, equipment: Equipment) => {
    e.stopPropagation(); // Prevent card click
    setEquipmentToDelete(equipment);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!equipmentToDelete) return;

    setDeletingEquipmentId(equipmentToDelete.uid);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(
        `/api/equipments?equipmentId=${equipmentToDelete.uid}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete equipment");
      }

      const result = await response.json();

      toast.success(
        `Equipment ${equipmentToDelete.brand} ${equipmentToDelete.model} deleted successfully`
      );

      // Show additional info if image deletion had issues
      if (
        result.imageDeletionStatus?.attempted &&
        !result.imageDeletionStatus.successful
      ) {
        toast.warning(
          `Equipment deleted, but image couldn't be removed from storage: ${result.imageDeletionStatus.error}`
        );
      }

      onEquipmentAdded(); // Refresh the equipment list
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast.error(
        `Failed to delete equipment: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`
      );
    } finally {
      setDeletingEquipmentId(null);
      setEquipmentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setEquipmentToDelete(null);
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

          <AddEquipmentModal
            onEquipmentAdded={onEquipmentAdded}
            editEquipment={null}
          />
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

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEquipments.map((equipment) => (
          <Card
            key={equipment.uid}
            className={`hover:shadow-lg transition-shadow ${
              !isEditMode ? "cursor-pointer" : ""
            }`}
            onClick={() => handleCardClick(equipment)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
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

                {/* Edit and Delete Buttons */}
                {isEditMode && (
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleEditClick(e, equipment)}
                      disabled={deletingEquipmentId === equipment.uid}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => handleDeleteClick(e, equipment)}
                      disabled={deletingEquipmentId === equipment.uid}
                    >
                      {deletingEquipmentId === equipment.uid ? (
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

      {/* Edit Equipment Modal */}
      {isEditMode && selectedEquipment && (
        <AddEquipmentModal
          onEquipmentAdded={() => {
            onEquipmentAdded();
            setIsModalOpen(false);
            setSelectedEquipment(null);
          }}
          editEquipment={selectedEquipment}
          isOpen={isModalOpen}
          onOpenChange={closeModal}
        />
      )}

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Equipment
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {equipmentToDelete?.brand} {equipmentToDelete?.model}
              </span>{" "}
              of type{" "}
              <span className="font-semibold">{equipmentToDelete?.type}</span>?
            </AlertDialogDescription>
            <AlertDialogDescription className="text-red-600 font-medium">
              This will permanently delete the equipment and its image. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500 dark:text-accent-foreground"
            >
              Delete Equipment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default EquipmentCards;

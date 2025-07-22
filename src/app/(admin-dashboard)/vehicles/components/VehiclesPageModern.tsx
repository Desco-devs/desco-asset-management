"use client";

import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteVehicle } from "@/hooks/useVehiclesQuery";
import {
  selectDeleteConfirmation,
  selectIsCreateModalOpen,
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectViewerImage,
  useVehiclesStore,
} from "@/stores/vehiclesStore";
import { Download, Loader2, X } from "lucide-react";
import React from "react";
import CreateVehicleModalModern from "./modals/CreateVehicleModalModern";
import EditVehicleModalModern from "./modals/EditVehicleModalModern";
import VehicleModalModern from "./modals/VehicleModalModern";
import VehiclesListModern from "./VehiclesListModern";

export default function VehiclesPageModern() {
  // Client state from Zustand (using optimized selectors)
  const isModalOpen = useVehiclesStore(selectIsModalOpen);
  const isCreateModalOpen = useVehiclesStore(selectIsCreateModalOpen);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  const viewerImage = useVehiclesStore(selectViewerImage);
  const isMobile = useVehiclesStore(selectIsMobile);
  const deleteConfirmation = useVehiclesStore(selectDeleteConfirmation);

  // Actions
  const {
    setViewerImage,
    setIsModalOpen,
    setDeleteConfirmation,
    closeAllModals,
  } = useVehiclesStore();

  // Mutations
  const deleteVehicleMutation = useDeleteVehicle();

  // Image viewer functions
  const closeImageViewer = () => {
    console.log("Closing image viewer in parent component");
    setViewerImage(null);
    if (isMobile) {
      // On mobile, reopen the drawer when closing image viewer
      console.log("Mobile: reopening drawer");
      setTimeout(() => {
        setIsModalOpen(true);
      }, 100);
    }
  };

  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete confirmation functions
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation.vehicle) return;
    console.log("Delete confirmed for vehicle:", deleteConfirmation.vehicle.id);

    try {
      await deleteVehicleMutation.mutateAsync(deleteConfirmation.vehicle.id);
      console.log("Vehicle deleted successfully");
      setDeleteConfirmation({ isOpen: false, vehicle: null });
      closeAllModals(); // Clean slate - everything closed
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      const vehicleToRestore = deleteConfirmation.vehicle;
      setDeleteConfirmation({ isOpen: false, vehicle: null });

      // Reopen the vehicle details modal on error so user can try again
      if (vehicleToRestore) {
        setTimeout(() => {
          setIsModalOpen(true);
        }, 100);
      }
    }
  };

  const handleDeleteCancel = () => {
    console.log("Delete cancelled");
    const vehicleToRestore = deleteConfirmation.vehicle;
    setDeleteConfirmation({ isOpen: false, vehicle: null });

    // Reopen the vehicle details modal since we closed it completely
    if (vehicleToRestore) {
      setTimeout(() => {
        setIsModalOpen(true);
      }, 100);
    }
  };

  // Image Viewer Modal Component
  const ImageViewerModal = () => {
    if (!viewerImage) return null;

    console.log(
      "Rendering global image viewer in parent component:",
      viewerImage
    );

    return (
      <Dialog open={true} onOpenChange={closeImageViewer}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] max-h-[95vh] sm:max-h-[90vh] p-0 bg-black/95">
          <DialogHeader className="p-4 bg-black/80">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-lg">
                {viewerImage.title}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    downloadImage(viewerImage.url, `${viewerImage.title}.jpg`)
                  }
                  className="text-white hover:bg-white/10"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeImageViewer}
                  className="text-white hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div
            className="flex-1 flex items-center justify-center p-4 min-h-[60vh] sm:min-h-[70vh] md:min-h-[75vh] lg:min-h-[80vh] cursor-zoom-out relative"
            onClick={closeImageViewer}
          >
            <Image
              src={viewerImage.url}
              alt={viewerImage.title}
              fill
              className="object-contain"
              onClick={closeImageViewer}
            />
          </div>

          <div className="p-4 bg-black/80 text-center">
            <p className="text-white/70 text-sm">
              {isMobile ? "Tap" : "Click"} anywhere to close
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  // Delete Confirmation Modal Component - Stabilized to prevent re-renders
  const DeleteConfirmationModal = React.memo(() => {
    if (!deleteConfirmation.isOpen || !deleteConfirmation.vehicle) return null;

    // Extract vehicle data to prevent re-renders during deletion
    const vehicle = deleteConfirmation.vehicle;

    return (
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={(open) => {
          if (!open && !deleteVehicleMutation.isPending) {
            handleDeleteCancel();
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-[450px] md:max-w-[500px] lg:max-w-[550px] max-h-[90vh] mx-auto p-0 overflow-hidden">
          <div className="p-6 flex flex-col h-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <X className="h-5 w-5" />
                Delete Vehicle
              </DialogTitle>
              <DialogDescription>
                Confirm deletion of this vehicle. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this vehicle? This action cannot
                be undone.
              </p>

              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <p className="font-medium text-sm md:text-base break-words">
                    {vehicle.brand} {vehicle.model}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground break-words">
                    Plate: {vehicle.plate_number}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-4 mt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={deleteVehicleMutation.isPending}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteVehicleMutation.isPending}
                className="gap-2 w-full sm:w-auto order-1 sm:order-2"
              >
                {deleteVehicleMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4" />
                    Delete Vehicle
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    );
  });

  DeleteConfirmationModal.displayName = "DeleteConfirmationModal";

  return (
    <div className="container mx-auto py-6 px-4">
      {/* Main List Component */}
      <VehiclesListModern />

      {/* Modals - Only render when needed */}

      {/* Vehicle Details Modal */}
      {isModalOpen && <VehicleModalModern />}

      {/* Create Vehicle Modal */}
      {isCreateModalOpen && <CreateVehicleModalModern />}

      {/* Edit Vehicle Modal */}
      {isEditMode && <EditVehicleModalModern />}

      {/* Maintenance Modal will be added in Feature 6 */}

      {/* Global Image Viewer Modal - Always available */}
      <ImageViewerModal />

      {/* Global Delete Confirmation Modal */}
      <DeleteConfirmationModal />
    </div>
  );
}

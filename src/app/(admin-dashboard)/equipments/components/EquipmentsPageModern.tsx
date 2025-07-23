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
import { useDeleteEquipment } from "@/hooks/useEquipmentsQuery";
import {
  selectDeleteConfirmation,
  selectIsCreateModalOpen,
  selectIsEditMode,
  selectIsMobile,
  selectIsModalOpen,
  selectViewerImage,
  selectSelectedEquipment,
  selectIsEquipmentMaintenanceModalOpen,
  useEquipmentsStore,
} from "@/stores/equipmentsStore";
import { Download, Loader2, X, Trash2 } from "lucide-react";
import React from "react";
import EquipmentsListModern from "./EquipmentsListModern";

import CreateEquipmentModalModern from "./modals/CreateEquipmentModalModern";
import EditEquipmentModalModern from "./modals/EditEquipmentModalModern";
import EquipmentModalModern from "./modals/EquipmentModalModern";
import CreateEquipmentMaintenanceReportModal from "./modals/CreateEquipmentMaintenanceReportModal";

export default function EquipmentsPageModern() {
  // Client state from Zustand (using optimized selectors)
  const isModalOpen = useEquipmentsStore(selectIsModalOpen);
  const isCreateModalOpen = useEquipmentsStore(selectIsCreateModalOpen);
  const isEditMode = useEquipmentsStore(selectIsEditMode);
  const viewerImage = useEquipmentsStore(selectViewerImage);
  const isMobile = useEquipmentsStore(selectIsMobile);
  const deleteConfirmation = useEquipmentsStore(selectDeleteConfirmation);
  const selectedEquipment = useEquipmentsStore(selectSelectedEquipment);
  const isEquipmentMaintenanceModalOpen = useEquipmentsStore(selectIsEquipmentMaintenanceModalOpen);

  // Actions
  const {
    setViewerImage,
    setIsModalOpen,
    setDeleteConfirmation,
    closeAllModals,
  } = useEquipmentsStore();

  // Mutations
  const deleteEquipmentMutation = useDeleteEquipment();

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
    if (!deleteConfirmation.equipment) return;
    console.log("Delete confirmed for equipment:", deleteConfirmation.equipment.uid);

    try {
      await deleteEquipmentMutation.mutateAsync(deleteConfirmation.equipment.uid);
      console.log("Equipment deleted successfully");
      setDeleteConfirmation({ isOpen: false, equipment: null });
      closeAllModals(); // Clean slate - everything closed
    } catch (error) {
      console.error("Error deleting equipment:", error);
      const equipmentToRestore = deleteConfirmation.equipment;
      setDeleteConfirmation({ isOpen: false, equipment: null });

      // Reopen the equipment details modal on error so user can try again
      if (equipmentToRestore) {
        setTimeout(() => {
          setIsModalOpen(true);
        }, 100);
      }
    }
  };

  const handleDeleteCancel = () => {
    console.log("Delete cancelled");
    const equipmentToRestore = deleteConfirmation.equipment;
    setDeleteConfirmation({ isOpen: false, equipment: null });

    // Reopen the equipment details modal since we closed it completely
    if (equipmentToRestore) {
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
    if (!deleteConfirmation.isOpen || !deleteConfirmation.equipment) return null;

    // Extract equipment data to prevent re-renders during deletion
    const equipment = deleteConfirmation.equipment;

    return (
      <Dialog
        open={deleteConfirmation.isOpen}
        onOpenChange={!deleteEquipmentMutation.isPending ? (open) => !open && handleDeleteCancel() : undefined}
      >
        <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-[450px] md:max-w-[500px] lg:max-w-[550px] max-h-[90vh] mx-auto p-0 overflow-hidden">
          <div className="p-6 flex flex-col h-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                Delete Equipment
              </DialogTitle>
              <DialogDescription>
                Confirm deletion of this equipment. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this equipment? This action cannot
                be undone.
              </p>

              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <p className="font-medium text-sm md:text-base break-words">
                    {equipment.brand} {equipment.model}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground break-words">
                    Type: {equipment.type}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground break-words">
                    Owner: {equipment.owner}
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-4 mt-4 border-t">
              <Button
                variant="outline"
                onClick={handleDeleteCancel}
                disabled={deleteEquipmentMutation.isPending}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteEquipmentMutation.isPending}
                className="gap-2 w-full sm:w-auto order-1 sm:order-2"
              >
                {deleteEquipmentMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Equipment
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
      <EquipmentsListModern />

      {/* Modals - Only render when needed */}

      {/* Equipment Details Modal */}
      {isModalOpen && <EquipmentModalModern />}

      {/* Create Equipment Modal */}
      {isCreateModalOpen && <CreateEquipmentModalModern />}

      {/* Edit Equipment Modal */}
      {isEditMode && <EditEquipmentModalModern />}

      {/* Equipment Maintenance Report Modal */}
      {isEquipmentMaintenanceModalOpen && selectedEquipment && (
        <CreateEquipmentMaintenanceReportModal equipmentId={selectedEquipment.uid} />
      )}

      {/* Global Image Viewer Modal - Always available */}
      <ImageViewerModal />

      {/* Global Delete Confirmation Modal */}
      <DeleteConfirmationModal />
    </div>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  selectIsMobile,
  selectIsEditMode,
  selectSelectedEquipment,
  useEquipmentsStore,
} from "@/stores/equipmentsStore";
import { X } from "lucide-react";

export default function EditEquipmentModalModern() {
  // Client state from Zustand
  const selectedEquipment = useEquipmentsStore(selectSelectedEquipment);
  const isEditMode = useEquipmentsStore(selectIsEditMode);
  const isMobile = useEquipmentsStore(selectIsMobile);

  // Actions
  const {
    setIsEditMode,
    setIsModalOpen,
    setSelectedEquipment,
  } = useEquipmentsStore();

  const handleClose = () => {
    setIsEditMode(false);
    setIsModalOpen(false);
    setSelectedEquipment(null);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Keep modal open and return to view mode
    setIsModalOpen(true);
  };

  if (!selectedEquipment) return null;

  const ModalContent = () => (
    <div className="space-y-6">
      <div className="text-center py-12">
        <h3 className="text-lg font-medium mb-4">Edit Equipment</h3>
        <p className="text-muted-foreground mb-6">
          Equipment editing functionality will be implemented soon.
        </p>
        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="font-medium">{selectedEquipment.brand} {selectedEquipment.model}</p>
          <p className="text-sm text-muted-foreground mt-1">{selectedEquipment.type}</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={isEditMode} onOpenChange={setIsEditMode}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle>Edit Equipment</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              <ModalContent />
            </div>
            <DrawerFooter className="gap-2">
              <Button onClick={handleCancel}>
                Save Changes
              </Button>
              <DrawerClose asChild>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isEditMode} onOpenChange={setIsEditMode}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Equipment</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <ModalContent />
            <DialogFooter className="gap-2">
              <Button onClick={handleCancel}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
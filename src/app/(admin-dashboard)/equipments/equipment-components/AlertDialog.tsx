"use client";

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
import { AlertTriangle } from "lucide-react";

interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber?: string;
}

interface EquipmentDeleteAlertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const EquipmentDeleteAlertDialog = ({
  isOpen,
  onOpenChange,
  equipment,
  onConfirm,
  onCancel,
  isDeleting = false,
}: EquipmentDeleteAlertDialogProps) => {
  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Equipment
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold">
              {equipment?.brand} {equipment?.model}
            </span>
            {equipment?.plateNumber && (
              <span>
                {" "}
                (Plate:{" "}
                <span className="font-semibold">{equipment.plateNumber}</span>)
              </span>
            )}{" "}
            of type <span className="font-semibold">{equipment?.type}</span>?
          </AlertDialogDescription>
          <AlertDialogDescription className="text-red-600 font-medium">
            This will permanently delete the equipment and all its associated
            files (image, receipt, registration documents, inspection images,
            and all equipment parts). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500 dark:text-accent-foreground"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Deleting...
              </div>
            ) : (
              "Delete Equipment"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EquipmentDeleteAlertDialog;

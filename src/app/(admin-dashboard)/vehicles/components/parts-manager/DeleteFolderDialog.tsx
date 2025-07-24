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
import { countPartsInFolder } from "@/lib/vehicle-parts-utils";
import type { DeleteFolderDialogProps } from "@/types/vehicle-parts";

const DeleteFolderDialog = ({
  isOpen,
  onOpenChange,
  folderToDelete,
  onConfirmDelete,
  onConfirmBulkDelete,
  vehicleFolders,
}: DeleteFolderDialogProps) => {
  const handleConfirm = () => {
    if (folderToDelete?.id === "bulk" && onConfirmBulkDelete) {
      onConfirmBulkDelete();
    } else {
      onConfirmDelete();
    }
  };

  const getPartsDescription = () => {
    if (!folderToDelete) return "";

    if (folderToDelete.id === "bulk") {
      // For bulk delete, the description is already included in the name
      return "";
    }

    const totalParts = countPartsInFolder(vehicleFolders, folderToDelete.id);
    return totalParts > 0
      ? `This will move ${totalParts} part${
          totalParts > 1 ? "s" : ""
        } back to the main parts list.`
      : "This folder is empty.";
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Folder</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the folder &quot;{folderToDelete?.name}&quot;?
            {getPartsDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {folderToDelete?.id === "bulk" ? "Delete Folders" : "Delete Folder"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteFolderDialog;
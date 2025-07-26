"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EquipmentFormContainer } from "@/components/equipment/EquipmentFormContainer";
import { FormActions } from "@/components/equipment/FormActions";
import { useEquipmentForm } from "@/hooks/use-equipment-form";
import { useEquipmentSubmit } from "@/hooks/use-equipment-submit";
import type { AddEquipmentModalProps, FilesState } from "@/types/equipment";
import type { EquipmentFolder, EquipmentPart } from "@/types/equipment-parts";
import { Plus } from "lucide-react";
import { useEffect, useState, useCallback } from "react";

const AddEquipmentModal = ({
  onEquipmentAdded,
  editEquipment = null,
  isOpen: controlledIsOpen,
  onOpenChange: controlledOnOpenChange,
}: AddEquipmentModalProps) => {
  const { user } = useAuth();
  const isAdmin = (user?.role === 'ADMIN' || user?.role === 'SUPERADMIN') ?? false;

  // Dialog state management - simplified to avoid infinite loops
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  
  const handleOpenChange = useCallback((open: boolean) => {
    if (isControlled && controlledOnOpenChange) {
      controlledOnOpenChange(open);
    } else if (!isControlled) {
      setInternalIsOpen(open);
    }
  }, [isControlled, controlledOnOpenChange]);

  // Equipment form hook
  const {
    formData,
    setFormData,
    filteredProjects,
    isEditMode,
    fetchProjects,
    resetForm,
    isFormValid,
  } = useEquipmentForm(editEquipment);

  // File upload states
  const [files, setFiles] = useState<FilesState>({
    image: { file: null, keep: true },
    receipt: { file: null, keep: true },
    registration: { file: null, keep: true },
    thirdpartyInspection: { file: null, keep: true },
    pgpcInspection: { file: null, keep: true },
  });

  // Equipment parts states
  const [equipmentParts, setEquipmentParts] = useState<EquipmentPart[]>([]);
  const [equipmentFolders, setEquipmentFolders] = useState<EquipmentFolder[]>([]);

  // Reset functions - memoized to prevent infinite loops
  const resetFiles = useCallback(() => {
    setFiles({
      image: { file: null, keep: true },
      receipt: { file: null, keep: true },
      registration: { file: null, keep: true },
      thirdpartyInspection: { file: null, keep: true },
      pgpcInspection: { file: null, keep: true },
    });
  }, []);

  const resetParts = useCallback(() => {
    // Cleanup part previews
    equipmentParts.forEach((part) => {
      if (part.preview && !part.isExisting) {
        URL.revokeObjectURL(part.preview);
      }
    });
    setEquipmentParts([]);

    // Cleanup folder parts recursively
    const cleanupFolder = (folder: EquipmentFolder) => {
      folder.parts.forEach((part) => {
        if (part.preview && !part.isExisting) {
          URL.revokeObjectURL(part.preview);
        }
      });
      folder.subfolders.forEach(cleanupFolder);
    };
    equipmentFolders.forEach(cleanupFolder);
    setEquipmentFolders([]);
  }, [equipmentParts, equipmentFolders]);

  // Submit hook
  const { loading, handleSubmit } = useEquipmentSubmit({
    formData,
    files,
    equipmentParts,
    equipmentFolders,
    isEditMode,
    editEquipment,
    onSuccess: () => {
      handleOpenChange(false);
      onEquipmentAdded();
    },
    resetForm,
    resetFiles,
    resetParts,
  });

  // Initialize equipment parts for editing
  useEffect(() => {
    if (editEquipment?.equipment_parts?.length) {
      const existingParts: EquipmentPart[] = editEquipment.equipment_parts.map(
        (url) => ({
          file: null,
          preview: url,
          isExisting: true,
          existingUrl: url,
        })
      );
      setEquipmentParts(existingParts);
    }
  }, [editEquipment]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Only depend on isOpen to prevent infinite loops

  const triggerSubmit = () => {
    const form = document.querySelector("form") as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isEditMode && isAdmin && (
        <DialogTrigger asChild>
          <Button className="dark:text-accent-foreground dark:bg-chart-1 dark:hover:chart-1/80 bg-chart-3 hover:bg-chart-3/80">
            <Plus className="w-4 h-4 mr-2" /> Add New
          </Button>
        </DialogTrigger>
      )}

      <DialogContent
        className="max-w-[95%] max-h-[90vh] flex flex-col p-4"
        style={{ maxWidth: "1024px" }}
      >
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {isEditMode ? "Edit Equipment" : "Add New Equipment"}
          </DialogTitle>
        </DialogHeader>

        <EquipmentFormContainer
          formData={formData}
          setFormData={setFormData}
          filteredProjects={filteredProjects}
          files={files}
          setFiles={setFiles}
          equipmentParts={equipmentParts}
          setEquipmentParts={setEquipmentParts}
          equipmentFolders={equipmentFolders}
          setEquipmentFolders={setEquipmentFolders}
          editEquipment={editEquipment}
          onSubmit={handleSubmit}
        />

        <FormActions
          isEditMode={isEditMode}
          loading={loading}
          isFormValid={isFormValid}
          onCancel={() => handleOpenChange(false)}
          onSubmit={triggerSubmit}
        />
      </DialogContent>
    </Dialog>
  );
};

export default AddEquipmentModal;
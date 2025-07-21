import { useState } from 'react';
import { toast } from 'sonner';
import { prepareFormDataForSubmission } from '@/utils/equipment-helpers';
import type { EquipmentFormData, Equipment, FilesState } from '@/types/equipment';
import type { EquipmentFolder, EquipmentPart } from '@/types/equipment-parts';

interface UseEquipmentSubmitProps {
  formData: EquipmentFormData;
  files: FilesState;
  equipmentParts: EquipmentPart[];
  equipmentFolders: EquipmentFolder[];
  isEditMode: boolean;
  editEquipment?: Equipment | null;
  onSuccess: () => void;
  resetForm: () => void;
  resetFiles: () => void;
  resetParts: () => void;
}

export const useEquipmentSubmit = ({
  formData,
  files,
  equipmentParts,
  equipmentFolders,
  isEditMode,
  editEquipment,
  onSuccess,
  resetForm,
  resetFiles,
  resetParts,
}: UseEquipmentSubmitProps) => {
  const [loading, setLoading] = useState(false);

  const getFileFieldName = (key: string): string => {
    const mapping: Record<string, string> = {
      image: 'image',
      receipt: 'originalReceipt',
      registration: 'equipmentRegistration',
      thirdpartyInspection: 'thirdpartyInspection',
      pgpcInspection: 'pgpcInspection',
    };
    return mapping[key] || key;
  };

  const getKeepExistingFieldName = (key: string): string => {
    const mapping: Record<string, string> = {
      image: 'keepExistingImage',
      receipt: 'keepExistingReceipt',
      registration: 'keepExistingRegistration',
      thirdpartyInspection: 'keepExistingThirdpartyInspection',
      pgpcInspection: 'keepExistingPgpcInspection',
    };
    return mapping[key] || `keepExisting${key}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare form data using utility function
      const submitFormData = prepareFormDataForSubmission(formData);

      // Add equipment ID for edit mode
      if (isEditMode && editEquipment) {
        submitFormData.append("equipmentId", editEquipment.uid);
      }

      // Add file uploads
      Object.entries(files).forEach(([key, fileState]) => {
        if (fileState.file) {
          const fieldName = getFileFieldName(key);
          submitFormData.append(fieldName, fileState.file);
        }
      });

      // Add equipment parts from main list
      let partIndex = 0;
      equipmentParts.forEach((part) => {
        if (part.file) {
          submitFormData.append(`equipmentPart_${partIndex}`, part.file);
          submitFormData.append(`equipmentPartFolder_${partIndex}`, "main");
        } else if (part.isExisting && part.existingUrl) {
          submitFormData.append(`keepExistingPart_${partIndex}`, "true");
          submitFormData.append(`equipmentPartFolder_${partIndex}`, "main");
        }
        partIndex++;
      });

      // Add equipment parts from folders
      equipmentFolders.forEach((folder) => {
        folder.parts.forEach((part) => {
          if (part.file) {
            submitFormData.append(`equipmentPart_${partIndex}`, part.file);
            submitFormData.append(`equipmentPartFolder_${partIndex}`, folder.name);
          } else if (part.isExisting && part.existingUrl) {
            submitFormData.append(`keepExistingPart_${partIndex}`, "true");
            submitFormData.append(`equipmentPartFolder_${partIndex}`, folder.name);
          }
          partIndex++;
        });
      });

      // Add keep existing file flags for edit mode
      if (isEditMode) {
        Object.entries(files).forEach(([key, fileState]) => {
          const fieldName = getKeepExistingFieldName(key);
          submitFormData.append(fieldName, fileState.keep.toString());
        });
      }

      const method = isEditMode ? "PUT" : "POST";
      const response = await fetch("/api/equipments", {
        method: method,
        body: submitFormData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`API Error Response:`, errorData);
        throw new Error(errorData.details || errorData.error || `Failed to ${isEditMode ? "update" : "create"} equipment`);
      }

      toast.success(`Equipment ${isEditMode ? "updated" : "added"} successfully`);

      // Reset all states
      resetForm();
      resetFiles();
      resetParts();
      
      onSuccess();
    } catch (error) {
      console.error(`Error ${isEditMode ? "updating" : "creating"} equipment:`, error);
      toast.error(`Failed to ${isEditMode ? "update" : "add"} equipment. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleSubmit,
  };
};
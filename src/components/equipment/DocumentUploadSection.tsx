"use client";

import { FileUploadSectionSimple } from "./FileUploadSectionSimple";
import { FileText, Upload, Shield } from "lucide-react";
import { useCallback } from "react";
import type { Equipment, FilesState } from "@/types/equipment";

interface DocumentUploadSectionProps {
  files: FilesState;
  setFiles: React.Dispatch<React.SetStateAction<FilesState>>;
  editEquipment?: Equipment | null;
}

export function DocumentUploadSection({
  files,
  setFiles,
  editEquipment,
}: DocumentUploadSectionProps) {
  const updateFileState = useCallback((key: keyof FilesState, update: Partial<FilesState[keyof FilesState]>) => {
    setFiles(prev => ({
      ...prev,
      [key]: { ...prev[key], ...update }
    }));
  }, [setFiles]);

  // Memoized callback functions to prevent re-renders
  const handleImageFileChange = useCallback((file: File | null) => updateFileState('image', { file }), [updateFileState]);
  const handleImageKeepChange = useCallback((keep: boolean) => updateFileState('image', { keep }), [updateFileState]);
  
  const handleReceiptFileChange = useCallback((file: File | null) => updateFileState('receipt', { file }), [updateFileState]);
  const handleReceiptKeepChange = useCallback((keep: boolean) => updateFileState('receipt', { keep }), [updateFileState]);
  
  const handleRegistrationFileChange = useCallback((file: File | null) => updateFileState('registration', { file }), [updateFileState]);
  const handleRegistrationKeepChange = useCallback((keep: boolean) => updateFileState('registration', { keep }), [updateFileState]);
  
  const handleThirdpartyFileChange = useCallback((file: File | null) => updateFileState('thirdpartyInspection', { file }), [updateFileState]);
  const handleThirdpartyKeepChange = useCallback((keep: boolean) => updateFileState('thirdpartyInspection', { keep }), [updateFileState]);
  
  const handlePgpcFileChange = useCallback((file: File | null) => updateFileState('pgpcInspection', { file }), [updateFileState]);
  const handlePgpcKeepChange = useCallback((keep: boolean) => updateFileState('pgpcInspection', { keep }), [updateFileState]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Document Uploads</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FileUploadSectionSimple
          label="Equipment Image"
          accept="image/*"
          currentFileUrl={editEquipment?.image_url}
          onFileChange={handleImageFileChange}
          onKeepExistingChange={handleImageKeepChange}
          icon={<Upload className="h-4 w-4" />}
        />
        
        <FileUploadSectionSimple
          label="Original Receipt"
          accept=".pdf,image/*"
          currentFileUrl={editEquipment?.originalReceiptUrl}
          onFileChange={handleReceiptFileChange}
          onKeepExistingChange={handleReceiptKeepChange}
          icon={<FileText className="h-4 w-4" />}
        />
        
        <FileUploadSectionSimple
          label="Equipment Registration"
          accept=".pdf,image/*"
          currentFileUrl={editEquipment?.equipmentRegistrationUrl}
          onFileChange={handleRegistrationFileChange}
          onKeepExistingChange={handleRegistrationKeepChange}
          icon={<FileText className="h-4 w-4" />}
        />
        
        <FileUploadSectionSimple
          label="3rd Party Inspection"
          accept="image/*"
          currentFileUrl={editEquipment?.thirdpartyInspectionImage}
          onFileChange={handleThirdpartyFileChange}
          onKeepExistingChange={handleThirdpartyKeepChange}
          icon={<Shield className="h-4 w-4" />}
        />
        
        <FileUploadSectionSimple
          label="PGPC Inspection"
          accept="image/*"
          currentFileUrl={editEquipment?.pgpcInspectionImage}
          onFileChange={handlePgpcFileChange}
          onKeepExistingChange={handlePgpcKeepChange}
          icon={<Shield className="h-4 w-4" />}
        />
      </div>
    </div>
  );
}
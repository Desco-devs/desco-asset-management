"use client";

import { BasicInfoFields } from "./BasicInfoFields";
import { ProjectSelectionFields } from "./ProjectSelectionFields";
import { DocumentUploadSection } from "./DocumentUploadSection";
import { EquipmentPartsSection } from "./EquipmentPartsSection";
import type { EquipmentFormData, Equipment, Location, Client, Project, FilesState } from "@/types/equipment";
import type { EquipmentFolder, EquipmentPart } from "@/types/equipment-parts";

interface EquipmentFormContainerProps {
  formData: EquipmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EquipmentFormData>>;
  locations: Location[];
  filteredClients: Client[];
  filteredProjects: Project[];
  files: FilesState;
  setFiles: React.Dispatch<React.SetStateAction<FilesState>>;
  equipmentParts: EquipmentPart[];
  setEquipmentParts: React.Dispatch<React.SetStateAction<EquipmentPart[]>>;
  equipmentFolders: EquipmentFolder[];
  setEquipmentFolders: React.Dispatch<React.SetStateAction<EquipmentFolder[]>>;
  editEquipment?: Equipment | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function EquipmentFormContainer({
  formData,
  setFormData,
  locations,
  filteredClients,
  filteredProjects,
  files,
  setFiles,
  equipmentParts,
  setEquipmentParts,
  equipmentFolders,
  setEquipmentFolders,
  editEquipment,
  onSubmit,
}: EquipmentFormContainerProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 overflow-y-auto scroll-none p-2"
    >
      {/* Project Selection Fields */}
      <ProjectSelectionFields
        formData={formData}
        setFormData={setFormData}
        locations={locations}
        filteredClients={filteredClients}
        filteredProjects={filteredProjects}
      />

      {/* Basic Information Fields */}
      <BasicInfoFields
        formData={formData}
        setFormData={setFormData}
      />

      {/* Document Upload Section */}
      <DocumentUploadSection
        files={files}
        setFiles={setFiles}
        editEquipment={editEquipment}
      />

      {/* Equipment Parts Section */}
      <EquipmentPartsSection
        equipmentParts={equipmentParts}
        setEquipmentParts={setEquipmentParts}
        equipmentFolders={equipmentFolders}
        setEquipmentFolders={setEquipmentFolders}
      />
    </form>
  );
}
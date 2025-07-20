"use client";

import { BasicInfoFields } from "./BasicInfoFields";
import { ProjectSelectionFields } from "./ProjectSelectionFields";
import { DocumentUploadSection } from "./DocumentUploadSection";
import { EquipmentPartsSection } from "./EquipmentPartsSection";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Settings, Image } from "lucide-react";
import type { EquipmentFormData, Equipment, Project, FilesState } from "@/types/equipment";
import type { EquipmentFolder, EquipmentPart } from "@/types/equipment-parts";

interface EquipmentFormContainerProps {
  formData: EquipmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EquipmentFormData>>;
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
      className="overflow-y-auto scroll-none p-2"
    >
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Basic Info
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="parts" className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Equipment Parts
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4 mt-4">
          {/* Project Selection Fields */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Project & Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProjectSelectionFields
                formData={formData}
                setFormData={setFormData}
                filteredProjects={filteredProjects}
              />

              {/* Basic Information Fields */}
              <BasicInfoFields
                formData={formData}
                setFormData={setFormData}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="documents" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Document Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Document Upload Section */}
              <DocumentUploadSection
                files={files}
                setFiles={setFiles}
                editEquipment={editEquipment}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="parts" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Equipment Parts Management</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Equipment Parts Section */}
              <EquipmentPartsSection
                equipmentParts={equipmentParts}
                setEquipmentParts={setEquipmentParts}
                equipmentFolders={equipmentFolders}
                setEquipmentFolders={setEquipmentFolders}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </form>
  );
}
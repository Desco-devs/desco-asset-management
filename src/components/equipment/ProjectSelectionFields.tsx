"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Location, Client, Project, EquipmentFormData } from "@/types/equipment";

interface ProjectSelectionFieldsProps {
  formData: EquipmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EquipmentFormData>>;
  locations: Location[];
  filteredClients: Client[];
  filteredProjects: Project[];
}

export function ProjectSelectionFields({
  formData,
  setFormData,
  locations,
  filteredClients,
  filteredProjects,
}: ProjectSelectionFieldsProps) {
  const handleSelectionChange = (field: keyof EquipmentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Project Information</h3>
      <div className="grid grid-cols-3 gap-4">
      {/* Location Selection */}
      <div className="space-y-2">
        <Label htmlFor="location">
          Location <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.locationId}
          onValueChange={(value) => handleSelectionChange('locationId', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.uid} value={location.uid}>
                {location.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client Selection */}
      <div className="space-y-2">
        <Label htmlFor="client">
          Client <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.clientId}
          onValueChange={(value) => handleSelectionChange('clientId', value)}
          disabled={!formData.locationId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            {filteredClients.map((client) => (
              <SelectItem key={client.uid} value={client.uid}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <Label htmlFor="project">
          Project <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.projectId}
          onValueChange={(value) => handleSelectionChange('projectId', value)}
          disabled={!formData.clientId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select project" />
          </SelectTrigger>
          <SelectContent>
            {filteredProjects.map((project) => (
              <SelectItem key={project.uid} value={project.uid}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
    </div>
  );
}
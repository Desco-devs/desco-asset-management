"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Project, EquipmentFormData } from "@/types/equipment";

interface ProjectSelectionFieldsProps {
  formData: EquipmentFormData;
  setFormData: React.Dispatch<React.SetStateAction<EquipmentFormData>>;
  filteredProjects: Project[];
}

export function ProjectSelectionFields({
  formData,
  setFormData,
  filteredProjects,
}: ProjectSelectionFieldsProps) {
  const handleProjectChange = (value: string) => {
    setFormData(prev => ({ ...prev, projectId: value }));
  };

  // Ensure unique projects by uid and filter out any invalid entries
  const uniqueProjects = filteredProjects?.filter((project, index, self) => 
    project?.uid && 
    project.name && 
    self.findIndex(p => p.uid === project.uid) === index
  ) || [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Project Information</h3>
      
      {/* Project Selection Only */}
      <div className="space-y-2">
        <Label htmlFor="project" className="text-foreground">
          Project <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.projectId}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent className="w-full">
            {uniqueProjects.length === 0 ? (
              <SelectItem value="no-projects" disabled>
                No projects available
              </SelectItem>
            ) : (
              uniqueProjects.map((project, index) => (
                <SelectItem 
                  key={`${project.uid}-${index}`} 
                  value={project.uid}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{project.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {project.client?.name || 'Unknown Client'} • {project.client?.location?.address || 'Unknown Location'}
                    </span>
                  </div>
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
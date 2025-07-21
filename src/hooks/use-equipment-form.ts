import { useState, useEffect, useCallback } from 'react';
import type { EquipmentFormData, Equipment, Project } from '@/types/equipment';

export const useEquipmentForm = (editEquipment?: Equipment | null) => {
  const [formData, setFormData] = useState<EquipmentFormData>({
    brand: "",
    model: "",
    type: "",
    insuranceExpirationDate: undefined,
    before: "",
    status: "OPERATIONAL",
    remarks: "",
    owner: "",
    plateNumber: "",
    inspectionDate: undefined,
    projectId: "",
  });

  const [projects, setProjects] = useState<Project[]>([]);

  const isEditMode = editEquipment !== null;

  // Helper function to safely parse dates
  const safeParseDate = (dateString: string) => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
  };

  // Populate form when editing
  useEffect(() => {
    if (editEquipment) {
      setFormData({
        brand: editEquipment.brand,
        model: editEquipment.model,
        type: editEquipment.type,
        insuranceExpirationDate: safeParseDate(editEquipment.insuranceExpirationDate || ""),
        before: editEquipment.before ? editEquipment.before.toString() : "",
        status: editEquipment.status,
        remarks: editEquipment.remarks || "",
        owner: editEquipment.owner,
        plateNumber: editEquipment.plateNumber || "",
        inspectionDate: safeParseDate(editEquipment.inspectionDate || ""),
        projectId: editEquipment.project.uid,
      });
    }
  }, [editEquipment]);

  // No complex filtering needed since we only work with projects

  // API fetch functions - memoized to prevent infinite loops

  const fetchProjects = useCallback(async () => {
    try {
      let response = await fetch("/api/projects/getall");

      if (!response.ok) {
        response = await fetch("/api/projects");
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      
      // Transform Prisma data to match frontend types
      const transformedProjects: Project[] = Array.isArray(data) ? data.map((project: any) => ({
        uid: project.id,
        name: project.name,
        clientId: project.client_id,
        client: {
          uid: project.client.id,
          name: project.client.name,
          location: {
            uid: project.client.location.id,
            address: project.client.location.address,
          },
        },
      })) : [];
      
      setProjects(transformedProjects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      setProjects([]);
    }
  }, []);

  const resetForm = useCallback(() => {
    setFormData({
      brand: "",
      model: "",
      type: "",
      insuranceExpirationDate: undefined,
      before: "",
      status: "OPERATIONAL",
      remarks: "",
      owner: "",
      plateNumber: "",
      inspectionDate: undefined,
      projectId: "",
    });
  }, []);

  const isFormValid = !!(formData.brand && formData.model && formData.type && formData.owner && formData.projectId);

  return {
    formData,
    setFormData,
    projects,
    filteredProjects: projects, // All projects are available since no filtering is needed
    isEditMode,
    fetchProjects,
    resetForm,
    isFormValid,
  };
};
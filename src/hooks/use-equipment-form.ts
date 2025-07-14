import { useState, useEffect, useCallback } from 'react';
import type { EquipmentFormData, Equipment, Location, Client, Project } from '@/types/equipment';

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
    locationId: "",
    clientId: "",
    projectId: "",
  });

  const [locations, setLocations] = useState<Location[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);

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
        before: editEquipment.before?.toString() || "",
        status: editEquipment.status,
        remarks: editEquipment.remarks || "",
        owner: editEquipment.owner,
        plateNumber: editEquipment.plateNumber || "",
        inspectionDate: safeParseDate(editEquipment.inspectionDate || ""),
        locationId: editEquipment.project.client.location.uid,
        clientId: editEquipment.project.client.uid,
        projectId: editEquipment.project.uid,
      });
    }
  }, [editEquipment]);

  // Filter clients based on selected location
  useEffect(() => {
    if (formData.locationId && Array.isArray(clients)) {
      const clientsInLocation = clients.filter(
        (client) => client.locationId === formData.locationId
      );
      setFilteredClients(clientsInLocation);

      if (
        !isEditMode ||
        (isEditMode && editEquipment?.project.client.location.uid !== formData.locationId)
      ) {
        setFormData((prev) => ({
          ...prev,
          clientId: isEditMode ? editEquipment?.project.client.uid || "" : "",
          projectId: isEditMode ? editEquipment?.project.uid || "" : "",
        }));
      }
    } else {
      setFilteredClients([]);
    }
  }, [formData.locationId, clients, isEditMode, editEquipment]);

  // Filter projects based on selected client
  useEffect(() => {
    if (formData.clientId && Array.isArray(projects)) {
      const projectsForClient = projects.filter(
        (project) => project.clientId === formData.clientId
      );
      setFilteredProjects(projectsForClient);

      if (
        !isEditMode ||
        (isEditMode && editEquipment?.project.client.uid !== formData.clientId)
      ) {
        setFormData((prev) => ({
          ...prev,
          projectId: isEditMode ? editEquipment?.project.uid || "" : "",
        }));
      }
    } else {
      setFilteredProjects([]);
    }
  }, [formData.clientId, projects, isEditMode, editEquipment]);

  // API fetch functions - memoized to prevent infinite loops
  const fetchLocations = useCallback(async () => {
    try {
      const response = await fetch("/api/locations/getall");
      if (!response.ok) {
        throw new Error("Failed to fetch locations");
      }
      const data = await response.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching locations:", error);
      setLocations([]);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetch("/api/clients/getall");
      if (!response.ok) {
        throw new Error("Failed to fetch clients");
      }
      const data = await response.json();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    }
  }, []);

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
      setProjects(Array.isArray(data) ? data : []);
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
      locationId: "",
      clientId: "",
      projectId: "",
    });
  }, []);

  const isFormValid = !!(formData.brand && formData.model && formData.type && formData.owner && formData.projectId);

  return {
    formData,
    setFormData,
    locations,
    clients,
    projects,
    filteredClients,
    filteredProjects,
    isEditMode,
    fetchLocations,
    fetchClients,
    fetchProjects,
    resetForm,
    isFormValid,
  };
};
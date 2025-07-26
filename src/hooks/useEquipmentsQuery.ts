"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import type { Equipment, MaintenanceReport, EquipmentMaintenanceReport, Project, Client, Location, User, ExportFilters } from "@/stores/equipmentsStore";

// Query keys for consistent cache management
export const equipmentKeys = {
  all: ['equipments'] as const,
  equipments: () => [...equipmentKeys.all, 'list'] as const,
  equipment: (id: string) => [...equipmentKeys.all, 'item', id] as const,
  projects: () => ['projects'] as const,
  clients: () => ['clients'] as const,
  locations: () => ['locations'] as const,
  users: () => ['users'] as const,
  maintenanceReports: () => ['equipment-maintenance-reports'] as const,
  equipmentMaintenanceReports: () => ['equipment-maintenance-reports'] as const,
  exports: () => ['equipment-exports'] as const,
};

// API functions
async function fetchEquipments(): Promise<Equipment[]> {
  const response = await fetch('/api/equipments');
  if (!response.ok) throw new Error('Failed to fetch equipments');
  const result = await response.json();
  const data = result.data || result; // Handle both formats
  
  // Transform the data to match our Equipment interface
  return data.map((item: any) => ({
    uid: item.id,
    brand: item.brand,
    model: item.model,
    type: item.type,
    insuranceExpirationDate: item.insurance_expiration_date || '',
    registrationExpiry: item.registration_expiry || undefined,
    before: item.before || undefined,
    status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
    remarks: item.remarks || undefined,
    owner: item.owner,
    image_url: item.image_url || undefined,
    inspectionDate: item.inspection_date || undefined,
    plateNumber: item.plate_number || undefined,
    originalReceiptUrl: item.original_receipt_url || undefined,
    equipmentRegistrationUrl: item.equipment_registration_url || undefined,
    thirdpartyInspectionImage: item.thirdparty_inspection_image || undefined,
    pgpcInspectionImage: item.pgpc_inspection_image || undefined,
    equipmentParts: item.equipment_parts || undefined,
    project: {
      uid: item.project.id,
      name: item.project.name,
      client: {
        uid: item.project.client.id,
        name: item.project.client.name,
        location: {
          uid: item.project.client.location.id,
          address: item.project.client.location.address,
        },
      },
    },
  }));
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects/getall');
  if (!response.ok) throw new Error('Failed to fetch projects');
  const data = await response.json();
  
  return data.map((item: any) => ({
    uid: item.id,
    name: item.name,
    client: {
      uid: item.client.id,
      name: item.client.name,
      location: {
        uid: item.client.location.id,
        address: item.client.location.address,
      },
    },
  }));
}

async function fetchClients(): Promise<Client[]> {
  const response = await fetch('/api/clients/getall');
  if (!response.ok) throw new Error('Failed to fetch clients');
  const data = await response.json();
  
  return data.map((item: any) => ({
    uid: item.id,
    name: item.name,
    location: {
      uid: item.location.id,
      address: item.location.address,
    },
  }));
}

async function fetchLocations(): Promise<Location[]> {
  const response = await fetch('/api/locations/getall');
  if (!response.ok) throw new Error('Failed to fetch locations');
  const data = await response.json();
  
  return data.map((item: any) => ({
    uid: item.id,
    address: item.address,
  }));
}

async function fetchUsers(): Promise<User[]> {
  const response = await fetch('/api/users/getall');
  if (!response.ok) throw new Error('Failed to fetch users');
  return response.json();
}

async function fetchMaintenanceReports(): Promise<MaintenanceReport[]> {
  const response = await fetch('/api/equipments/maintenance-reports');
  if (!response.ok) throw new Error('Failed to fetch maintenance reports');
  const data = await response.json();
  return data.data || [];
}

async function fetchEquipmentMaintenanceReports(): Promise<EquipmentMaintenanceReport[]> {
  const response = await fetch('/api/equipments/maintenance-reports');
  if (!response.ok) throw new Error('Failed to fetch equipment maintenance reports');
  const data = await response.json();
  return data.data || [];
}

async function createEquipment(equipmentData: Partial<Equipment>): Promise<Equipment> {
  const response = await fetch('/api/equipments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(equipmentData),
  });
  if (!response.ok) throw new Error('Failed to create equipment');
  return response.json();
}

async function updateEquipment({ uid, ...equipmentData }: Partial<Equipment> & { uid: string }): Promise<Equipment> {
  const response = await fetch(`/api/equipments/${uid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(equipmentData),
  });
  if (!response.ok) throw new Error('Failed to update equipment');
  return response.json();
}

async function deleteEquipment(uid: string): Promise<void> {
  // Prevent deletion of temporary IDs from optimistic updates
  if (uid.startsWith('temp_')) {
    throw new Error('Cannot delete equipment that is still being created');
  }
  
  const response = await fetch(`/api/equipments/${uid}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to delete equipment (${response.status})`);
  }
}

async function createMaintenanceReport(reportData: Partial<MaintenanceReport>): Promise<MaintenanceReport> {
  const response = await fetch('/api/equipments/maintenance-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) throw new Error('Failed to create maintenance report');
  return response.json();
}

async function updateMaintenanceReport({ id, ...reportData }: Partial<MaintenanceReport> & { id: string }): Promise<MaintenanceReport> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update maintenance report (${response.status})`);
  }
  return response.json();
}

async function deleteMaintenanceReport(id: string): Promise<void> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Failed to delete maintenance report (${response.status})`);
  }
}

async function createEquipmentMaintenanceReport(reportData: Partial<EquipmentMaintenanceReport>): Promise<EquipmentMaintenanceReport> {
  const response = await fetch('/api/equipments/maintenance-reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to create equipment maintenance report: ${response.status} ${errorData}`);
  }
  return response.json();
}

async function updateEquipmentMaintenanceReport({ id, ...reportData }: Partial<EquipmentMaintenanceReport> & { id: string }): Promise<EquipmentMaintenanceReport> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reportData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to update equipment maintenance report (${response.status})`);
  }
  return response.json();
}

async function deleteEquipmentMaintenanceReport(id: string): Promise<void> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.details || `Failed to delete equipment maintenance report (${response.status})`);
  }
}

// Helper function to deduplicate equipments array
function deduplicateEquipments(equipments: Equipment[]): Equipment[] {
  const seen = new Set();
  return equipments.filter(equipment => {
    if (seen.has(equipment.uid)) {
      return false;
    }
    seen.add(equipment.uid);
    return true;
  });
}

// TanStack Query Hooks

// Equipments
export function useEquipments() {
  return useQuery({
    queryKey: equipmentKeys.equipments(),
    queryFn: fetchEquipments,
    select: (data) => deduplicateEquipments(data), // Always deduplicate
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce refetch frequency
    gcTime: 15 * 60 * 1000, // 15 minutes
  });
}

// Reference Data
export function useProjects() {
  return useQuery({
    queryKey: equipmentKeys.projects(),
    queryFn: fetchProjects,
    staleTime: 5 * 60 * 1000, // 5 minutes - projects change less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useClients() {
  return useQuery({
    queryKey: equipmentKeys.clients(),
    queryFn: fetchClients,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useLocations() {
  return useQuery({
    queryKey: equipmentKeys.locations(),
    queryFn: fetchLocations,
    staleTime: 10 * 60 * 1000, // 10 minutes - locations rarely change
    gcTime: 15 * 60 * 1000,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: equipmentKeys.users(),
    queryFn: fetchUsers,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

export function useMaintenanceReports() {
  return useQuery({
    queryKey: equipmentKeys.maintenanceReports(),
    queryFn: fetchMaintenanceReports,
    select: (data) => deduplicateMaintenanceReports(data), // Always deduplicate
    staleTime: 1 * 60 * 1000, // 1 minute - maintenance reports change frequently
    gcTime: 3 * 60 * 1000,
  });
}

export function useEquipmentMaintenanceReports() {
  return useQuery({
    queryKey: equipmentKeys.equipmentMaintenanceReports(),
    queryFn: fetchEquipmentMaintenanceReports,
    select: (data) => deduplicateEquipmentMaintenanceReports(data), // Always deduplicate
    staleTime: 1 * 60 * 1000, // 1 minute - maintenance reports change frequently
    gcTime: 3 * 60 * 1000,
  });
}

// Combined hook for all data (optimized with parallel fetching)
export function useEquipmentsWithReferenceData() {
  const equipmentsQuery = useEquipments();
  const projectsQuery = useProjects();
  const clientsQuery = useClients();
  const locationsQuery = useLocations();
  const usersQuery = useUsers();
  const maintenanceReportsQuery = useMaintenanceReports();

  return {
    equipments: equipmentsQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    clients: clientsQuery.data ?? [],
    locations: locationsQuery.data ?? [],
    users: usersQuery.data ?? [],
    maintenanceReports: maintenanceReportsQuery.data ?? [],
    isLoading: equipmentsQuery.isLoading || projectsQuery.isLoading,
    isError: equipmentsQuery.isError || projectsQuery.isError || clientsQuery.isError || locationsQuery.isError || usersQuery.isError || maintenanceReportsQuery.isError,
    error: equipmentsQuery.error || projectsQuery.error || clientsQuery.error || locationsQuery.error || usersQuery.error || maintenanceReportsQuery.error,
  };
}

// Fast Server Action Equipment Creation
export function useCreateEquipmentAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        // Import server action dynamically for edge compatibility
        const { createEquipmentAction } = await import('../app/(admin-dashboard)/equipments/actions');
        return await createEquipmentAction(formData);
      } catch (error) {
        console.error('Equipment creation mutation failed:', error);
        throw error;
      }
    },
    onMutate: async (formData: FormData) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: equipmentKeys.equipments() });

      // Snapshot the previous value for rollback
      const previousEquipments = queryClient.getQueryData<Equipment[]>(equipmentKeys.equipments());

      // Create optimistic equipment for instant UI feedback
      const brand = formData.get("brand") as string;
      const model = formData.get("model") as string;
      const type = formData.get("type") as string;
      const owner = formData.get("owner") as string;
      const status = formData.get("status") as string;
      const projectId = formData.get("projectId") as string;
      
      if (brand && model && type && owner) {
        // Get project data for optimistic update
        const projectsData = queryClient.getQueryData<any[]>(equipmentKeys.projects());
        const matchingProject = projectsData?.find(p => p.uid === projectId);
        
        const optimisticEquipment: Equipment = {
          uid: `temp_${Date.now()}`, // Temporary ID for optimistic update
          brand,
          model,
          type,
          owner,
          status: (status as "OPERATIONAL" | "NON_OPERATIONAL") || "OPERATIONAL",
          plateNumber: formData.get("plateNumber") as string || undefined,
          remarks: formData.get("remarks") as string || undefined,
          insuranceExpirationDate: formData.get("insuranceExpirationDate") as string || '',
          before: formData.get("before") ? parseInt(formData.get("before") as string) : undefined,
          inspectionDate: formData.get("inspectionDate") as string || undefined,
          image_url: undefined,
          originalReceiptUrl: undefined,
          equipmentRegistrationUrl: undefined,
          thirdpartyInspectionImage: undefined,
          pgpcInspectionImage: undefined,
          equipmentParts: undefined,
          project: matchingProject || { uid: projectId || '', name: 'Loading...', client: { uid: '', name: 'Loading...', location: { uid: '', address: 'Loading...' }}},
        };

        // Optimistically update cache for instant feedback
        queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
          return oldData ? [optimisticEquipment, ...oldData] : [optimisticEquipment];
        });
      }

      return { previousEquipments };
    },
    onSuccess: (result, formData, context) => {
      // Server action completed successfully
      // Don't invalidate - let optimistic update and real-time handle it
    },
    onError: (error, formData, context) => {
      console.error('Equipment creation failed:', error);
      
      // Rollback optimistic update on error
      if (context?.previousEquipments) {
        queryClient.setQueryData(equipmentKeys.equipments(), context.previousEquipments);
      }
      
      // Enhanced error messages for different error types
      let errorMessage = 'Failed to create equipment';
      if (error instanceof Error) {
        if (error.message.includes('Missing required fields')) {
          errorMessage = error.message;
        } else if (error.message.includes('File upload failed')) {
          errorMessage = 'File upload failed. Please check your files and try again.';
        } else if (error.message.includes('Project not found')) {
          errorMessage = 'Selected project is invalid. Please refresh the page and try again.';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage = 'You are not authorized to create equipment. Please log in again.';
        } else {
          errorMessage = `Failed to create equipment: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    },
    onSettled: () => {
      // Don't invalidate on success - optimistic update + real-time handles it
      // Only for debugging - remove this invalidation
    },
  });
}

// Fast Server Action Equipment Update
export function useUpdateEquipmentAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Import server action dynamically for edge compatibility
      const { updateEquipmentAction } = await import('../app/(admin-dashboard)/equipments/actions');
      return await updateEquipmentAction(formData);
    },
    onMutate: async (formData: FormData) => {
      // Cancel outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: equipmentKeys.equipments() });

      // Snapshot the previous value for rollback
      const previousEquipments = queryClient.getQueryData<Equipment[]>(equipmentKeys.equipments());

      // 🚀 INSTANT UPDATES: Optimistic update for partial changes
      const equipmentId = formData.get("equipmentId") as string;
      
      if (equipmentId) {
        // Get all possible field updates (only what was sent)
        const brand = formData.get("brand") as string;
        const model = formData.get("model") as string;
        const type = formData.get("type") as string;
        const owner = formData.get("owner") as string;
        const status = formData.get("status") as string;
        const plateNumber = formData.get("plateNumber") as string;
        const remarks = formData.get("remarks") as string;
        const insuranceExpirationDate = formData.get("insuranceExpirationDate") as string;
        const inspectionDate = formData.get("inspectionDate") as string;
        const before = formData.get("before") as string;
        const projectId = formData.get("projectId") as string;
        
        // Optimistically update cache for instant feedback
        queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
          if (!oldData) return oldData;
          
          return oldData.map((equipment) => {
            if (equipment.uid === equipmentId) {
              
              // Create updated equipment object
              const updatedEquipment = {
                ...equipment,
                // Only update fields that were actually sent (partial updates)
                ...(brand && { brand }),
                ...(model && { model }),
                ...(type && { type }),
                ...(owner && { owner }),
                ...(status && { status: status as "OPERATIONAL" | "NON_OPERATIONAL" }),
                ...(plateNumber !== null && { plateNumber }),
                ...(remarks !== null && { remarks }),
                ...(insuranceExpirationDate && { insuranceExpirationDate }),
                ...(inspectionDate && { inspectionDate }),
                ...(before && { before: parseInt(before) }),
              };

              // Handle project update ONLY if projectId was actually sent in the form
              if (projectId && projectId !== equipment.project.uid) {
                const projectsData = queryClient.getQueryData<any[]>(equipmentKeys.projects());
                const matchingProject = projectsData?.find(p => p.uid === projectId);
                if (matchingProject) {
                  updatedEquipment.project = matchingProject;
                }
              }
              // If no projectId or same project, keep existing project data unchanged

              // Handle file removals optimistically
              if (formData.get("remove_equipmentImage") === "true") {
                updatedEquipment.image_url = undefined;
              }
              if (formData.get("remove_thirdpartyInspection") === "true") {
                updatedEquipment.thirdpartyInspectionImage = undefined;
              }
              if (formData.get("remove_pgpcInspection") === "true") {
                updatedEquipment.pgpcInspectionImage = undefined;
              }
              if (formData.get("remove_originalReceipt") === "true") {
                updatedEquipment.originalReceiptUrl = undefined;
              }
              if (formData.get("remove_equipmentRegistration") === "true") {
                updatedEquipment.equipmentRegistrationUrl = undefined;
              }
              
              // 🔧 CRITICAL FIX: Handle parts structure updates optimistically
              const partsStructureData = formData.get("partsStructure") as string;
              if (partsStructureData) {
                try {
                  const partsStructure = JSON.parse(partsStructureData);
                  // Store as array with JSON string (matching database format)
                  updatedEquipment.equipmentParts = [JSON.stringify(partsStructure)];
                } catch (error) {
                }
              }

              return updatedEquipment;
            }
            return equipment;
          });
        });
      }

      return { previousEquipments };
    },
    onSuccess: (result, formData, context) => {
      // Server action completed successfully - realtime will handle the real data
      
      // 🚀 INSTANT UPDATES: Don't invalidate immediately, let real-time handle it
      // The optimistic update already shows the changes instantly
      // Real-time subscription will update with server data when DB changes
    },
    onError: (error, formData, context) => {
      console.error('Equipment update failed:', error);
      
      // Rollback optimistic update on error
      if (context?.previousEquipments) {
        queryClient.setQueryData(equipmentKeys.equipments(), context.previousEquipments);
      }
      
      // Enhanced error messages for different error types
      let errorMessage = 'Failed to update equipment';
      if (error instanceof Error) {
        if (error.message.includes('Equipment not found')) {
          errorMessage = 'Equipment not found. It may have been deleted.';
        } else if (error.message.includes('Unauthorized')) {
          errorMessage = 'You are not authorized to update this equipment. Please log in again.';
        } else {
          errorMessage = `Failed to update equipment: ${error.message}`;
        }
      }
      
      toast.error(errorMessage);
    },
  });
}

// Legacy API Equipment Mutations (kept for compatibility)
export function useCreateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEquipment,
    onSuccess: (newEquipment) => {
      // Optimistically add to cache immediately with deduplication
      queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
        if (!oldData) return [newEquipment];
        
        // Check if equipment already exists to prevent duplicates
        const existingEquipment = oldData.find(equipment => equipment.uid === newEquipment.uid);
        if (existingEquipment) {
          return oldData;
        }
        return deduplicateEquipments([newEquipment, ...oldData]);
      });
      // Toast moved to realtime listener to show for all equipment creations
    },
    onError: (error) => {
      console.error('Legacy equipment creation failed:', error);
      toast.error('Failed to create equipment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEquipment,
    onSuccess: (updatedEquipment) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
        if (!oldData) return [updatedEquipment];
        const updated = oldData.map(equipment => 
          equipment.uid === updatedEquipment.uid ? updatedEquipment : equipment
        );
        return deduplicateEquipments(updated);
      });
      // Toast moved to realtime listener for unified notification system
    },
    onError: (error) => {
      console.error('Legacy equipment update failed:', error);
      toast.error('Failed to update equipment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEquipment,
    onSuccess: (_, equipmentUid) => {
      // Optimistic update - remove equipment from cache immediately
      queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
        const filtered = oldData ? oldData.filter(equipment => equipment.uid !== equipmentUid) : [];
        return deduplicateEquipments(filtered);
      });
      // Toast moved to realtime listener for unified notification system
    },
    onError: (error) => {
      console.error('Equipment deletion failed:', error);
      toast.error('Failed to delete equipment: ' + (error instanceof Error ? error.message : 'Unknown error'));
    },
  });
}

// Helper function to deduplicate maintenance reports array
function deduplicateMaintenanceReports(reports: MaintenanceReport[]): MaintenanceReport[] {
  const seen = new Set();
  return reports.filter(report => {
    if (seen.has(report.id)) {
      return false;
    }
    seen.add(report.id);
    return true;
  });
}

// Helper function to deduplicate equipment maintenance reports array
function deduplicateEquipmentMaintenanceReports(reports: EquipmentMaintenanceReport[]): EquipmentMaintenanceReport[] {
  const seen = new Set();
  return reports.filter(report => {
    if (seen.has(report.id)) {
      return false;
    }
    seen.add(report.id);
    return true;
  });
}

// Maintenance Report Mutations
export function useCreateMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMaintenanceReport,
    onSuccess: (newReport) => {
      // Optimistically add to cache immediately
      queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
        if (!oldData) return [newReport];
        
        // Check if report already exists to prevent duplicates
        const existingReport = oldData.find(report => report.id === newReport.id);
        if (existingReport) {
          return oldData;
        }
        return deduplicateMaintenanceReports([newReport, ...oldData]);
      });
      toast.success('Maintenance report created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create maintenance report: ' + error.message);
    },
  });
}

export function useUpdateMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateMaintenanceReport,
    onSuccess: (updatedReport) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
        if (!oldData) return [updatedReport];
        const updated = oldData.map(report => 
          report.id === updatedReport.id ? updatedReport : report
        );
        return deduplicateMaintenanceReports(updated);
      });
      toast.success('Maintenance report updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update maintenance report: ' + error.message);
    },
  });
}

export function useDeleteMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteMaintenanceReport,
    onSuccess: (_, reportId) => {
      // Optimistic update - remove report from cache immediately
      queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
        const filtered = oldData ? oldData.filter(report => report.id !== reportId) : [];
        return deduplicateMaintenanceReports(filtered);
      });
      toast.success('Maintenance report deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete maintenance report: ' + error.message);
    },
  });
}

// Equipment Maintenance Report Mutations
export function useCreateEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEquipmentMaintenanceReport,
    onSuccess: (newReport) => {
      // Optimistically add to cache immediately
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.equipmentMaintenanceReports(), (oldData) => {
        if (!oldData) return [newReport];
        
        // Check if report already exists to prevent duplicates
        const existingReport = oldData.find(report => report.id === newReport.id);
        if (existingReport) {
          return oldData;
        }
        return deduplicateEquipmentMaintenanceReports([newReport, ...oldData]);
      });
      toast.success('Equipment maintenance report created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create equipment maintenance report: ' + error.message);
    },
  });
}

export function useUpdateEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEquipmentMaintenanceReport,
    onSuccess: (updatedReport) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.equipmentMaintenanceReports(), (oldData) => {
        if (!oldData) return [updatedReport];
        const updated = oldData.map(report => 
          report.id === updatedReport.id ? updatedReport : report
        );
        return deduplicateEquipmentMaintenanceReports(updated);
      });
      toast.success('Equipment maintenance report updated successfully!');
    },
    onError: (error) => {
      toast.error('Failed to update equipment maintenance report: ' + error.message);
    },
  });
}

export function useDeleteEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEquipmentMaintenanceReport,
    onSuccess: (_, reportId) => {
      // Optimistic update - remove report from cache immediately
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.equipmentMaintenanceReports(), (oldData) => {
        const filtered = oldData ? oldData.filter(report => report.id !== reportId) : [];
        return deduplicateEquipmentMaintenanceReports(filtered);
      });
      toast.success('Equipment maintenance report deleted successfully!');
    },
    onError: (error) => {
      toast.error('Failed to delete equipment maintenance report: ' + error.message);
    },
  });
}

// Supabase Realtime Integration
export function useSupabaseRealtime() {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  
  // Simple duplicate prevention for individual toasts
  const processedEvents = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();
    
    // Generate unique channel name to avoid conflicts
    const channelId = `equipments-realtime-${Math.random().toString(36).substring(2, 11)}`;

    // Comprehensive error handler to catch transformers.js and realtime errors
    const originalConsoleError = console.error;
    
    // Also override window.onerror to catch uncaught errors
    const originalWindowError = window.onerror;
    
    // CRITICAL FIX: Patch Object.keys to prevent transformers.js crashes
    const originalObjectKeys = Object.keys;
    const safeObjectKeys = function(obj: any) {
      // If obj is null or undefined, return empty array to prevent crash
      if (obj == null) {
        return [];
      }
      // Otherwise use original Object.keys
      return originalObjectKeys(obj);
    };
    
    // Replace Object.keys globally (this fixes the transformers.js issue at the source)
    Object.keys = safeObjectKeys;
    
    const errorSuppression = (message: any, ...args: any[]) => {
      // Prevent recursive calls by checking if we're already in error suppression
      if ((errorSuppression as any)._processing) {
        originalConsoleError.call(console, message, ...args);
        return;
      }
      
      (errorSuppression as any)._processing = true;
      
      try {
        // Convert message to string for analysis
        const messageStr = String(message || '');
        const fullMessage = [messageStr, ...args.map(arg => String(arg || ''))].join(' ');
        
        // Comprehensive pattern matching for Supabase/transformers errors
        const isTransformersError = (
          messageStr.includes('transformers.js') ||
          messageStr.includes('Cannot convert undefined or null to object') ||
          messageStr.includes('TypeError: Cannot read properties of null') ||
          messageStr.includes('RealtimeChannel.js') ||
          messageStr.includes('RealtimeClient.js') ||
          messageStr.includes('convertChangeData') ||
          messageStr.includes('_getPayloadRecords') ||
          messageStr.includes('serializer.js') ||
          (messageStr.includes('Supabase') && messageStr.includes('transformers')) ||
          // Object.keys errors from transformers
          (messageStr.includes('Object.keys') && fullMessage.includes('transformers')) ||
          // Specific error patterns
          fullMessage.includes('at Object.keys (<anonymous>)') ||
          fullMessage.includes('at Module.convertChangeData (transformers.js:61:19)')
        );
        
        if (isTransformersError) {
          // Use debug level to completely hide these errors
          return;
        }
        
        // Allow all other errors to pass through normally
        originalConsoleError.call(console, message, ...args);
      } finally {
        (errorSuppression as any)._processing = false;
      }
    };
    
    // Handle uncaught TypeError from transformers.js
    const windowErrorHandler = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
      const messageStr = String(message || '');
      const sourceStr = String(source || '');
      
      // Check if this is a transformers.js related error
      const isTransformersUncaughtError = (
        messageStr.includes('Cannot convert undefined or null to object') ||
        sourceStr.includes('transformers.js') ||
        sourceStr.includes('RealtimeChannel.js') ||
        sourceStr.includes('RealtimeClient.js') ||
        (error && error.stack && (
          error.stack.includes('transformers.js') ||
          error.stack.includes('convertChangeData') ||
          error.stack.includes('_getPayloadRecords') ||
          error.stack.includes('RealtimeChannel.js') ||
          error.stack.includes('RealtimeClient.js')
        ))
      );
      
      if (isTransformersUncaughtError) {
        return true; // Prevent the error from being logged
      }
      
      // Let other errors through
      return originalWindowError ? originalWindowError(message, source, lineno, colno, error) : false;
    };
    
    console.error = errorSuppression;
    window.onerror = windowErrorHandler;

    // Equipments realtime subscription
    const equipmentsChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment'
        },
        (payload) => {
          
          try {
            // Comprehensive payload validation to prevent transformers.js errors
            if (!payload || typeof payload !== 'object') {
              return;
            }

            // Check if payload has required properties
            if (!(payload as any).eventType && !(payload as any).event) {
              return;
            }

            // Normalize eventType (some versions use 'event' instead of 'eventType')
            const eventType = (payload as any).eventType || (payload as any).event;
            if (!eventType || typeof eventType !== 'string') {
              return;
            }

            // Enhanced validation for DELETE events to prevent Object.keys() errors
            if (eventType === 'DELETE') {
              if (!payload.old || typeof payload.old !== 'object' || payload.old === null) {
                // Still try to invalidate cache as fallback
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }

              // Ensure payload.old has at least an id property
              if (!(payload as any).old?.id || typeof (payload as any).old?.id !== 'string') {
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }
            }

            // Enhanced validation for INSERT/UPDATE events
            if ((eventType === 'INSERT' || eventType === 'UPDATE')) {
              if (!payload.new || typeof payload.new !== 'object' || payload.new === null) {
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }

              // Ensure payload.new has at least an id property
              if (!(payload as any).new?.id || typeof (payload as any).new?.id !== 'string') {
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }
            }
            
            if (eventType === 'INSERT' && payload.new) {
              const equipmentData = payload.new as any;
              
              // Check if we have complete project data in the payload
              if (!equipmentData.project || !equipmentData.project.client) {
                // If project data is incomplete, just invalidate queries to refetch with complete data
                queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
                return;
              }
              
              // Transform the data to match our Equipment interface
              const transformedEquipment: Equipment = {
                uid: equipmentData.id,
                brand: equipmentData.brand,
                model: equipmentData.model,
                type: equipmentData.type,
                insuranceExpirationDate: equipmentData.insurance_expiration_date || '',
                before: equipmentData.before || undefined,
                status: equipmentData.status as "OPERATIONAL" | "NON_OPERATIONAL",
                remarks: equipmentData.remarks || undefined,
                owner: equipmentData.owner,
                image_url: equipmentData.image_url || undefined,
                inspectionDate: equipmentData.inspection_date || undefined,
                plateNumber: equipmentData.plate_number || undefined,
                originalReceiptUrl: equipmentData.original_receipt_url || undefined,
                equipmentRegistrationUrl: equipmentData.equipment_registration_url || undefined,
                thirdpartyInspectionImage: equipmentData.thirdparty_inspection_image || undefined,
                pgpcInspectionImage: equipmentData.pgpc_inspection_image || undefined,
                equipmentParts: equipmentData.equipment_parts || undefined,
                project: {
                  uid: equipmentData.project.id,
                  name: equipmentData.project.name,
                  client: {
                    uid: equipmentData.project.client.id,
                    name: equipmentData.project.client.name,
                    location: {
                      uid: equipmentData.project.client.location.id,
                      address: equipmentData.project.client.location.address,
                    },
                  },
                },
              };
              
              // Update existing equipment or add new one (handle optimistic updates)
              queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
                if (!oldData) return [transformedEquipment];
                
                // First check exact UID match
                const exactMatch = oldData.findIndex(equipment => equipment.uid === transformedEquipment.uid);
                if (exactMatch !== -1) {
                  return oldData;
                }
                
                // Then check for optimistic update to replace (recent temp_ with matching data)
                const optimisticMatch = oldData.findIndex(equipment => 
                  equipment.uid.startsWith('temp_') &&
                  equipment.brand === transformedEquipment.brand &&
                  equipment.model === transformedEquipment.model &&
                  equipment.type === transformedEquipment.type &&
                  equipment.owner === transformedEquipment.owner
                );
                
                if (optimisticMatch !== -1) {
                  const updated = [...oldData];
                  updated[optimisticMatch] = transformedEquipment;
                  return deduplicateEquipments(updated);
                }
                
                return deduplicateEquipments([transformedEquipment, ...oldData]);
              });
              
              // Event tracking for duplicate prevention
              const eventKey = `insert-${transformedEquipment.uid}`;
              if (!processedEvents.current.has(eventKey)) {
                processedEvents.current.add(eventKey);
                
                // Clean up old events (keep only last 100 to prevent memory leak)
                if (processedEvents.current.size > 100) {
                  const oldEvents = Array.from(processedEvents.current).slice(0, 50);
                  oldEvents.forEach(event => processedEvents.current.delete(event));
                }
              }
            } else if (eventType === 'UPDATE' && payload.new) {
              const equipmentData = payload.new as any;
              
              // Update equipment in cache, preserving existing project data if real-time data is incomplete
              queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
                if (!oldData) return [];
                
                const existingIndex = oldData.findIndex(equipment => equipment.uid === equipmentData.id);
                if (existingIndex === -1) {
                  return oldData;
                }
                
                const existingEquipment = oldData[existingIndex];
                
                // ALWAYS preserve existing project data - project updates are handled separately
                // Real-time equipment updates should not affect project relationships
                const projectData = existingEquipment.project;
                
                // Transform the data to match our Equipment interface
                const transformedEquipment: Equipment = {
                  ...existingEquipment, // Start with existing data
                  // Update only the fields that changed
                  uid: equipmentData.id,
                  brand: equipmentData.brand,
                  model: equipmentData.model,
                  type: equipmentData.type,
                  insuranceExpirationDate: equipmentData.insurance_expiration_date || '',
                  before: equipmentData.before || undefined,
                  status: equipmentData.status as "OPERATIONAL" | "NON_OPERATIONAL",
                  remarks: equipmentData.remarks || undefined,
                  owner: equipmentData.owner,
                  image_url: equipmentData.image_url || undefined,
                  inspectionDate: equipmentData.inspection_date || undefined,
                  plateNumber: equipmentData.plate_number || undefined,
                  originalReceiptUrl: equipmentData.original_receipt_url || undefined,
                  equipmentRegistrationUrl: equipmentData.equipment_registration_url || undefined,
                  thirdpartyInspectionImage: equipmentData.thirdparty_inspection_image || undefined,
                  pgpcInspectionImage: equipmentData.pgpc_inspection_image || undefined,
                  equipmentParts: equipmentData.equipment_parts || undefined,
                  project: projectData, // Use preserved or updated project data
                };
                
                const updated = [...oldData];
                updated[existingIndex] = transformedEquipment;
                return deduplicateEquipments(updated);
              });
              
              // Simple individual toast with duplicate prevention
              const eventKey = `update-${equipmentData.id}`;
              if (!processedEvents.current.has(eventKey)) {
                processedEvents.current.add(eventKey);
                toast.success(`Equipment "${equipmentData.brand} ${equipmentData.model}" updated successfully!`);
              }
            } else if (eventType === 'DELETE') {
              
              // We already validated payload.old above, so it's safe to use
              const deletedEquipment = payload.old as any;
              
              if (deletedEquipment?.id) {
                // Remove from cache only if equipment exists
                queryClient.setQueryData<Equipment[]>(equipmentKeys.equipments(), (oldData) => {
                  if (!oldData) return [];
                  
                  const existingEquipment = oldData.find(equipment => equipment.uid === deletedEquipment.id);
                  if (!existingEquipment) {
                    return oldData;
                  }
                  
                  const filtered = oldData.filter(equipment => equipment.uid !== deletedEquipment.id);
                  return deduplicateEquipments(filtered);
                });
                
                // Simple individual toast with duplicate prevention
                const eventKey = `delete-${deletedEquipment.id}`;
                if (!processedEvents.current.has(eventKey)) {
                  processedEvents.current.add(eventKey);
                  toast.success(`Equipment "${deletedEquipment.brand} ${deletedEquipment.model}" deleted successfully!`);
                }
              }
            }
          } catch (error) {
            // Still invalidate cache even if toast fails
            queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Maintenance reports realtime subscription
    const maintenanceChannel = supabase
      .channel('equipment-maintenance-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_equipment_reports'
        },
        (payload) => {
          try {
            // Comprehensive payload validation to prevent transformers.js errors
            if (!payload || typeof payload !== 'object') {
              return;
            }

            // Check if payload has required properties
            if (!(payload as any).eventType && !(payload as any).event) {
              return;
            }

            // Normalize eventType (some versions use 'event' instead of 'eventType')
            const eventType = (payload as any).eventType || (payload as any).event;
            if (!eventType || typeof eventType !== 'string') {
              return;
            }

            // Enhanced validation for DELETE events to prevent Object.keys() errors
            if (eventType === 'DELETE') {
              // Validate payload.old exists and has valid structure
              if (!payload.old || typeof payload.old !== 'object' || payload.old === null) {
                // Still try to invalidate cache as fallback
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }

              // Ensure payload.old has at least an id property
              if (!(payload as any).old?.id || typeof (payload as any).old?.id !== 'string') {
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }
            }

            // Enhanced validation for INSERT/UPDATE events
            if ((eventType === 'INSERT' || eventType === 'UPDATE')) {
              if (!payload.new || typeof payload.new !== 'object' || payload.new === null) {
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }

              // Ensure payload.new has at least an id property
              if (!(payload as any).new?.id || typeof (payload as any).new?.id !== 'string') {
                queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
                return;
              }
            }
            
            if (eventType === 'INSERT' && payload.new) {
              const reportData = payload.new as any;
              // Only add if report doesn't already exist in cache (prevent duplicates)
              queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
                if (!oldData) return [reportData];
                
                // Check if report already exists in cache
                const existingReport = oldData.find(report => report.id === reportData.id);
                if (existingReport) {
                  return oldData; // Don't add duplicate
                }
                
                return deduplicateMaintenanceReports([reportData, ...oldData]);
              });
              // No toast here - mutation handles user-initiated creates
              // This is for realtime updates from other users
            } else if (eventType === 'UPDATE' && payload.new) {
              const reportData = payload.new as any;
              // Update in cache only if report exists
              queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
                if (!oldData) return [];
                
                const existingIndex = oldData.findIndex(report => report.id === reportData.id);
                if (existingIndex === -1) {
                  return oldData;
                }
                
                const updated = oldData.map(report => 
                  report.id === reportData.id ? reportData : report
                );
                return deduplicateMaintenanceReports(updated);
              });
              // No toast for updates - user initiated the action
            } else if (eventType === 'DELETE') {
              
              // We already validated payload.old above, so it's safe to use
              const deletedReport = payload.old as any;
              
              if (deletedReport?.id) {
                // Remove from cache only if report exists
                queryClient.setQueryData<MaintenanceReport[]>(equipmentKeys.maintenanceReports(), (oldData) => {
                  if (!oldData) return [];
                  
                  const existingReport = oldData.find(report => report.id === deletedReport.id);
                  if (!existingReport) {
                    return oldData;
                  }
                  
                  const filtered = oldData.filter(report => report.id !== deletedReport.id);
                  return deduplicateMaintenanceReports(filtered);
                });
              }
              // No toast here - mutation handles user-initiated deletes
              // This is for realtime updates from other users
            }
          } catch (error) {
            // Still invalidate cache even if toast fails
            queryClient.invalidateQueries({ queryKey: equipmentKeys.maintenanceReports() });
          }
        }
      )
      .subscribe();

    // Projects realtime subscription (less frequent updates)
    const projectsChannel = supabase
      .channel('projects-equipments-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: equipmentKeys.projects() });
          queryClient.invalidateQueries({ queryKey: equipmentKeys.equipments() }); // Equipment data includes project info
        }
      )
      .subscribe();

    return () => {
      // Restore original error handlers and Object.keys
      console.error = originalConsoleError;
      window.onerror = originalWindowError;
      Object.keys = originalObjectKeys;
      
      // Clear processed events
      processedEvents.current.clear();
      
      equipmentsChannel.unsubscribe();
      maintenanceChannel.unsubscribe();
      projectsChannel.unsubscribe();
    };
  }, [queryClient]);

  return {
    isConnected,
  };
}

// Export hook using TanStack Query pattern
export function useExportMaintenanceReports() {
  return useMutation({
    mutationFn: async (filters?: ExportFilters) => {
      const params = new URLSearchParams();
      if (filters?.format) params.append('format', filters.format);
      if (filters?.reportType) params.append('reportType', filters.reportType);
      if (filters?.equipmentId && filters.equipmentId !== 'ALL_EQUIPMENTS') params.append('equipmentId', filters.equipmentId);
      if (filters?.status && filters.status !== 'ALL_STATUS') params.append('status', filters.status);
      if (filters?.priority && filters.priority !== 'ALL_PRIORITIES') params.append('priority', filters.priority);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);

      const response = await fetch(`/api/equipments/maintenance-reports/export?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || 'Export failed');
      }

      return response;
    },
    onSuccess: async (response, filters) => {
      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename="')[1]?.split('"')[0]
        : `equipment-maintenance-reports-${new Date().toISOString().split('T')[0]}.${filters?.format || 'pdf'}`;

      // Create blob and trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Reports exported successfully as ${filters?.format?.toUpperCase() || 'PDF'}`);
    },
    onError: (error: Error) => {
      toast.error(`Export failed: ${error.message}`);
    }
  });
}
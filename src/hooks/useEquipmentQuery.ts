"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Equipment, EquipmentResponse, MaintenanceReport } from "@/types/equipment";

// Export filters interface
export interface ExportFilters {
  format?: 'pdf' | 'excel';
  reportType?: 'summary' | 'detailed';
  equipmentId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
}

// Export maintenance report type
export type EquipmentMaintenanceReport = MaintenanceReport;

// Query Keys
export const equipmentKeys = {
  all: ['equipments'] as const,
  list: () => [...equipmentKeys.all, 'list'] as const,
  detail: (id: string) => [...equipmentKeys.all, 'detail', id] as const,
  maintenanceReports: () => ['equipment-maintenance-reports'] as const,
  equipmentMaintenanceReports: (equipmentId: string) => [...equipmentKeys.all, 'maintenance', equipmentId] as const,
  exports: () => ['equipment-exports'] as const,
};

// API Functions - Simple and direct
async function fetchEquipments(): Promise<Equipment[]> {
  const response = await fetch('/api/equipments');
  if (!response.ok) {
    throw new Error('Failed to fetch equipments');
  }
  const result: EquipmentResponse = await response.json();
  return result.data;
}

async function createEquipment(formData: FormData): Promise<Equipment> {
  const response = await fetch('/api/equipments', {
    method: 'POST',
    body: formData, // FormData for file uploads
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create equipment');
  }
  
  return response.json();
}

async function updateEquipment(formData: FormData): Promise<Equipment> {
  const response = await fetch('/api/equipments', {
    method: 'PUT',
    body: formData, // FormData for file uploads
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update equipment');
  }
  
  return response.json();
}

async function deleteEquipment(id: string): Promise<void> {
  const response = await fetch(`/api/equipments?equipmentId=${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete equipment');
  }
}

// Maintenance Report API Functions
async function fetchEquipmentMaintenanceReports(): Promise<EquipmentMaintenanceReport[]> {
  const response = await fetch('/api/equipments/maintenance-reports');
  if (!response.ok) throw new Error('Failed to fetch maintenance reports');
  const data = await response.json();
  return data.data || [];
}

async function createEquipmentMaintenanceReport(formData: FormData): Promise<EquipmentMaintenanceReport> {
  const response = await fetch('/api/equipments/maintenance-reports', {
    method: 'POST',
    body: formData, // FormData for file uploads
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create maintenance report');
  }
  
  return response.json();
}

async function updateEquipmentMaintenanceReport(formData: FormData): Promise<EquipmentMaintenanceReport> {
  const response = await fetch('/api/equipments/maintenance-reports', {
    method: 'PUT',
    body: formData, // FormData for file uploads
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update maintenance report');
  }
  
  return response.json();
}

async function deleteEquipmentMaintenanceReport(id: string): Promise<void> {
  const response = await fetch(`/api/equipments/maintenance-reports/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete maintenance report');
  }
}

// Helper function to deduplicate maintenance reports
function deduplicateEquipmentMaintenanceReports(reports: EquipmentMaintenanceReport[]): EquipmentMaintenanceReport[] {
  const seen = new Set();
  return reports.filter(report => {
    if (seen.has(report.id)) {
      console.warn('🚨 Duplicate equipment maintenance report found and removed:', report.id);
      return false;
    }
    seen.add(report.id);
    return true;
  });
}

// TanStack Query Hooks

/**
 * Fetch all equipments with realtime updates
 */
export function useEquipments() {
  return useQuery({
    queryKey: equipmentKeys.list(),
    queryFn: fetchEquipments,
    staleTime: 0, // Always fetch fresh data for realtime experience
    refetchOnWindowFocus: true,
  });
}

/**
 * Create equipment with optimistic updates
 */
export function useCreateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEquipment,
    onMutate: async (formData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equipmentKeys.list() });
      
      // Snapshot previous value
      const previousEquipments = queryClient.getQueryData<Equipment[]>(equipmentKeys.list());
      
      // Optimistically update with basic info
      const brand = formData.get('brand') as string;
      const model = formData.get('model') as string;
      const type = formData.get('type') as string;
      
      if (brand && model && type) {
        const optimisticEquipment: Equipment = {
          id: `temp_${Date.now()}`,
          brand,
          model,
          type,
          insurance_expiration_date: null,
          registration_expiry: null,
          before: null,
          status: 'OPERATIONAL',
          remarks: null,
          owner: formData.get('owner') as string || '',
          image_url: null,
          inspection_date: null,
          project_id: formData.get('projectId') as string || '',
          plate_number: null,
          original_receipt_url: null,
          equipment_registration_url: null,
          thirdparty_inspection_image: null,
          pgpc_inspection_image: null,
          equipment_parts: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: null,
          project: {
            id: formData.get('projectId') as string || '',
            name: 'Loading...',
            client: {
              id: '',
              name: 'Loading...',
              location: {
                id: '',
                address: 'Loading...'
              }
            }
          },
          maintenance_reports: []
        };
        
        queryClient.setQueryData<Equipment[]>(
          equipmentKeys.list(),
          (old) => old ? [optimisticEquipment, ...old] : [optimisticEquipment]
        );
      }
      
      return { previousEquipments };
    },
    onError: (error, formData, context) => {
      // Rollback on error
      if (context?.previousEquipments) {
        queryClient.setQueryData(equipmentKeys.list(), context.previousEquipments);
      }
      toast.error(`Failed to create equipment: ${error.message}`);
    },
    onSuccess: (newEquipment) => {
      toast.success(`Equipment "${newEquipment.brand} ${newEquipment.model}" created successfully!`);
      // Realtime will handle the cache update
    },
  });
}

/**
 * Update equipment with optimistic updates
 */
export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEquipment,
    onMutate: async (formData) => {
      const equipmentId = formData.get('equipmentId') as string;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equipmentKeys.list() });
      
      // Snapshot previous value
      const previousEquipments = queryClient.getQueryData<Equipment[]>(equipmentKeys.list());
      
      // Optimistically update specific equipment with image handling
      if (equipmentId) {
        queryClient.setQueryData<Equipment[]>(
          equipmentKeys.list(),
          (old) => {
            if (!old) return old;
            return old.map((equipment) => {
              if (equipment.id === equipmentId) {
                const updatedEquipment = {
                  ...equipment,
                  brand: (formData.get('brand') as string) || equipment.brand,
                  model: (formData.get('model') as string) || equipment.model,
                  type: (formData.get('type') as string) || equipment.type,
                  owner: (formData.get('owner') as string) || equipment.owner,
                  status: (formData.get('status') as 'OPERATIONAL' | 'NON_OPERATIONAL') || equipment.status,
                  updated_at: new Date().toISOString(),
                };

                // SIMPLIFIED: Don't handle image changes optimistically to prevent flickering
                // Let the server response and realtime handle image updates for consistency
                // This prevents race conditions between optimistic updates and server responses

                return updatedEquipment;
              }
              return equipment;
            });
          }
        );
      }
      
      return { previousEquipments };
    },
    onError: (error, formData, context) => {
      // Rollback on error
      if (context?.previousEquipments) {
        queryClient.setQueryData(equipmentKeys.list(), context.previousEquipments);
      }
      toast.error(`Failed to update equipment: ${error.message}`);
    },
    onSuccess: (updatedEquipment) => {
      console.log('✅ Server response received, updating cache immediately');
      console.log('📄 Updated equipment URLs:', {
        image: updatedEquipment.image_url,
        receipt: updatedEquipment.original_receipt_url,
        registration: updatedEquipment.equipment_registration_url
      });
      console.log('🔍 Full server response equipment:', updatedEquipment);
      
      // Immediately update cache with the actual server response
      queryClient.setQueryData<Equipment[]>(
        equipmentKeys.list(),
        (old) => {
          if (!old) return [updatedEquipment];
          return old.map((equipment) => 
            equipment.id === updatedEquipment.id ? updatedEquipment : equipment
          );
        }
      );
      
      // Don't force immediate refetch - trust the server response data
      
      toast.success(`Equipment "${updatedEquipment.brand} ${updatedEquipment.model}" updated successfully!`);
    },
  });
}

/**
 * Delete equipment with optimistic updates
 */
export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEquipment,
    onMutate: async (equipmentId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equipmentKeys.list() });
      
      // Snapshot previous value
      const previousEquipments = queryClient.getQueryData<Equipment[]>(equipmentKeys.list());
      
      // Optimistically remove equipment
      queryClient.setQueryData<Equipment[]>(
        equipmentKeys.list(),
        (old) => old ? old.filter((equipment) => equipment.id !== equipmentId) : []
      );
      
      return { previousEquipments };
    },
    onError: (error, equipmentId, context) => {
      // Rollback on error
      if (context?.previousEquipments) {
        queryClient.setQueryData(equipmentKeys.list(), context.previousEquipments);
      }
      toast.error(`Failed to delete equipment: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Equipment deleted successfully!');
      // Realtime will handle the cache update
    },
  });
}

// Maintenance Report Hooks

/**
 * Fetch all equipment maintenance reports
 */
export function useEquipmentMaintenanceReports() {
  return useQuery({
    queryKey: equipmentKeys.maintenanceReports(),
    queryFn: fetchEquipmentMaintenanceReports,
    select: (data) => deduplicateEquipmentMaintenanceReports(data),
    staleTime: 1 * 60 * 1000, // 1 minute - maintenance reports change frequently
    gcTime: 3 * 60 * 1000,
  });
}

/**
 * Create equipment maintenance report with optimistic updates
 */
export function useCreateEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createEquipmentMaintenanceReport,
    onMutate: async (formData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equipmentKeys.maintenanceReports() });
      
      // Snapshot previous value
      const previousReports = queryClient.getQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.maintenanceReports());
      
      return { previousReports };
    },
    onError: (error, formData, context) => {
      // Rollback on error
      if (context?.previousReports) {
        queryClient.setQueryData(equipmentKeys.maintenanceReports(), context.previousReports);
      }
      toast.error(`Failed to create maintenance report: ${error.message}`);
    },
    onSuccess: (newReport) => {
      // Add to cache optimistically
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(
        equipmentKeys.maintenanceReports(),
        (oldData) => {
          if (!oldData) return [newReport];
          
          // Check if report already exists to prevent duplicates
          const existingReport = oldData.find(report => report.id === newReport.id);
          if (existingReport) {
            console.log('🔄 Maintenance report already exists in cache during create, skipping duplicate');
            return oldData;
          }
          
          console.log('✅ Adding new maintenance report to cache:', newReport.id);
          return deduplicateEquipmentMaintenanceReports([newReport, ...oldData]);
        }
      );
      toast.success('Maintenance report created successfully!');
    },
  });
}

/**
 * Update equipment maintenance report with optimistic updates
 */
export function useUpdateEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateEquipmentMaintenanceReport,
    onMutate: async (formData) => {
      const reportId = formData.get('reportId') as string;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equipmentKeys.maintenanceReports() });
      
      // Snapshot previous value
      const previousReports = queryClient.getQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.maintenanceReports());
      
      return { previousReports };
    },
    onError: (error, formData, context) => {
      // Rollback on error
      if (context?.previousReports) {
        queryClient.setQueryData(equipmentKeys.maintenanceReports(), context.previousReports);
      }
      toast.error(`Failed to update maintenance report: ${error.message}`);
    },
    onSuccess: (updatedReport) => {
      // Update in cache
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(
        equipmentKeys.maintenanceReports(),
        (oldData) => {
          if (!oldData) return [updatedReport];
          const updated = oldData.map((report) => 
            report.id === updatedReport.id ? updatedReport : report
          );
          return deduplicateEquipmentMaintenanceReports(updated);
        }
      );
      toast.success('Maintenance report updated successfully!');
    },
  });
}

/**
 * Delete equipment maintenance report with optimistic updates
 */
export function useDeleteEquipmentMaintenanceReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: deleteEquipmentMaintenanceReport,
    onMutate: async (reportId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: equipmentKeys.maintenanceReports() });
      
      // Snapshot previous value
      const previousReports = queryClient.getQueryData<EquipmentMaintenanceReport[]>(equipmentKeys.maintenanceReports());
      
      // Optimistically remove report
      queryClient.setQueryData<EquipmentMaintenanceReport[]>(
        equipmentKeys.maintenanceReports(),
        (old) => old ? old.filter((report) => report.id !== reportId) : []
      );
      
      return { previousReports };
    },
    onError: (error, reportId, context) => {
      // Rollback on error
      if (context?.previousReports) {
        queryClient.setQueryData(equipmentKeys.maintenanceReports(), context.previousReports);
      }
      toast.error(`Failed to delete maintenance report: ${error.message}`);
    },
    onSuccess: () => {
      toast.success('Maintenance report deleted successfully!');
      // Realtime will handle the cache update
    },
  });
}

// Export API Function
async function exportEquipmentMaintenanceReports(filters?: ExportFilters): Promise<Response> {
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
}

/**
 * Export equipment maintenance reports hook
 */
export function useExportEquipmentMaintenanceReports() {
  return useMutation({
    mutationFn: exportEquipmentMaintenanceReports,
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
      
      toast.success('Report exported successfully!');
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    },
  });
}
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Equipment, EquipmentResponse } from "@/types/equipment";

// Query Keys
export const equipmentKeys = {
  all: ['equipments'] as const,
  list: () => [...equipmentKeys.all, 'list'] as const,
  detail: (id: string) => [...equipmentKeys.all, 'detail', id] as const,
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
      
      // Optimistically update specific equipment
      if (equipmentId) {
        queryClient.setQueryData<Equipment[]>(
          equipmentKeys.list(),
          (old) => {
            if (!old) return old;
            return old.map((equipment) => {
              if (equipment.id === equipmentId) {
                return {
                  ...equipment,
                  brand: (formData.get('brand') as string) || equipment.brand,
                  model: (formData.get('model') as string) || equipment.model,
                  type: (formData.get('type') as string) || equipment.type,
                  owner: (formData.get('owner') as string) || equipment.owner,
                  status: (formData.get('status') as 'OPERATIONAL' | 'NON_OPERATIONAL') || equipment.status,
                  updated_at: new Date().toISOString(),
                };
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
      toast.success(`Equipment "${updatedEquipment.brand} ${updatedEquipment.model}" updated successfully!`);
      // Realtime will handle the cache update
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
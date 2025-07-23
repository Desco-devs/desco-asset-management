import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useCallback } from 'react';
import type { AssetsPageData, EquipmentWithRelations, VehicleWithRelations } from '@/types/assets';

// Query keys factory
export const assetsKeys = {
  all: ['assets'] as const,
  equipment: () => [...assetsKeys.all, 'equipment'] as const,
  equipmentList: (filters: Record<string, string>, page: number) =>
    [...assetsKeys.equipment(), 'list', { filters, page }] as const,
  vehicles: () => [...assetsKeys.all, 'vehicles'] as const,
  vehiclesList: (filters: Record<string, string>, page: number) =>
    [...assetsKeys.vehicles(), 'list', { filters, page }] as const,
  metadata: () => [...assetsKeys.all, 'metadata'] as const,
};

// API functions
async function fetchAssetsData(): Promise<AssetsPageData> {
  const response = await fetch('/api/assets');
  if (!response.ok) {
    throw new Error('Failed to fetch assets data');
  }
  return response.json();
}

async function fetchEquipmentList(
  filters: Record<string, string>,
  page: number
): Promise<{
  equipment: EquipmentWithRelations[];
  totalPages: number;
  totalCount: number;
}> {
  const params = new URLSearchParams({
    ...filters,
    page: page.toString(),
    limit: '12',
  });

  const response = await fetch(`/api/assets/equipment?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch equipment list');
  }
  return response.json();
}

async function fetchVehiclesList(
  filters: Record<string, string>,
  page: number
): Promise<{
  vehicles: VehicleWithRelations[];
  totalPages: number;
  totalCount: number;
}> {
  const params = new URLSearchParams({
    ...filters,
    page: page.toString(),
    limit: '12',
  });

  const response = await fetch(`/api/assets/vehicles?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch vehicles list');
  }
  return response.json();
}

// Custom hooks
export function useAssetsData() {
  return useQuery({
    queryKey: assetsKeys.metadata(),
    queryFn: fetchAssetsData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useEquipmentList(filters: Record<string, string>, page: number) {
  return useQuery({
    queryKey: assetsKeys.equipmentList(filters, page),
    queryFn: () => fetchEquipmentList(filters, page),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: 'keepPreviousData' as any, // For smooth pagination
  });
}

export function useVehiclesList(filters: Record<string, string>, page: number) {
  return useQuery({
    queryKey: assetsKeys.vehiclesList(filters, page),
    queryFn: () => fetchVehiclesList(filters, page),
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
    placeholderData: 'keepPreviousData' as any, // For smooth pagination
  });
}

// Real-time cache management hooks
export function useAssetsCache() {
  const queryClient = useQueryClient();

  const invalidateEquipment = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: assetsKeys.equipment(),
    });
  }, [queryClient]);

  const invalidateVehicles = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: assetsKeys.vehicles(),
    });
  }, [queryClient]);

  const invalidateMetadata = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: assetsKeys.metadata(),
    });
  }, [queryClient]);

  const updateEquipmentItem = useCallback(
    (equipmentId: string, updater: (old: EquipmentWithRelations) => EquipmentWithRelations) => {
      // Update all equipment list queries
      queryClient.setQueriesData(
        {
          queryKey: assetsKeys.equipment(),
          type: 'active',
        },
        (oldData: any) => {
          if (!oldData?.equipment) return oldData;
          
          return {
            ...oldData,
            equipment: oldData.equipment.map((item: EquipmentWithRelations) =>
              item.id === equipmentId ? updater(item) : item
            ),
          };
        }
      );
    },
    [queryClient]
  );

  const updateVehicleItem = useCallback(
    (vehicleId: string, updater: (old: VehicleWithRelations) => VehicleWithRelations) => {
      // Update all vehicle list queries
      queryClient.setQueriesData(
        {
          queryKey: assetsKeys.vehicles(),
          type: 'active',
        },
        (oldData: any) => {
          if (!oldData?.vehicles) return oldData;
          
          return {
            ...oldData,
            vehicles: oldData.vehicles.map((item: VehicleWithRelations) =>
              item.id === vehicleId ? updater(item) : item
            ),
          };
        }
      );
    },
    [queryClient]
  );

  const addEquipmentItem = useCallback(
    (newEquipment: EquipmentWithRelations) => {
      // Add to first page of current filter set if it exists
      queryClient.setQueriesData(
        {
          queryKey: assetsKeys.equipment(),
          type: 'active',
        },
        (oldData: any) => {
          if (!oldData?.equipment || oldData.page !== 1) return oldData;
          
          return {
            ...oldData,
            equipment: [newEquipment, ...oldData.equipment.slice(0, 11)], // Keep max 12 items
            totalCount: oldData.totalCount + 1,
          };
        }
      );
    },
    [queryClient]
  );

  const addVehicleItem = useCallback(
    (newVehicle: VehicleWithRelations) => {
      // Add to first page of current filter set if it exists
      queryClient.setQueriesData(
        {
          queryKey: assetsKeys.vehicles(),
          type: 'active',
        },
        (oldData: any) => {
          if (!oldData?.vehicles || oldData.page !== 1) return oldData;
          
          return {
            ...oldData,
            vehicles: [newVehicle, ...oldData.vehicles.slice(0, 11)], // Keep max 12 items
            totalCount: oldData.totalCount + 1,
          };
        }
      );
    },
    [queryClient]
  );

  const removeEquipmentItem = useCallback(
    (equipmentId: string) => {
      // Remove from all equipment list queries
      queryClient.setQueriesData(
        {
          queryKey: assetsKeys.equipment(),
          type: 'active',
        },
        (oldData: any) => {
          if (!oldData?.equipment) return oldData;
          
          return {
            ...oldData,
            equipment: oldData.equipment.filter((item: EquipmentWithRelations) => item.id !== equipmentId),
            totalCount: Math.max(0, oldData.totalCount - 1),
          };
        }
      );
    },
    [queryClient]
  );

  const removeVehicleItem = useCallback(
    (vehicleId: string) => {
      // Remove from all vehicle list queries
      queryClient.setQueriesData(
        {
          queryKey: assetsKeys.vehicles(),
          type: 'active',
        },
        (oldData: any) => {
          if (!oldData?.vehicles) return oldData;
          
          return {
            ...oldData,
            vehicles: oldData.vehicles.filter((item: VehicleWithRelations) => item.id !== vehicleId),
            totalCount: Math.max(0, oldData.totalCount - 1),
          };
        }
      );
    },
    [queryClient]
  );

  return {
    invalidateEquipment,
    invalidateVehicles,
    invalidateMetadata,
    updateEquipmentItem,
    updateVehicleItem,
    addEquipmentItem,
    addVehicleItem,
    removeEquipmentItem,
    removeVehicleItem,
  };
}
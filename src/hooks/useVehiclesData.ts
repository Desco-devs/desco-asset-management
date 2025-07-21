"use client";

import { useQuery } from "@tanstack/react-query";

export interface VehicleData {
  id: string;
  name: string;
  type: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
      location: {
        id: string;
        name: string;
      };
    };
  };
  user?: {
    id: string;
    username: string;
    full_name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface VehiclesResponse {
  vehicles: VehicleData[];
  projects: any[];
  clients: any[];
  locations: any[];
  users: any[];
  maintenanceReports: any[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

async function fetchVehiclesData(page: number = 1, limit: number = 12): Promise<VehiclesResponse> {
  const response = await fetch(`/api/vehicles/paginated?page=${page}&limit=${limit}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch vehicles data');
  }

  const result = await response.json();
  
  // Transform API response to match our interface
  const transformedVehicles = (result.data || []).map((vehicle: any) => ({
    id: vehicle.uid,
    brand: vehicle.brand,
    model: vehicle.model,
    type: vehicle.type,
    plate_number: vehicle.plateNumber,
    owner: vehicle.owner,
    status: vehicle.status,
    inspection_date: vehicle.inspectionDate,
    expiry_date: vehicle.expiryDate,
    before: vehicle.before,
    remarks: vehicle.remarks,
    created_at: new Date().toISOString(), // fallback
    project: {
      id: vehicle.project?.uid,
      name: vehicle.project?.name,
      client: {
        id: vehicle.project?.client?.uid,
        name: vehicle.project?.client?.name,
        location: {
          id: vehicle.project?.client?.location?.uid,
          address: vehicle.project?.client?.location?.address,
        },
      },
    },
    user: null, // Not included in this API response
  }));

  return {
    vehicles: transformedVehicles,
    projects: [],
    clients: [],
    locations: [],
    users: [],
    maintenanceReports: [],
    totalCount: result.pagination?.totalCount || 0,
    currentPage: result.pagination?.page || 1,
    totalPages: result.pagination?.totalPages || 1,
  };
}

export function useVehiclesData(page: number = 1, limit: number = 12) {
  return useQuery({
    queryKey: ['vehicles-data', page, limit],
    queryFn: () => fetchVehiclesData(page, limit),
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

// Individual hook for just vehicles list (lighter)
export function useVehiclesList(page: number = 1, limit: number = 12) {
  const { data, ...rest } = useVehiclesData(page, limit);
  return {
    vehicles: data?.vehicles || [],
    totalCount: data?.totalCount || 0,
    currentPage: data?.currentPage || 1,
    totalPages: data?.totalPages || 1,
    ...rest
  };
}

// Hook for reference data (cached separately)
export function useVehiclesReferenceData() {
  return useQuery({
    queryKey: ['vehicles-reference-data'],
    queryFn: async () => {
      const response = await fetch('/api/vehicles/reference-data');
      if (!response.ok) throw new Error('Failed to fetch reference data');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - reference data changes less frequently
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
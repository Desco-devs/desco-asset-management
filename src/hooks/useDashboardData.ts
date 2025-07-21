"use client";

import { useQuery } from "@tanstack/react-query";

export interface DashboardData {
  equipmentCounts: {
    OPERATIONAL: number;
    NON_OPERATIONAL: number;
  };
  vehicleCounts: {
    OPERATIONAL: number;
    NON_OPERATIONAL: number;
  };
  overviewStats: {
    locations: number;
    clients: number;
    projects: number;
    vehicles: { total: number; operational: number; nonOperational: number };
    equipment: { total: number; operational: number; nonOperational: number };
    maintenanceReports: { total: number; pending: number; inProgress: number };
    growth: {
      newClientsThisWeek: number;
      newProjectsThisWeek: number;
      newEquipmentThisWeek: number;
      newVehiclesThisWeek: number;
    };
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    status?: string;
  }>;
  detailedData: {
    locations: any[];
    clients: any[];
    projects: any[];
    equipment: any[];
    vehicles: any[];
    maintenanceReports: any[];
  };
}

async function fetchDashboardData(): Promise<DashboardData> {
  const response = await fetch('/api/dashboard/data', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard data');
  }

  return response.json();
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: fetchDashboardData,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

export function useEquipmentCounts() {
  const { data } = useDashboardData();
  return data?.equipmentCounts || { OPERATIONAL: 0, NON_OPERATIONAL: 0 };
}

export function useVehicleCounts() {
  const { data } = useDashboardData();
  return data?.vehicleCounts || { OPERATIONAL: 0, NON_OPERATIONAL: 0 };
}

export function useOverviewStats() {
  const { data } = useDashboardData();
  return data?.overviewStats || {
    locations: 0,
    clients: 0,
    projects: 0,
    vehicles: { total: 0, operational: 0, nonOperational: 0 },
    equipment: { total: 0, operational: 0, nonOperational: 0 },
    maintenanceReports: { total: 0, pending: 0, inProgress: 0 },
    growth: {
      newClientsThisWeek: 0,
      newProjectsThisWeek: 0,
      newEquipmentThisWeek: 0,
      newVehiclesThisWeek: 0
    }
  };
}

export function useRecentActivity() {
  const { data } = useDashboardData();
  return data?.recentActivity || [];
}

export function useDetailedData() {
  const { data } = useDashboardData();
  return data?.detailedData || {
    locations: [],
    clients: [],
    projects: [],
    equipment: [],
    vehicles: [],
    maintenanceReports: [],
  };
}
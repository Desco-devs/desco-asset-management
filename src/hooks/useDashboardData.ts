"use client";

import { useDashboardDataSync } from "@/hooks/api/use-dashboard-realtime";
import type { ActivityItem } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

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
  recentActivity: ActivityItem[];
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
  const response = await fetch("/api/dashboard/data", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard data");
  }

  return response.json();
}

export function useDashboardData() {
  const syncData = useDashboardDataSync();

  const query = useQuery({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      try {
        console.log("🔄 Fetching dashboard data...");
        const data = await fetchDashboardData();
        console.log("✅ Dashboard data fetched successfully:", data);
        return data;
      } catch (error) {
        console.error("❌ Dashboard data fetch failed:", error);
        // Return empty data structure instead of throwing
        return {
          equipmentCounts: { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
          vehicleCounts: { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
          locationsData: [],
          clientsData: [],
          projectsData: [],
          equipmentListData: [],
          vehiclesListData: [],
          maintenanceReportsData: [],
          locationsTotalCount: 0,
          clientsTotalCount: 0,
          projectsTotalCount: 0,
          maintenanceReportsTotalCount: 0,
          maintenanceReportsStatusCounts: [],
          overviewStats: {
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
              newVehiclesThisWeek: 0,
            },
          },
          recentActivity: [],
          detailedData: {
            locations: [],
            clients: [],
            projects: [],
            equipment: [],
            vehicles: [],
            maintenanceReports: [],
          },
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Disable refetch on focus - rely on real-time
    refetchInterval: false, // Disable polling - use only real-time
    retry: 1, // Reduce retries to fail faster
    retryDelay: 1000, // 1 second retry delay
  });

  // Sync data with Zustand store whenever query data changes
  // Use a ref to store the previous data to avoid infinite loops
  const prevDataRef = useRef(query.data);

  useEffect(() => {
    if (query.data && query.data !== prevDataRef.current) {
      prevDataRef.current = query.data;
      syncData(query.data);
    }
  }, [query.data]); // Remove syncData from dependencies to prevent circular dependency

  return query;
}

// Legacy hooks for backward compatibility (now use Zustand store directly)
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
  return (
    data?.overviewStats || {
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
        newVehiclesThisWeek: 0,
      },
    }
  );
}

export function useRecentActivity() {
  const { data } = useDashboardData();
  return data?.recentActivity || [];
}

export function useDetailedData() {
  const { data } = useDashboardData();
  return (
    data?.detailedData || {
      locations: [],
      clients: [],
      projects: [],
      equipment: [],
      vehicles: [],
      maintenanceReports: [],
    }
  );
}

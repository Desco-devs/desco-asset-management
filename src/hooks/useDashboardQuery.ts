import { useQuery } from '@tanstack/react-query';
import type { ActivityItem } from '@/types/dashboard';

/**
 * Dashboard Query Hook - Following REALTIME_PATTERN.md
 * 
 * Single Source of Truth: TanStack Query manages all data
 * Simple patterns, no overengineering
 */

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

export interface MaintenanceAlert {
  id: string;
  type: 'equipment' | 'vehicle';
  name: string;
  status: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  alertType?: 'active_maintenance' | 'non_operational' | 'overdue' | 'insurance_expiry';
}

// Fetcher functions - clean and simple
async function fetchDashboardData(timeRange: string): Promise<DashboardData> {
  const response = await fetch(`/api/dashboard/data?timeRange=${timeRange}`);
  
  if (!response.ok) {
    throw new Error(`Dashboard API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

async function fetchMaintenanceAlerts(): Promise<MaintenanceAlert[]> {
  const response = await fetch('/api/dashboard/maintenance-alerts');
  
  if (!response.ok) {
    throw new Error(`Maintenance Alerts API Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

// Main dashboard data query
export function useDashboardData(timeRange: string) {
  return useQuery({
    queryKey: ['dashboard-data', timeRange],
    queryFn: () => fetchDashboardData(timeRange),
    staleTime: 0, // Always fresh for realtime
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

// Maintenance alerts query
export function useMaintenanceAlerts() {
  return useQuery({
    queryKey: ['maintenance-alerts'],
    queryFn: fetchMaintenanceAlerts,
    staleTime: 30 * 1000, // Fresh for 30 seconds
    gcTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
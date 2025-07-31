"use client";

/**
 * Hook for integrating server actions with real-time cache invalidation
 * 
 * This hook provides utilities to ensure that after server actions complete,
 * the client-side TanStack Query cache is properly invalidated for immediate UI updates.
 */

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { vehicleKeys } from "./useVehiclesQuery";

export function useServerActionCache() {
  const queryClient = useQueryClient();

  /**
   * Invalidate vehicle-related queries after server actions
   * Call this after vehicle creation, update, or deletion server actions
   */
  const invalidateVehicles = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: vehicleKeys.vehicles() });
    queryClient.invalidateQueries({ queryKey: vehicleKeys.projects() });
    queryClient.invalidateQueries({ queryKey: vehicleKeys.maintenanceReports() });
    
    // Invalidate dashboard data to update statistics
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    
    console.log('✅ Vehicle cache invalidated after server action');
  }, [queryClient]);

  /**
   * Invalidate equipment-related queries after server actions
   */
  const invalidateEquipments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['equipments'] });
    queryClient.invalidateQueries({ queryKey: ['equipment-projects'] });
    queryClient.invalidateQueries({ queryKey: ['equipment-maintenance-reports'] });
    
    // Invalidate dashboard data
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    
    console.log('✅ Equipment cache invalidated after server action');
  }, [queryClient]);

  /**
   * Invalidate project-related queries after server actions
   */
  const invalidateProjects = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['projects'] });
    queryClient.invalidateQueries({ queryKey: vehicleKeys.projects() });
    queryClient.invalidateQueries({ queryKey: ['equipment-projects'] });
    queryClient.invalidateQueries({ queryKey: ['clients'] });
    queryClient.invalidateQueries({ queryKey: ['locations'] });
    
    // Invalidate dashboard data
    queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    
    console.log('✅ Project cache invalidated after server action');
  }, [queryClient]);

  /**
   * Force refresh all queries for critical updates
   * Use sparingly as this can be performance intensive
   */
  const refreshAll = useCallback(() => {
    queryClient.invalidateQueries();
    console.log('🔄 All queries refreshed');
  }, [queryClient]);

  return {
    invalidateVehicles,
    invalidateEquipments,
    invalidateProjects,
    refreshAll,
  };
}
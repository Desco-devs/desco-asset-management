"use client";

/**
 * Real-time Cache Integration Utilities
 * 
 * Provides utilities to bridge server actions with client-side real-time cache invalidation.
 * This ensures that after server actions complete, the client-side TanStack Query cache
 * is properly updated for immediate UI updates.
 */

import { QueryClient } from "@tanstack/react-query";

// Global query client instance for server action integration
let globalQueryClient: QueryClient | null = null;

/**
 * Set the global query client instance
 * This should be called once during app initialization
 */
export function setGlobalQueryClient(queryClient: QueryClient) {
  globalQueryClient = queryClient;
}

/**
 * Get the global query client instance
 */
export function getGlobalQueryClient(): QueryClient | null {
  return globalQueryClient;
}

/**
 * Invalidate vehicle-related queries after server actions
 * This ensures real-time updates are immediately visible
 */
export function invalidateVehicleQueries() {
  if (!globalQueryClient) {
    console.warn('Global query client not set. Real-time cache invalidation skipped.');
    return;
  }

  // Invalidate all vehicle-related queries
  globalQueryClient.invalidateQueries({ queryKey: ['vehicles'] });
  globalQueryClient.invalidateQueries({ queryKey: ['vehicle-projects'] });
  globalQueryClient.invalidateQueries({ queryKey: ['vehicle-maintenance-reports'] });
  
  // Invalidate dashboard data to update statistics
  globalQueryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
  globalQueryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  
  console.log('✅ Vehicle cache invalidated after server action');
}

/**
 * Invalidate equipment-related queries after server actions
 */
export function invalidateEquipmentQueries() {
  if (!globalQueryClient) {
    console.warn('Global query client not set. Real-time cache invalidation skipped.');
    return;
  }

  globalQueryClient.invalidateQueries({ queryKey: ['equipments'] });
  globalQueryClient.invalidateQueries({ queryKey: ['equipment-projects'] });
  globalQueryClient.invalidateQueries({ queryKey: ['equipment-maintenance-reports'] });
  
  // Invalidate dashboard data
  globalQueryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
  globalQueryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  
  console.log('✅ Equipment cache invalidated after server action');
}

/**
 * Invalidate project-related queries after server actions
 */
export function invalidateProjectQueries() {
  if (!globalQueryClient) {
    console.warn('Global query client not set. Real-time cache invalidation skipped.');
    return;
  }

  globalQueryClient.invalidateQueries({ queryKey: ['projects'] });
  globalQueryClient.invalidateQueries({ queryKey: ['vehicle-projects'] });
  globalQueryClient.invalidateQueries({ queryKey: ['equipment-projects'] });
  globalQueryClient.invalidateQueries({ queryKey: ['clients'] });
  globalQueryClient.invalidateQueries({ queryKey: ['locations'] });
  
  // Invalidate dashboard data
  globalQueryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
  globalQueryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  
  console.log('✅ Project cache invalidated after server action');
}

/**
 * Force refresh all queries for critical updates
 * Use sparingly as this can be performance intensive
 */
export function refreshAllQueries() {
  if (!globalQueryClient) {
    console.warn('Global query client not set. Query refresh skipped.');
    return;
  }

  globalQueryClient.invalidateQueries();
  console.log('🔄 All queries refreshed');
}
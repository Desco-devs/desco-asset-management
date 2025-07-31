/**
 * DEPRECATED: This file is replaced by useDashboardQuery.ts
 * 
 * Following REALTIME_PATTERN.md clean architecture:
 * - Use useDashboardQuery.ts for data fetching
 * - Use useDashboardRealtime.ts for realtime updates  
 * - Use dashboardUIStore.ts for UI state
 * 
 * This approach eliminates:
 * ❌ Error suppression (lines 67-108 in old version)
 * ❌ Manual data synchronization
 * ❌ Mixed UI/server state concerns
 * ❌ Complex error handling patterns
 * 
 * @deprecated Use useDashboardQuery.ts instead
 */

export { useDashboardData, useMaintenanceAlerts } from './useDashboardQuery';

// Re-export types for backward compatibility
export type { DashboardData, MaintenanceAlert } from './useDashboardQuery';
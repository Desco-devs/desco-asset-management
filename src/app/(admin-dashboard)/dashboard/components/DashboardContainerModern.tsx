"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Suspense } from "react";

// New clean architecture imports
import { useDashboardData, useMaintenanceAlerts } from "@/hooks/useDashboardQuery";
import { useRealtimeSystem } from "@/hooks/useRealtimeSystem";
import { useSelectedTimeRange, useDashboardUIStore } from "@/stores/dashboardUIStore";

// Import components
import { RecentActivityFeed } from "./activity/RecentActivityFeed";
import { MaintenanceAlertsPanel } from "./alerts/MaintenanceAlertsPanel";
import { ChartsSection } from "./charts/ChartsSection";
import { OverviewStatsGrid } from "./stats/OverviewStatsGrid";

/**
 * Modern Dashboard Container - Following REALTIME_PATTERN.md
 * 
 * ✅ Clean separation of concerns:
 * - useDashboardQuery.ts: All data fetching (TanStack Query)
 * - useRealtimeSystem.ts: Consolidated realtime invalidation for all tables
 * - dashboardUIStore.ts: UI state only
 * 
 * ✅ No error suppression - errors bubble up naturally
 * ✅ Simple patterns everyone understands
 * ✅ Optimistic updates for instant feedback
 * ✅ Single realtime hook handles entire system
 */
export default function DashboardContainerModern() {
  // UI state from Zustand store (UI concerns only)
  const selectedTimeRange = useSelectedTimeRange();
  const resetFilters = useDashboardUIStore((state) => state.resetFilters);
  
  // Data layer - TanStack Query handles all server state
  const { 
    data: dashboardData, 
    isLoading, 
    error, 
    refetch 
  } = useDashboardData(selectedTimeRange);
  
  const { 
    data: maintenanceAlerts = [], 
    isLoading: alertsLoading 
  } = useMaintenanceAlerts();
  
  // Activate consolidated realtime system - handles all tables!
  useRealtimeSystem();

  // Error handling - no suppression, let errors bubble up with proper UI
  if (error) {
    return (
      <div className="min-h-screen py-6 px-6">
        <Alert variant="destructive" className="max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Failed to load dashboard data: {error.message}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return <DashboardSkeleton />;
  }

  // Main render with clean data flow
  return (
    <div className="min-h-screen py-6 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of your assets and operations
          </p>
        </div>
        <Button
          variant="outline"
          onClick={resetFilters}
          className="ml-4"
        >
          Reset Filters
        </Button>
      </div>

      {/* Overview Stats */}
      <Suspense fallback={<div>Loading stats...</div>}>
        <OverviewStatsGrid />
      </Suspense>

      {/* Charts Section */}
      <Suspense fallback={<div>Loading charts...</div>}>
        <ChartsSection />
      </Suspense>

      {/* Activity and Maintenance Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div>Loading activity...</div>}>
          <RecentActivityFeed />
        </Suspense>
        
        <Suspense fallback={<div>Loading alerts...</div>}>
          <MaintenanceAlertsPanel />
        </Suspense>
      </div>
    </div>
  );
}

// Simple skeleton component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen py-6 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-80" />
        </div>
      </div>

      {/* Overview Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px]" />
        ))}
      </div>

      {/* Activity & Alerts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[400px]" />
        ))}
      </div>
    </div>
  );
}
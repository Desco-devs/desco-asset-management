"use client";

import React, { Suspense } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardRealtimeContext } from "@/context/DashboardRealtimeContext";
import { useManualDashboardRefresh } from "@/hooks/api/use-dashboard-polling";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";

// Import new components
import { OverviewStatsGrid } from "./stats/OverviewStatsGrid";
import { ChartsSection } from "./charts/ChartsSection";
import { MaintenanceAlertsPanel } from "./alerts/MaintenanceAlertsPanel";
import { RecentActivityFeed } from "./activity/RecentActivityFeed";

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
      <div className="space-y-4">
        <Skeleton className="h-7 w-24" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Charts and Activities Skeleton */}
      <div className="space-y-6">
        {/* Charts Section Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        {/* Activity & Alerts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return (
    <div className="min-h-screen py-6 px-6 flex items-center justify-center">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="mb-4">
            <strong>Failed to load dashboard data</strong>
            <br />
            {error.message}
          </AlertDescription>
        </Alert>
        <div className="flex gap-2 mt-4">
          <Button onClick={retry} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button onClick={() => window.location.reload()} className="flex-1">
            Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const { isLoading, error, refetch, data, isFetching } = useDashboardData();
  const manualRefresh = useManualDashboardRefresh();

  // Use global real-time context (no local setup needed)
  const { isConnected } = useDashboardRealtimeContext();

  console.log("🎯 Dashboard render state:", {
    isLoading,
    error: !!error,
    hasData: !!data,
    isFetching,
  });

  // Show error immediately if there's an error
  if (error && !data) {
    console.log("❌ Dashboard showing error boundary");
    return <DashboardErrorBoundary error={error as Error} retry={refetch} />;
  }

  // Show skeleton only if we're loading AND have no data
  if (isLoading && !data) {
    console.log("⏳ Dashboard showing skeleton");
    return <DashboardSkeleton />;
  }

  // If we have data, show it even if we're refetching
  console.log("✅ Dashboard showing content");

  return (
    <div className="min-h-screen py-4 px-4 sm:py-6 sm:px-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-left">
            Operations Dashboard
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 text-left">
            Monitor and manage your energy service operations
          </p>
        </div>
        <div className="flex justify-start sm:justify-end">
          <Button
            onClick={manualRefresh}
            variant="outline"
            size="sm"
            className="gap-2 min-h-[44px] px-4"
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">
              {isFetching ? "Refreshing..." : "Refresh Data"}
            </span>
            <span className="sm:hidden">
              {isFetching ? "Refreshing" : "Refresh"}
            </span>
          </Button>
        </div>
      </div>

      {/* Overview Statistics */}
      <OverviewStatsGrid />

      {/* Main Content - Mobile First Layout */}
      <div className="space-y-4 lg:space-y-6">
        {/* Charts Section */}
        <ChartsSection />

        {/* Activity & Alerts - Full width layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <MaintenanceAlertsPanel />
          <RecentActivityFeed />
        </div>
      </div>
    </div>
  );
}

export default function DashboardContainer() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

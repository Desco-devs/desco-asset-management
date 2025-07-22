"use client";

import { Suspense } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  EquipmentsCount,
  MaintenanceAlerts,
  OverviewStats,
  QuickActions,
  RecentActivity,
  VehiclesAndEquipments,
  VehiclesCount,
} from "./components";

function DashboardSkeleton() {
  return (
    <div className="min-h-screen py-6 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-80" />
        </div>
      </div>
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
    </div>
  );
}

function DashboardContent() {
  const { data, isLoading, error } = useDashboardData();

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen py-6 px-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Failed to load dashboard data</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    equipmentCounts = { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
    vehicleCounts = { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
    overviewStats,
    recentActivity = [],
    detailedData
  } = data || {};

  // Default overview stats structure
  const defaultOverviewStats = {
    locations: 0,
    clients: 0,
    projects: 0,
    vehicles: { total: 0, operational: 0, nonOperational: 0 },
    equipment: { total: 0, operational: 0, nonOperational: 0 },
    maintenanceReports: { total: 0, pending: 0, inProgress: 0 },
    growth: { newClientsThisWeek: 0, newProjectsThisWeek: 0, newEquipmentThisWeek: 0, newVehiclesThisWeek: 0 }
  };

  const defaultDetailedData = {
    locations: [],
    clients: [],
    projects: [],
    equipment: [],
    vehicles: [],
    maintenanceReports: []
  };

  return (
    <div className="min-h-screen py-6 px-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your admin dashboard. Monitor and manage your fleet operations.
          </p>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Overview</h2>
        <OverviewStats 
          initialData={overviewStats || defaultOverviewStats} 
          detailedData={detailedData || defaultDetailedData}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EquipmentsCount initialData={equipmentCounts} />
            <VehiclesCount initialData={vehicleCounts} />
          </div>

          {/* Combined Assets Overview */}
          <VehiclesAndEquipments 
            initialVehicleData={vehicleCounts}
            initialEquipmentData={equipmentCounts}
          />

          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Right Column - Activity & Alerts */}
        <div className="space-y-6">
          <MaintenanceAlerts 
            initialEquipmentData={detailedData?.equipment || []}
            initialVehicleData={detailedData?.vehicles || []}
          />
          <RecentActivity initialData={recentActivity} />
        </div>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
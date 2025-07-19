import {
  EquipmentsCount,
  MaintenanceAlerts,
  OverviewStats,
  QuickActions,
  RecentActivity,
  VehiclesAndEquipments,
  VehiclesCount,
} from "./dashboard-components";

// Import organized functions and types
import { fetchDashboardData } from "@/lib/dashboard-data";
import {
  transformEquipmentCounts,
  transformVehicleCounts,
  calculateGrowthMetrics,
  transformOverviewStats,
  transformDetailedData,
  generateRecentActivity,
} from "@/lib/dashboard-utils";
import type { ActivityItem, DetailedData } from "@/types/dashboard";

export default async function Dashboard() {
  // Initialize default values
  let equipmentData = { OPERATIONAL: 0, NON_OPERATIONAL: 0 };
  let vehicleData = { OPERATIONAL: 0, NON_OPERATIONAL: 0 };
  let overviewStatsData = {
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
  let recentActivityData: ActivityItem[] = [];
  let detailedData: DetailedData = {
    locations: [],
    clients: [],
    projects: [],
    equipment: [],
    vehicles: [],
    maintenanceReports: [],
  };

  try {
    // Fetch all data using organized data fetching functions
    const {
      equipmentCounts,
      vehicleCounts,
      locationsData,
      clientsData,
      projectsData,
      equipmentListData,
      vehiclesListData,
      maintenanceReportsData,
    } = await fetchDashboardData();

    // Transform counts using utility functions
    equipmentData = transformEquipmentCounts(equipmentCounts);
    vehicleData = transformVehicleCounts(vehicleCounts);

    // Calculate growth metrics
    const growth = calculateGrowthMetrics(
      clientsData,
      projectsData,
      equipmentListData,
      vehiclesListData
    );

    // Transform overview stats
    overviewStatsData = transformOverviewStats(
      locationsData,
      clientsData,
      projectsData,
      equipmentData,
      vehicleData,
      maintenanceReportsData,
      growth
    );

    // Transform detailed data for overview cards
    detailedData = transformDetailedData(
      locationsData,
      clientsData,
      projectsData,
      equipmentListData,
      vehiclesListData,
      maintenanceReportsData
    );

    // Generate recent activity
    recentActivityData = generateRecentActivity(
      equipmentListData,
      vehiclesListData,
      projectsData,
      clientsData,
      maintenanceReportsData
    );
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
  }

  return (
    <div className="min-h-screen py-6 px-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome to your admin dashboard. Monitor and manage your fleet
            operations.
          </p>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Overview</h2>
        <OverviewStats 
          initialData={overviewStatsData} 
          detailedData={detailedData}
        />
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <EquipmentsCount initialData={equipmentData} />
            <VehiclesCount initialData={vehicleData} />
          </div>

          {/* Combined Assets Overview */}
          <VehiclesAndEquipments 
            initialVehicleData={vehicleData}
            initialEquipmentData={equipmentData}
          />

          {/* Quick Actions */}
          <QuickActions />
        </div>

        {/* Right Column - Activity & Alerts */}
        <div className="space-y-6">
          <MaintenanceAlerts 
            initialEquipmentData={detailedData.equipment}
            initialVehicleData={detailedData.vehicles}
          />
          <RecentActivity initialData={recentActivityData} />
        </div>
      </div>
    </div>
  );
}

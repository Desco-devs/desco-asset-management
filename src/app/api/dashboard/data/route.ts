import { NextRequest, NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/dashboard-data";
import {
  transformEquipmentCounts,
  transformVehicleCounts,
  calculateGrowthMetrics,
  transformOverviewStats,
  transformDetailedData,
  generateRecentActivity,
} from "@/lib/dashboard-utils";

export async function GET(request: NextRequest) {
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
      locationsTotalCount,
      clientsTotalCount,
      projectsTotalCount,
      maintenanceReportsTotalCount,
      maintenanceReportsStatusCounts,
    } = await fetchDashboardData();

    // Transform counts using utility functions
    const equipmentData = transformEquipmentCounts(equipmentCounts);
    const vehicleData = transformVehicleCounts(vehicleCounts);

    // Calculate growth metrics
    const growth = calculateGrowthMetrics(
      clientsData,
      projectsData,
      equipmentListData,
      vehiclesListData
    );

    // Transform overview stats
    const overviewStatsData = transformOverviewStats(
      locationsTotalCount,
      clientsTotalCount,
      projectsTotalCount,
      equipmentData,
      vehicleData,
      maintenanceReportsTotalCount,
      maintenanceReportsStatusCounts,
      growth
    );

    // Transform detailed data for overview cards
    const detailedData = transformDetailedData(
      locationsData,
      clientsData,
      projectsData,
      equipmentListData,
      vehiclesListData,
      maintenanceReportsData
    );

    // Generate recent activity
    const recentActivityData = generateRecentActivity(
      equipmentListData,
      vehiclesListData,
      projectsData,
      clientsData,
      maintenanceReportsData,
      locationsData
    );

    return NextResponse.json({
      equipmentCounts: equipmentData,
      vehicleCounts: vehicleData,
      overviewStats: overviewStatsData,
      recentActivity: recentActivityData,
      detailedData,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    
    // Return empty data structure instead of error
    return NextResponse.json({
      equipmentCounts: { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
      vehicleCounts: { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
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
          newVehiclesThisWeek: 0
        }
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
    });
  }
}
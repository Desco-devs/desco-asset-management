import { NextResponse } from "next/server";
import { fetchDashboardData } from "@/lib/dashboard-data";
import {
  transformEquipmentCounts,
  transformVehicleCounts,
  calculateGrowthMetrics,
  transformOverviewStats,
  transformDetailedData,
  generateRecentActivity,
} from "@/lib/dashboard-utils";

export async function GET() {
  try {
    console.log('📊 Dashboard API: Starting data fetch...');
    
    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Dashboard data fetch timeout after 10 seconds')), 10000);
    });
    
    const dataPromise = fetchDashboardData();
    
    // Race between data fetch and timeout
    const result = await Promise.race([dataPromise, timeoutPromise]);
    
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
    } = result as any;
    
    console.log('✅ Dashboard API: Data fetched successfully');

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
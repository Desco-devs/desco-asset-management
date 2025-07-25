import { NextResponse } from "next/server";
import { fetchDashboardData, fetchMaintenanceAlerts, fetchRecentActivities } from "@/lib/dashboard-data";
import {
  transformEquipmentCounts,
  transformVehicleCounts,
  calculateGrowthMetrics,
  transformOverviewStats,
  transformDetailedData,
  generateRecentActivity,
  generateEnhancedRecentActivity,
  transformMaintenanceAlerts,
} from "@/lib/dashboard-utils";

export async function GET(request: Request) {
  try {
    // Get time range from query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || 'month';
    
    // Add timeout to prevent infinite hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Dashboard data fetch timeout after 10 seconds')), 10000);
    });
    
    const dataPromise = fetchDashboardData(timeRange);
    
    // Race between data fetch and timeout
    const result = await Promise.race([dataPromise, timeoutPromise]);
    
    // Fetch maintenance alerts and recent activities separately to avoid slowing down main data
    const maintenanceAlertsPromise = fetchMaintenanceAlerts().catch(err => {
      return {
        equipmentReports: [],
        vehicleReports: [],
        nonOperationalEquipment: [],
        nonOperationalVehicles: [],
        overdueVehicles: [],
        insuranceExpiringEquipment: []
      };
    });

    const recentActivitiesPromise = fetchRecentActivities().catch(err => {
      return {
        recentMaintenance: [],
        recentVehicleMaintenance: [],
        recentEquipment: [],
        recentVehicles: [],
        recentProjects: []
      };
    });
    
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
    
    // Get maintenance alerts and recent activities
    const [maintenanceAlertsData, recentActivitiesData] = await Promise.all([
      maintenanceAlertsPromise,
      recentActivitiesPromise
    ]);
    

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

    // Generate recent activity using enhanced data
    const recentActivityData = generateEnhancedRecentActivity(recentActivitiesData);

    // Transform maintenance alerts
    const transformedMaintenanceAlerts = transformMaintenanceAlerts(maintenanceAlertsData);

    return NextResponse.json({
      equipmentCounts: equipmentData,
      vehicleCounts: vehicleData,
      overviewStats: overviewStatsData,
      recentActivity: recentActivityData,
      detailedData,
      maintenanceAlerts: transformedMaintenanceAlerts,
    });
  } catch (error) {
    
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
      maintenanceAlerts: [],
    });
  }
}
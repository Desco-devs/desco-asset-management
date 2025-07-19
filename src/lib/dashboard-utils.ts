import type {
  StatsData,
  DetailedData,
  ActivityItem,
  EquipmentVehicleCounts,
  GrowthMetrics,
  LocationData,
  ClientData,
  ProjectData,
  EquipmentData,
  VehicleData,
  MaintenanceReportData
} from "@/types/dashboard";

/**
 * Transform equipment counts from Prisma groupBy result
 */
export function transformEquipmentCounts(equipmentCounts: any[]): EquipmentVehicleCounts {
  return {
    OPERATIONAL: equipmentCounts.find((item) => item.status === "OPERATIONAL")?._count.status || 0,
    NON_OPERATIONAL: equipmentCounts.find((item) => item.status === "NON_OPERATIONAL")?._count.status || 0,
  };
}

/**
 * Transform vehicle counts from Prisma groupBy result
 */
export function transformVehicleCounts(vehicleCounts: any[]): EquipmentVehicleCounts {
  return {
    OPERATIONAL: vehicleCounts.find((item) => item.status === "OPERATIONAL")?._count.status || 0,
    NON_OPERATIONAL: vehicleCounts.find((item) => item.status === "NON_OPERATIONAL")?._count.status || 0,
  };
}

/**
 * Calculate growth metrics for the past week
 */
export function calculateGrowthMetrics(
  clientsData: ClientData[],
  projectsData: ProjectData[],
  equipmentListData: EquipmentData[],
  vehiclesListData: VehicleData[]
): GrowthMetrics {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  return {
    newClientsThisWeek: clientsData.filter(c => new Date(c.created_at) >= oneWeekAgo).length,
    newProjectsThisWeek: projectsData.filter(p => new Date(p.created_at) >= oneWeekAgo).length,
    newEquipmentThisWeek: equipmentListData.filter(e => new Date(e.created_at) >= oneWeekAgo).length,
    newVehiclesThisWeek: vehiclesListData.filter(v => new Date(v.created_at) >= oneWeekAgo).length,
  };
}

/**
 * Transform maintenance status counts from Prisma groupBy result
 */
export function transformMaintenanceStatusCounts(maintenanceStatusCounts: any[]) {
  return {
    pending: maintenanceStatusCounts.find((item) => item.status === "REPORTED")?._count.status || 0,
    inProgress: maintenanceStatusCounts.find((item) => item.status === "IN_PROGRESS")?._count.status || 0,
  };
}

/**
 * Transform all data into overview stats format
 */
export function transformOverviewStats(
  locationsTotalCount: number,
  clientsTotalCount: number,
  projectsTotalCount: number,
  equipmentData: EquipmentVehicleCounts,
  vehicleData: EquipmentVehicleCounts,
  maintenanceReportsTotalCount: number,
  maintenanceStatusCounts: any[],
  growth: GrowthMetrics
): StatsData {
  const maintenanceStats = transformMaintenanceStatusCounts(maintenanceStatusCounts);
  
  return {
    locations: locationsTotalCount,
    clients: clientsTotalCount,
    projects: projectsTotalCount,
    vehicles: {
      total: vehicleData.OPERATIONAL + vehicleData.NON_OPERATIONAL,
      operational: vehicleData.OPERATIONAL,
      nonOperational: vehicleData.NON_OPERATIONAL,
    },
    equipment: {
      total: equipmentData.OPERATIONAL + equipmentData.NON_OPERATIONAL,
      operational: equipmentData.OPERATIONAL,
      nonOperational: equipmentData.NON_OPERATIONAL,
    },
    maintenanceReports: {
      total: maintenanceReportsTotalCount,
      pending: maintenanceStats.pending,
      inProgress: maintenanceStats.inProgress,
    },
    growth,
  };
}

/**
 * Transform data into detailed data format for overview cards
 */
export function transformDetailedData(
  locationsData: LocationData[],
  clientsData: ClientData[],
  projectsData: ProjectData[],
  equipmentListData: EquipmentData[],
  vehiclesListData: VehicleData[],
  maintenanceReportsData: MaintenanceReportData[]
): DetailedData {
  return {
    locations: locationsData,
    clients: clientsData,
    projects: projectsData,
    equipment: equipmentListData,
    vehicles: vehiclesListData,
    maintenanceReports: maintenanceReportsData,
  };
}

/**
 * Generate recent activity items from all data sources
 */
export function generateRecentActivity(
  equipmentListData: EquipmentData[],
  vehiclesListData: VehicleData[],
  projectsData: ProjectData[],
  clientsData: ClientData[],
  maintenanceReportsData: MaintenanceReportData[]
): ActivityItem[] {
  const allActivities: ActivityItem[] = [];

  // Add equipment activities
  equipmentListData.forEach((item) => {
    allActivities.push({
      id: item.id,
      type: "equipment",
      action: "created",
      title: `${item.brand} ${item.model}`,
      description: `New ${item.type} equipment added`,
      timestamp: item.created_at.toISOString(),
      status: item.status,
    });
  });

  // Add vehicle activities
  vehiclesListData.forEach((item) => {
    allActivities.push({
      id: item.id,
      type: "vehicle",
      action: "created",
      title: `${item.brand} ${item.model}`,
      description: `Vehicle ${item.plate_number} registered`,
      timestamp: item.created_at.toISOString(),
      status: item.status,
    });
  });

  // Add project activities
  projectsData.slice(0, 2).forEach((item) => {
    allActivities.push({
      id: item.id,
      type: "project",
      action: "created",
      title: item.name,
      description: "New project created",
      timestamp: item.created_at.toISOString(),
    });
  });

  // Add client activities
  clientsData.slice(0, 2).forEach((item) => {
    allActivities.push({
      id: item.id,
      type: "client",
      action: "created",
      title: item.name,
      description: "New client registered",
      timestamp: item.created_at.toISOString(),
    });
  });

  // Add maintenance activities
  maintenanceReportsData.forEach((item) => {
    allActivities.push({
      id: item.id,
      type: "maintenance",
      action: "reported",
      title: "Maintenance Report",
      description: (item.issue_description || 'No description').substring(0, 50) + "...",
      timestamp: (item.date_reported || item.created_at).toISOString(),
      status: item.status,
      priority: item.priority,
    });
  });

  // Sort by timestamp and take the most recent 10
  return allActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);
}
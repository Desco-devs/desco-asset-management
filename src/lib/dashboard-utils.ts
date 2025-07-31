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
  maintenanceReportsData: MaintenanceReportData[],
  locationsData: LocationData[]
): ActivityItem[] {
  const allActivities: ActivityItem[] = [];

  // Helper function to get user name or fallback
  const getUserName = (createdBy?: string) => {
    // In a real implementation, you'd lookup the user by ID
    // For now, return a placeholder or the ID
    return createdBy ? `User ${createdBy.slice(-4)}` : "System";
  };

  // Add equipment activities (created and status changes)
  equipmentListData.forEach((item) => {
    // Equipment creation activity
    allActivities.push({
      id: `equipment-created-${item.id}`,
      type: "equipment",
      action: "created",
      title: `${item.brand} ${item.model}`,
      description: `New ${item.type} equipment added to inventory`,
      timestamp: item.created_at.toISOString(),
      status: item.status,
      user: item.owner || "System",
    });

    // Equipment status activity (if recently updated)
    const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate <= 7) { // Only include if updated within last week
      allActivities.push({
        id: `equipment-status-${item.id}`,
        type: "equipment",
        action: item.status === "OPERATIONAL" ? "repaired" : "breakdown",
        title: `${item.brand} ${item.model}`,
        description: `Equipment status changed to ${item.status.toLowerCase().replace('_', ' ')}`,
        timestamp: item.created_at.toISOString(), // In real scenario, this would be updated_at
        status: item.status,
        user: getUserName(),
      });
    }
  });

  // Add vehicle activities (created and status changes)
  vehiclesListData.forEach((item) => {
    // Vehicle creation activity
    allActivities.push({
      id: `vehicle-created-${item.id}`,
      type: "vehicle",
      action: "created",
      title: `${item.brand} ${item.model}`,
      description: `Vehicle ${item.plate_number} registered in fleet`,
      timestamp: item.created_at.toISOString(),
      status: item.status,
      user: item.owner || "System",
    });

    // Vehicle status activity (if recently updated)
    const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceUpdate <= 7) {
      allActivities.push({
        id: `vehicle-status-${item.id}`,
        type: "vehicle",
        action: item.status === "OPERATIONAL" ? "repaired" : "breakdown",
        title: `${item.brand} ${item.model}`,
        description: `Vehicle ${item.plate_number} status changed to ${item.status.toLowerCase().replace('_', ' ')}`,
        timestamp: item.created_at.toISOString(),
        status: item.status,
        user: getUserName(),
      });
    }
  });

  // Enhanced maintenance activities with status progression
  maintenanceReportsData.forEach((item) => {
    const equipment = item.equipment;
    const assetName = equipment ? 'Equipment Asset' : 'Unknown Asset';
    
    // Maintenance reported activity
    allActivities.push({
      id: `maintenance-reported-${item.id}`,
      type: "maintenance",
      action: "reported",
      title: "Maintenance Report",
      description: `Issue reported for ${assetName}: ${(item.issue_description || 'No description').substring(0, 40)}...`,
      timestamp: (item.date_reported || item.created_at).toISOString(),
      status: item.status || "REPORTED",
      priority: item.priority || "MEDIUM",
      user: getUserName(), // In real scenario, this would be reported_by user
    });

    // Maintenance progress activity (if status changed)
    if (item.status === "IN_PROGRESS") {
      allActivities.push({
        id: `maintenance-progress-${item.id}`,
        type: "maintenance",
        action: "started",
        title: "Maintenance Started",
        description: `Maintenance work began on ${assetName}`,
        timestamp: item.created_at.toISOString(), // In real scenario, use status change timestamp
        status: item.status,
        priority: item.priority || "MEDIUM",
        user: getUserName(), // In real scenario, this would be the technician who started work
      });
    }

    // Maintenance completed activity (if completed)
    if (item.status === "COMPLETED") {
      allActivities.push({
        id: `maintenance-completed-${item.id}`,
        type: "maintenance",
        action: "completed",
        title: "Maintenance Completed",
        description: `Maintenance work completed on ${assetName}`,
        timestamp: item.created_at.toISOString(), // In real scenario, use date_repaired
        status: item.status,
        priority: item.priority || "MEDIUM",
        user: getUserName(), // In real scenario, this would be repaired_by user
      });
    }
  });

  // Add project activities
  projectsData.slice(0, 3).forEach((item) => {
    allActivities.push({
      id: `project-created-${item.id}`,
      type: "project",
      action: "created",
      title: item.name,
      description: `New project "${item.name}" created for ${item.client?.name || 'Unknown Client'}`,
      timestamp: item.created_at.toISOString(),
      user: getUserName(),
    });
  });

  // Add client activities
  clientsData.slice(0, 3).forEach((item) => {
    allActivities.push({
      id: `client-created-${item.id}`,
      type: "client",
      action: "created",
      title: item.name,
      description: `New client "${item.name}" registered`,
      timestamp: item.created_at.toISOString(),
      user: getUserName(),
    });
  });

  // Add location activities
  locationsData.slice(0, 2).forEach((item) => {
    allActivities.push({
      id: `location-created-${item.id}`,
      type: "location",
      action: "created",
      title: item.address,
      description: `New service location added: ${item.address}`,
      timestamp: item.created_at.toISOString(),
      user: getUserName(),
    });
  });

  // Sort by timestamp and take the most recent 15
  return allActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);
}

/**
 * Generate recent activities from enhanced database queries
 */
export function generateEnhancedRecentActivity(recentData: any): ActivityItem[] {
  const allActivities: ActivityItem[] = [];

  // Helper function to get user name
  const getUserName = (user?: { full_name?: string; username?: string }) => {
    return user?.full_name || user?.username || "System";
  };

  // Process recent maintenance reports (equipment)
  recentData.recentMaintenance?.forEach((report: any) => {
    const equipment = report.equipment;
    const assetName = equipment ? `${equipment.brand} ${equipment.model}` : 'Unknown Equipment';
    
    allActivities.push({
      id: `maintenance-${report.id}`,
      type: "maintenance",
      action: report.status === "COMPLETED" ? "completed" : 
              report.status === "IN_PROGRESS" ? "started" : "reported",
      title: "Maintenance Report",
      description: `${report.status === "COMPLETED" ? "Completed" : 
                   report.status === "IN_PROGRESS" ? "Started work on" : 
                   "Issue reported for"} ${assetName}: ${(report.issue_description || 'No description').substring(0, 50)}...`,
      timestamp: (report.date_repaired || report.date_reported || report.created_at).toISOString(),
      status: report.status || "REPORTED",
      priority: report.priority || "MEDIUM",
      user: getUserName(report.status === "COMPLETED" ? report.repaired_user : report.reported_user),
    });
  });

  // Process recent vehicle maintenance reports
  recentData.recentVehicleMaintenance?.forEach((report: any) => {
    const vehicle = report.vehicle;
    const vehicleName = vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate_number})` : 'Unknown Vehicle';
    
    allActivities.push({
      id: `vehicle-maintenance-${report.id}`,
      type: "maintenance",
      action: report.status === "COMPLETED" ? "completed" : 
              report.status === "IN_PROGRESS" ? "started" : "reported",
      title: "Vehicle Maintenance",
      description: `${report.status === "COMPLETED" ? "Completed" : 
                   report.status === "IN_PROGRESS" ? "Started work on" : 
                   "Issue reported for"} ${vehicleName}: ${(report.issue_description || 'No description').substring(0, 50)}...`,
      timestamp: (report.date_repaired || report.date_reported || report.created_at).toISOString(),
      status: report.status || "REPORTED",
      priority: report.priority || "MEDIUM",
      user: getUserName(report.status === "COMPLETED" ? report.repaired_user : report.reported_user),
    });
  });

  // Process recent equipment additions
  recentData.recentEquipment?.forEach((equipment: any) => {
    const projectInfo = equipment.project ? ` for project "${equipment.project.name}"` : '';
    const clientInfo = equipment.project?.client ? ` (${equipment.project.client.name})` : '';
    
    allActivities.push({
      id: `equipment-added-${equipment.id}`,
      type: "equipment",
      action: "created",
      title: `${equipment.brand} ${equipment.model}`,
      description: `New ${equipment.type} equipment added to inventory${projectInfo}${clientInfo}`,
      timestamp: equipment.created_at.toISOString(),
      status: equipment.status,
      user: getUserName(equipment.user),
    });
  });

  // Process recent vehicle additions
  recentData.recentVehicles?.forEach((vehicle: any) => {
    const projectInfo = vehicle.project ? ` for project "${vehicle.project.name}"` : '';
    const clientInfo = vehicle.project?.client ? ` (${vehicle.project.client.name})` : '';
    
    allActivities.push({
      id: `vehicle-added-${vehicle.id}`,
      type: "vehicle",
      action: "created",
      title: `${vehicle.brand} ${vehicle.model}`,
      description: `Vehicle ${vehicle.plate_number} registered in fleet${projectInfo}${clientInfo}`,
      timestamp: vehicle.created_at.toISOString(),
      status: vehicle.status,
      user: getUserName(vehicle.user),
    });
  });

  // Process recent projects
  recentData.recentProjects?.forEach((project: any) => {
    const clientInfo = project.client ? ` for client "${project.client.name}"` : '';
    
    allActivities.push({
      id: `project-created-${project.id}`,
      type: "project",
      action: "created",
      title: project.name,
      description: `New project "${project.name}" created${clientInfo}`,
      timestamp: project.created_at.toISOString(),
      user: getUserName(project.user),
    });
  });

  // Sort by timestamp and return top 15
  return allActivities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);
}

/**
 * Transform maintenance alerts data from raw queries into alert format
 */
export function transformMaintenanceAlerts(alertsData: any) {
  const alerts: any[] = [];

  // 1. Active Maintenance Reports (Equipment)
  alertsData.equipmentReports?.forEach((report: any) => {
    alerts.push({
      id: `equipment-report-${report.id}`,
      type: 'equipment',
      name: `${report.equipment?.brand || 'Unknown'} ${report.equipment?.model || ''}`.trim(),
      status: report.status || 'REPORTED',
      priority: getPriorityLevel(report.priority),
      message: `${report.status === 'REPORTED' ? 'New maintenance report' : 'Maintenance in progress'}: ${report.issue_description || 'No description'}`,
      location: report.location?.address || 'Unknown location',
      dateReported: report.date_reported,
      alertType: 'active_maintenance'
    });
  });

  // 2. Active Maintenance Reports (Vehicles)  
  alertsData.vehicleReports?.forEach((report: any) => {
    alerts.push({
      id: `vehicle-report-${report.id}`,
      type: 'vehicle',
      name: `${report.vehicle?.brand || 'Unknown'} ${report.vehicle?.model || ''} (${report.vehicle?.plate_number || 'No plate'})`.trim(),
      status: report.status || 'REPORTED',
      priority: getPriorityLevel(report.priority),
      message: `${report.status === 'REPORTED' ? 'New maintenance report' : 'Maintenance in progress'}: ${report.issue_description || 'No description'}`,
      location: report.location?.address || 'Unknown location',
      dateReported: report.date_reported,
      alertType: 'active_maintenance'
    });
  });

  // 3. Non-Operational Equipment
  alertsData.nonOperationalEquipment?.forEach((equipment: any) => {
    alerts.push({
      id: `non-operational-equipment-${equipment.id}`,
      type: 'equipment',
      name: `${equipment.brand || 'Unknown'} ${equipment.model || ''}`.trim(),
      status: 'NON_OPERATIONAL',
      priority: 'medium',
      message: `Equipment is non-operational and requires attention`,
      location: equipment.project?.client?.location?.address || 'Unknown location',
      lastUpdate: equipment.updated_at,
      alertType: 'non_operational'
    });
  });

  // 4. Non-Operational Vehicles
  alertsData.nonOperationalVehicles?.forEach((vehicle: any) => {
    alerts.push({
      id: `non-operational-vehicle-${vehicle.id}`,
      type: 'vehicle',
      name: `${vehicle.brand || 'Unknown'} ${vehicle.model || ''} (${vehicle.plate_number || 'No plate'})`.trim(),
      status: 'NON_OPERATIONAL',
      priority: 'medium',
      message: `Vehicle is non-operational and requires attention`,
      location: vehicle.project?.client?.location?.address || 'Unknown location',
      lastUpdate: vehicle.updated_at,
      alertType: 'non_operational'
    });
  });

  // 5. Overdue Vehicles (Inspections & Insurance)
  alertsData.overdueVehicles?.forEach((vehicle: any) => {
    const isInspectionOverdue = vehicle.inspection_date && new Date(vehicle.inspection_date) < new Date();
    const isInsuranceOverdue = vehicle.expiry_date && new Date(vehicle.expiry_date) < new Date();
    
    let message = '';
    if (isInspectionOverdue && isInsuranceOverdue) {
      message = 'Both inspection and insurance are overdue';
    } else if (isInspectionOverdue) {
      message = 'Vehicle inspection is overdue';
    } else if (isInsuranceOverdue) {
      message = 'Vehicle insurance has expired';
    }

    alerts.push({
      id: `overdue-vehicle-${vehicle.id}`,
      type: 'vehicle',
      name: `${vehicle.brand || 'Unknown'} ${vehicle.model || ''} (${vehicle.plate_number || 'No plate'})`.trim(),
      status: 'OPERATIONAL',
      priority: 'high',
      message,
      location: vehicle.project?.client?.location?.address || 'Unknown location',
      inspectionDate: vehicle.inspection_date,
      expiryDate: vehicle.expiry_date,
      alertType: 'overdue'
    });
  });

  // 6. Insurance Expiring Equipment
  alertsData.insuranceExpiringEquipment?.forEach((equipment: any) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(equipment.insurance_expiration_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    alerts.push({
      id: `insurance-expiring-equipment-${equipment.id}`,
      type: 'equipment',
      name: `${equipment.brand || 'Unknown'} ${equipment.model || ''}`.trim(),
      status: 'OPERATIONAL',
      priority: daysUntilExpiry <= 7 ? 'critical' : 'medium',
      message: `Insurance expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`,
      location: equipment.project?.client?.location?.address || 'Unknown location',
      expirationDate: equipment.insurance_expiration_date,
      alertType: 'insurance_expiry'
    });
  });

  // Sort by priority and date
  return alerts.sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 1;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 1;
    
    if (aPriority !== bPriority) {
      return bPriority - aPriority; // Higher priority first
    }
    
    // Sort by most recent date
    const aDate = new Date(a.dateReported || a.lastUpdate || a.expirationDate || 0);
    const bDate = new Date(b.dateReported || b.lastUpdate || b.expirationDate || 0);
    return bDate.getTime() - aDate.getTime();
  });
}

/**
 * Map Prisma priority enum to alert priority levels
 */
function getPriorityLevel(priority: string | null): 'low' | 'medium' | 'high' | 'critical' {
  switch (priority) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
      return 'low';
    default:
      return 'medium';
  }
}
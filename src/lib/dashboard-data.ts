import { prisma } from "@/lib/prisma";
import type {
  LocationData,
  ClientData,
  ProjectData,
  EquipmentData,
  VehicleData,
  MaintenanceReportData
} from "@/types/dashboard";

/**
 * Fetch all dashboard data in parallel
 */
export async function fetchDashboardData() {
  try {
    const [
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
    ] = await Promise.all([
      fetchEquipmentCounts(),
      fetchVehicleCounts(),
      fetchLocations(),
      fetchClients(),
      fetchProjects(),
      fetchEquipmentList(),
      fetchVehiclesList(),
      fetchMaintenanceReports(),
      fetchLocationsTotalCount(),
      fetchClientsTotalCount(),
      fetchProjectsTotalCount(),
      fetchMaintenanceReportsTotalCount(),
      fetchMaintenanceReportsStatusCounts(),
    ]);

    return {
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
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw error;
  }
}

/**
 * Fetch equipment status counts
 */
async function fetchEquipmentCounts() {
  return prisma.equipment.groupBy({
    by: ["status"],
    _count: { status: true },
  });
}

/**
 * Fetch vehicle status counts
 */
async function fetchVehicleCounts() {
  return prisma.vehicle.groupBy({
    by: ["status"],
    _count: { status: true },
  });
}

/**
 * Fetch locations with client count and creator info
 */
async function fetchLocations(): Promise<LocationData[]> {
  const locations = await prisma.location.findMany({
    take: 15,
    orderBy: { created_at: "desc" },
    include: {
      clients: {
        select: { id: true, name: true }
      },
      user: {
        select: { full_name: true }
      }
    }
  });

  return locations.map(location => ({
    id: location.id,
    address: location.address,
    created_at: location.created_at,
    clients: location.clients,
    user: location.user || undefined
  }));
}

/**
 * Fetch clients with location and project count
 */
async function fetchClients(): Promise<ClientData[]> {
  return prisma.client.findMany({
    take: 15,
    orderBy: { created_at: "desc" },
    include: {
      location: true,
      projects: { select: { id: true } }
    }
  });
}

/**
 * Fetch projects with client/location and asset counts
 */
async function fetchProjects(): Promise<ProjectData[]> {
  return prisma.project.findMany({
    take: 15,
    orderBy: { created_at: "desc" },
    include: {
      client: {
        select: {
          name: true,
          location: { select: { address: true } }
        }
      },
      equipments: { select: { id: true } },
      vehicles: { select: { id: true } }
    }
  });
}

/**
 * Fetch recent equipment
 */
async function fetchEquipmentList(): Promise<EquipmentData[]> {
  const equipment = await prisma.equipment.findMany({
    take: 10,
    orderBy: { created_at: "desc" },
    include: {
      project: {
        include: {
          client: {
            include: { location: true }
          }
        }
      },
    },
  });

  return equipment.map(item => ({
    id: item.id,
    brand: item.brand,
    model: item.model,
    type: item.type,
    status: item.status as 'OPERATIONAL' | 'NON_OPERATIONAL',
    owner: item.owner,
    created_at: item.created_at,
    inspection_date: item.inspection_date?.toISOString(),
    project: item.project
  }));
}

/**
 * Fetch recent vehicles
 */
async function fetchVehiclesList(): Promise<VehicleData[]> {
  const vehicles = await prisma.vehicle.findMany({
    take: 10,
    orderBy: { created_at: "desc" },
    include: {
      project: {
        include: {
          client: {
            include: { location: true }
          }
        }
      },
    },
  });

  return vehicles.map(item => ({
    id: item.id,
    brand: item.brand,
    model: item.model,
    type: item.type,
    plate_number: item.plate_number,
    status: item.status as 'OPERATIONAL' | 'NON_OPERATIONAL',
    owner: item.owner,
    created_at: item.created_at,
    inspection_date: item.inspection_date.toISOString(),
    project: item.project
  }));
}

/**
 * Fetch recent maintenance reports
 */
async function fetchMaintenanceReports(): Promise<MaintenanceReportData[]> {
  const reports = await prisma.maintenance_equipment_report.findMany({
    take: 10,
    orderBy: { date_reported: 'desc' },
    include: {
      equipment: {
        include: {
          project: {
            include: {
              client: { include: { location: true } }
            }
          }
        }
      },
      location: true,
    },
  });

  return reports.map(item => ({
    id: item.id,
    issue_description: item.issue_description || '',
    status: (item.status || 'REPORTED') as 'REPORTED' | 'IN_PROGRESS' | 'COMPLETED',
    priority: (item.priority || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
    date_reported: item.date_reported || item.created_at,
    created_at: item.created_at,
    equipment: item.equipment
  }));
}

/**
 * Fetch total count of locations
 */
async function fetchLocationsTotalCount(): Promise<number> {
  return prisma.location.count();
}

/**
 * Fetch total count of clients
 */
async function fetchClientsTotalCount(): Promise<number> {
  return prisma.client.count();
}

/**
 * Fetch total count of projects
 */
async function fetchProjectsTotalCount(): Promise<number> {
  return prisma.project.count();
}

/**
 * Fetch total count of maintenance reports
 */
async function fetchMaintenanceReportsTotalCount(): Promise<number> {
  return prisma.maintenance_equipment_report.count();
}

/**
 * Fetch maintenance reports status counts
 */
export async function fetchMaintenanceReportsStatusCounts() {
  return prisma.maintenance_equipment_report.groupBy({
    by: ["status"],
    _count: { status: true },
    where: {
      status: {
        not: null
      }
    }
  });
}

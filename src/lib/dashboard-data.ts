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
    ] = await Promise.all([
      fetchEquipmentCounts(),
      fetchVehicleCounts(),
      fetchLocations(),
      fetchClients(),
      fetchProjects(),
      fetchEquipmentList(),
      fetchVehiclesList(),
      fetchMaintenanceReports(),
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
  return prisma.location.findMany({
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
}

/**
 * Fetch clients with location and project count
 */
async function fetchClients(): Promise<ClientData[]> {
  return prisma.client.findMany({
    take: 15,
    orderBy: { created_at: "desc" },
    include: {
      location: { select: { address: true } },
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
  return prisma.equipment.findMany({
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
}

/**
 * Fetch recent vehicles
 */
async function fetchVehiclesList(): Promise<VehicleData[]> {
  return prisma.vehicle.findMany({
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
}

/**
 * Fetch recent maintenance reports
 */
async function fetchMaintenanceReports(): Promise<MaintenanceReportData[]> {
  const rows = await prisma.maintenance_equipment_report.findMany({
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
      location: true
    }
  })

  return rows.map(row => ({
    ...row,
    status: row.status === 'CANCELLED' ? null : row.status, // ✅ normalize CANCELLED to null
  }))
}

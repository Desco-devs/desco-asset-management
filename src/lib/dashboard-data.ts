import { prisma } from "@/lib/prisma";
import type {
  LocationData,
  ClientData,
  ProjectData,
  EquipmentData,
  VehicleData,
  MaintenanceReportData,
} from "@/types/dashboard";

/**
 * Fetch essential dashboard data (counts and basic stats) - FAST
 */
export async function fetchDashboardData() {
  console.log('🔄 fetchDashboardData: Starting...');

  try {
    console.log('📊 Phase 1: Fetching counts...');
    // Priority 1: Essential counts only (fast queries)
    const countsPromise = Promise.all([
      fetchEquipmentCounts().catch(err => { console.warn('Equipment counts failed:', err); return []; }),
      fetchVehicleCounts().catch(err => { console.warn('Vehicle counts failed:', err); return []; }),
      fetchLocationsTotalCount().catch(err => { console.warn('Locations count failed:', err); return 0; }),
      fetchClientsTotalCount().catch(err => { console.warn('Clients count failed:', err); return 0; }),
      fetchProjectsTotalCount().catch(err => { console.warn('Projects count failed:', err); return 0; }),
      fetchMaintenanceReportsTotalCount().catch(err => { console.warn('Maintenance count failed:', err); return 0; }),
      fetchMaintenanceReportsStatusCounts().catch(err => { console.warn('Maintenance status counts failed:', err); return []; }),
    ]);

    const [
      equipmentCounts,
      vehicleCounts,
      locationsTotalCount,
      clientsTotalCount,
      projectsTotalCount,
      maintenanceReportsTotalCount,
      maintenanceReportsStatusCounts,
    ] = await Promise.race([
      countsPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Counts timeout')), 5000))
    ]) as any;

    console.log('✅ Phase 1 complete');
    console.log('📊 Phase 2: Fetching list data...');

    // Priority 2: Simple list data without deep joins (still reasonably fast)
    const listsPromise = Promise.all([
      fetchLocationsSimple().catch(err => { console.warn('Locations data failed:', err); return []; }),
      fetchClientsSimple().catch(err => { console.warn('Clients data failed:', err); return []; }),
      fetchProjectsSimple().catch(err => { console.warn('Projects data failed:', err); return []; }),
      fetchEquipmentListSimple().catch(err => { console.warn('Equipment list failed:', err); return []; }),
      fetchVehiclesListSimple().catch(err => { console.warn('Vehicles list failed:', err); return []; }),
      fetchMaintenanceReportsSimple().catch(err => { console.warn('Maintenance reports failed:', err); return []; }),
    ]);

    const [
      locationsData,
      clientsData,
      projectsData,
      equipmentListData,
      vehiclesListData,
      maintenanceReportsData,
    ] = await Promise.race([
      listsPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Lists timeout')), 8000))
    ]) as any;

    console.log('✅ Phase 2 complete');

    const result = {
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

    console.log('🎉 fetchDashboardData: Complete!', result);
    return result;
  } catch (error) {
    console.error("❌ Error fetching dashboard data:", error);
    console.error("Stack trace:", error);
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
 * Fetch locations - SIMPLE VERSION (no deep joins)
 */
async function fetchLocationsSimple(): Promise<LocationData[]> {
  const locations = await prisma.location.findMany({
    take: 15,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      address: true,
      created_at: true,
      created_by: true,
      clients: {
        select: { id: true, name: true }
      }
    }
  });

  return locations.map((location) => ({
    id: location.id,
    name: location.created_by || 'System',
    address: location.address,
    created_at: location.created_at,
    clients: location.clients || [],
    user: null // Skip user lookup for speed
  }));
}

/**
 * Fetch clients - SIMPLE VERSION
 */
async function fetchClientsSimple(): Promise<ClientData[]> {
  return prisma.client.findMany({
    take: 15,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      location_id: true,
      created_at: true,
      updated_at: true,
      created_by: true,
      location: {
        select: { id: true, address: true, created_at: true }
      },
      projects: { select: { id: true } }
    }
  });
}

/**
 * Fetch projects - SIMPLE VERSION
 */
async function fetchProjectsSimple(): Promise<ProjectData[]> {
  return prisma.project.findMany({
    take: 15,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      client_id: true,
      created_at: true,
      updated_at: true,
      created_by: true,
      client: {
        select: {
          id: true,
          name: true,
          location: { select: { address: true } },
        },
      },
      equipments: { select: { id: true } },
      vehicles: { select: { id: true } },
    },
  });
}

/**
 * Fetch recent equipment - SIMPLE VERSION (no deep joins)
 */
async function fetchEquipmentListSimple(): Promise<EquipmentData[]> {
  const equipment = await prisma.equipment.findMany({
    take: 10,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      brand: true,
      model: true,
      type: true,
      status: true,
      owner: true,
      created_at: true,
      inspection_date: true,
      project_id: true,
      project: {
        select: {
          id: true,
          name: true,
          client: {
            select: {
              id: true,
              name: true,
              location: {
                select: { id: true, address: true, created_at: true }
              }
            }
          }
        }
      }
    }
  });

  return equipment.map((item) => ({
    id: item.id,
    brand: item.brand,
    model: item.model,
    type: item.type,
    status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
    owner: item.owner,
    created_at: item.created_at,
    inspection_date: item.inspection_date,
    project: item.project,
  }));
}

/**
 * Fetch recent vehicles - SIMPLE VERSION (no deep joins)
 */
async function fetchVehiclesListSimple(): Promise<VehicleData[]> {
  const vehicles = await prisma.vehicle.findMany({
    take: 10,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      brand: true,
      model: true,
      type: true,
      plate_number: true,
      status: true,
      owner: true,
      created_at: true,
      inspection_date: true,
      project_id: true,
      project: {
        select: {
          id: true,
          name: true,
          client: {
            select: {
              id: true,
              name: true,
              location: {
                select: { id: true, address: true, created_at: true }
              }
            }
          }
        }
      }
    }
  });

  return vehicles.map((item) => ({
    id: item.id,
    brand: item.brand,
    model: item.model,
    type: item.type,
    plate_number: item.plate_number,
    status: item.status as "OPERATIONAL" | "NON_OPERATIONAL",
    owner: item.owner,
    created_at: item.created_at,
    inspection_date: item.inspection_date,
    project: item.project,
  }));
}

/**
 * Fetch recent maintenance reports - SIMPLE VERSION (no deep joins)
 */
async function fetchMaintenanceReportsSimple(): Promise<MaintenanceReportData[]> {
  const reports = await prisma.maintenance_equipment_report.findMany({
    take: 10,
    orderBy: { date_reported: 'desc' },
    select: {
      id: true,
      issue_description: true,
      status: true,
      priority: true,
      date_reported: true,
      created_at: true,
      equipment_id: true,
      location_id: true,
      equipment: {
        select: {
          id: true,
          brand: true,
          model: true,
          type: true,
          project: {
            select: {
              id: true,
              name: true,
              client: {
                select: {
                  id: true,
                  name: true,
                  location: {
                    select: { id: true, address: true }
                  }
                }
              }
            }
          }
        }
      },
      location: {
        select: { id: true, address: true, created_at: true }
      }
    }
  });

  return reports.map((item) => ({
    id: item.id,
    issue_description: item.issue_description || "",
    status: (item.status || "REPORTED") as
      | "REPORTED"
      | "IN_PROGRESS"
      | "COMPLETED",
    priority: (item.priority || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH",
    date_reported: item.date_reported || item.created_at,
    created_at: item.created_at,
    equipment: item.equipment,
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
        not: null,
      },
    },
  });
}
import { getAllVehicles } from "@/app/actions/vehicle-actions";
import { prisma } from "@/lib/prisma";
import VehiclesList from "./VehiclesList";

export default async function VehiclesContainer() {
  // Server-side initial load with pagination + ALL reference data (masterpiece pattern)
  let initialVehicles = [];
  let initialProjects = [];
  let initialClients = [];
  let initialLocations = [];
  let initialUsers = [];
  let initialMaintenanceReports = [];
  let totalCount = 0;
  let error = null;

  // 🔥 RESPONSIVE: 6 on mobile, 12 on desktop (will be handled client-side)
  const ITEMS_PER_PAGE = 12;

  try {
    // Load paginated vehicles + all reference data + maintenance reports + total count
    const [vehiclesResult, projectsData, clientsData, locationsData, usersData, maintenanceReportsData, totalVehicleCount] = await Promise.all([
      prisma.vehicle.findMany({
        include: {
          project: {
            include: {
              client: {
                include: {
                  location: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              username: true,
              full_name: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        take: ITEMS_PER_PAGE, // 🔥 PAGINATED: First 12 vehicles
        skip: 0 // First page
      }),
      prisma.project.findMany({  // 🔑 ALL reference data
        include: {
          client: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.client.findMany({   // 🔑 ALL reference data
        include: {
          location: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.location.findMany({ // 🔑 ALL reference data
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.user.findMany({     // 🔑 ALL user reference data for maintenance reports
        select: {
          id: true,
          username: true,
          full_name: true,
          role: true,
        },
        where: {
          user_status: 'ACTIVE',   // Only active users
        },
        orderBy: {
          full_name: 'asc',
        },
      }),
      prisma.maintenance_vehicle_report.findMany({  // 🔑 ALL maintenance reports
        include: {
          vehicle: {
            select: {
              id: true,
              brand: true,
              model: true,
              plate_number: true,
            },
          },
          location: {
            select: {
              id: true,
              address: true,
            },
          },
          reported_user: {
            select: {
              full_name: true,
              username: true,
            },
          },
          repaired_user: {
            select: {
              full_name: true,
              username: true,
            },
          },
        },
        orderBy: {
          date_reported: 'desc',
        },
      }),
      prisma.vehicle.count()     // Total count for pagination
    ]);

    initialVehicles = vehiclesResult;
    initialProjects = projectsData;
    initialClients = clientsData;
    initialLocations = locationsData;
    initialUsers = usersData;
    initialMaintenanceReports = maintenanceReportsData;
    totalCount = totalVehicleCount;

  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load vehicles";
    console.error("Error loading vehicles:", err);
  }

  if (error) {
    return (
      <div className="text-red-500 p-4 border border-red-300 rounded">
        Error: {error}
      </div>
    );
  }

  return (
    <VehiclesList 
      initialVehicles={initialVehicles}
      initialProjects={initialProjects}
      initialClients={initialClients}
      initialLocations={initialLocations}
      initialUsers={initialUsers}
      initialMaintenanceReports={initialMaintenanceReports}
      totalCount={totalCount}
      itemsPerPage={ITEMS_PER_PAGE}
    />
  );
}
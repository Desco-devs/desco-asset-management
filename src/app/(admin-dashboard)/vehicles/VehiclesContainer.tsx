import { getAllVehicles } from "@/app/actions/vehicle-actions";
import { prisma } from "@/lib/prisma";
import VehiclesList from "./VehiclesList";

export default async function VehiclesContainer() {
  // Server-side initial load with pagination + ALL reference data (masterpiece pattern)
  let initialVehicles = [];
  let initialProjects = [];
  let initialClients = [];
  let initialLocations = [];
  let totalCount = 0;
  let error = null;

  // 🔥 RESPONSIVE: 6 on mobile, 12 on desktop (will be handled client-side)
  const ITEMS_PER_PAGE = 12;

  try {
    // Load paginated vehicles + all reference data + total count
    const [vehiclesResult, projectsData, clientsData, locationsData, totalVehicleCount] = await Promise.all([
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
      prisma.vehicle.count()     // Total count for pagination
    ]);

    initialVehicles = vehiclesResult;
    initialProjects = projectsData;
    initialClients = clientsData;
    initialLocations = locationsData;
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
      totalCount={totalCount}
      itemsPerPage={ITEMS_PER_PAGE}
    />
  );
}
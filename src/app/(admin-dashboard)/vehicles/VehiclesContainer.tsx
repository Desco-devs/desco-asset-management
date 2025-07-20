import { getAllVehicles } from "@/app/actions/vehicle-actions";
import { prisma } from "@/lib/prisma";
import VehiclesList from "./VehiclesList";

export default async function VehiclesContainer() {
  // Server-side initial load with ALL reference data (masterpiece pattern)
  let initialVehicles = [];
  let initialProjects = [];
  let initialClients = [];
  let initialLocations = [];
  let error = null;

  try {
    // Load vehicles with complete relations + all reference data
    const [vehiclesResult, projectsData, clientsData, locationsData] = await Promise.all([
      getAllVehicles(),
      prisma.project.findMany({
        include: {
          client: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.client.findMany({
        include: {
          location: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      }),
      prisma.location.findMany({
        orderBy: {
          created_at: 'desc',
        },
      }),
    ]);

    initialVehicles = vehiclesResult.data;
    initialProjects = projectsData;
    initialClients = clientsData;
    initialLocations = locationsData;

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
    />
  );
}
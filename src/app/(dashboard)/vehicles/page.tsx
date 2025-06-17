// app/vehicles/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import VehicleCards from "./vehicles-components/VehicleCards";

// API functions for fetching vehicle data
async function getVehicles() {
  // Try different possible endpoints
  let response;

  try {
    // First try the specific getall endpoint
    response = await fetch("/api/vehicles/getall");
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.log(
      "Failed to fetch from /api/vehicles/getall, trying alternatives..."
    );
  }

  try {
    // If that fails, try the main vehicles endpoint with a query parameter
    response = await fetch("/api/vehicles/all");
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.log(
      "Failed to fetch from /api/vehicles/all, trying alternatives..."
    );
  }

  try {
    // Try getting all vehicles from all projects
    // First get all projects, then get vehicles for each project
    const projectsResponse = await fetch("/api/projects/getall");
    if (!projectsResponse.ok) {
      // Try alternative projects endpoint
      const altProjectsResponse = await fetch("/api/projects");
      if (!altProjectsResponse.ok) {
        throw new Error("Failed to fetch projects");
      }
      const projects = await altProjectsResponse.json();
      return await fetchVehiclesFromProjects(projects);
    }
    const projects = await projectsResponse.json();
    return await fetchVehiclesFromProjects(projects);
  } catch (error) {
    console.error("Error in fallback vehicle fetching:", error);
    throw new Error("Failed to fetch vehicles from any available endpoint");
  }
}

// Helper function to fetch vehicles from multiple projects
async function fetchVehiclesFromProjects(projects: any[]) {
  const allVehicles: any[] = [];

  for (const project of projects) {
    try {
      const response = await fetch(`/api/vehicles?projectId=${project.uid}`);
      if (response.ok) {
        const vehicles = await response.json();
        allVehicles.push(...vehicles);
      }
    } catch (error) {
      console.error(
        `Failed to fetch vehicles for project ${project.uid}:`,
        error
      );
      // Continue with other projects even if one fails
    }
  }

  return allVehicles;
}

async function getClients() {
  try {
    const response = await fetch("/api/clients/getall");
    if (!response.ok) {
      // Try alternative endpoint
      const altResponse = await fetch("/api/clients");
      if (!altResponse.ok) {
        throw new Error("Failed to fetch clients");
      }
      return altResponse.json();
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching clients:", error);
    throw error;
  }
}

async function getLocations() {
  try {
    const response = await fetch("/api/locations/getall");
    if (!response.ok) {
      // Try alternative endpoint
      const altResponse = await fetch("/api/locations");
      if (!altResponse.ok) {
        throw new Error("Failed to fetch locations");
      }
      return altResponse.json();
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching locations:", error);
    throw error;
  }
}

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create a memoized fetch function that can be called to refresh data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching vehicle data...");

      const [vehiclesData, clientsData, locationsData] = await Promise.all([
        getVehicles(),
        getClients(),
        getLocations(),
      ]);

      console.log("Successfully fetched data:", {
        vehicles: vehiclesData?.length || 0,
        clients: clientsData?.length || 0,
        locations: locationsData?.length || 0,
      });

      setVehicles(vehiclesData || []);
      setClients(clientsData || []);
      setLocations(locationsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(
        error instanceof Error ? error.message : "An unknown error occurred"
      );

      // Set empty arrays as fallback
      setVehicles([]);
      setClients([]);
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to handle vehicle added - this will refresh the vehicle data
  const handleVehicleAdded = useCallback(async () => {
    try {
      console.log("Refreshing vehicle data after vehicle added...");
      // Only refresh vehicle data since clients and locations don't change
      const vehiclesData = await getVehicles();
      setVehicles(vehiclesData || []);
      console.log("Vehicle data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing vehicle data:", error);
      // Don't show error toast here as the operation (add/edit) was successful
      // Just log the error and keep the existing data
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="h-full container mx-auto py-[5dvh]">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading vehicles...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full container mx-auto py-[5dvh]">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Failed to Load Vehicle Data
            </h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchData}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full container mx-auto py-[5dvh]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vehicle Management</h1>
        <p className="text-muted-foreground">
          View and filter all vehicles across projects
        </p>
      </div>

      <VehicleCards
        vehicles={vehicles}
        clients={clients}
        locations={locations}
        onVehicleAdded={handleVehicleAdded}
      />
    </div>
  );
}
  
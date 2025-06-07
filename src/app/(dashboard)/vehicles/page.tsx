// app/vehicles/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import VehicleCards from "./vehicles-components/VehicleCards";

// API functions for fetching vehicle data
async function getVehicles() {
  const response = await fetch("/api/vehicles/getall");
  if (!response.ok) {
    throw new Error("Failed to fetch vehicles");
  }
  return response.json();
}

async function getClients() {
  const response = await fetch("/api/clients/getall");
  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }
  return response.json();
}

async function getLocations() {
  const response = await fetch("/api/locations/getall");
  if (!response.ok) {
    throw new Error("Failed to fetch locations");
  }
  return response.json();
}

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create a memoized fetch function that can be called to refresh data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [vehiclesData, clientsData, locationsData] = await Promise.all([
        getVehicles(),
        getClients(),
        getLocations(),
      ]);

      setVehicles(vehiclesData);
      setClients(clientsData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to handle vehicle added - this will refresh the vehicle data
  const handleVehicleAdded = useCallback(async () => {
    try {
      // Only refresh vehicle data since clients and locations don't change
      const vehiclesData = await getVehicles();
      setVehicles(vehiclesData);
    } catch (error) {
      console.error("Error refreshing vehicle data:", error);
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

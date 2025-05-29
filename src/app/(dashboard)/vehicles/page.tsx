// app/vehicles/page.tsx or wherever you want to use the component
"use client";

import { useState, useEffect } from "react";
import VehicleCards from "./vehicles-components/VehicleCards";

// API functions for fetching vehicle data
async function getVehicles() {
  const response = await fetch("/api/vehicles/getall");
  return response.json();
}

async function getClients() {
  const response = await fetch("/api/clients/getall");
  return response.json();
}

async function getLocations() {
  const response = await fetch("/api/locations/getall");
  return response.json();
}

export default function VehiclePage() {
  const [vehicles, setVehicles] = useState([]);
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
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
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading vehicles...</div>;
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
      />
    </div>
  );
}

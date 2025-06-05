// app/equipment/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import EquipmentCards from "./equip-components/Equipments";

// API functions
async function getEquipments() {
  const response = await fetch("/api/equipments/getall");
  if (!response.ok) {
    throw new Error("Failed to fetch equipments");
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

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create a memoized fetch function that can be called to refresh data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [equipmentsData, clientsData, locationsData] = await Promise.all([
        getEquipments(),
        getClients(),
        getLocations(),
      ]);

      setEquipments(equipmentsData);
      setClients(clientsData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to handle equipment added/updated - this will refresh the equipment data
  const handleEquipmentAdded = useCallback(async () => {
    try {
      // Only refresh equipment data since clients and locations don't change
      const equipmentsData = await getEquipments();
      setEquipments(equipmentsData);
    } catch (error) {
      console.error("Error refreshing equipment data:", error);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto py-[5dvh]">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading equipment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-[5dvh]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Equipment Management</h1>
        <p className="text-muted-foreground">
          View and filter all equipment across projects
        </p>
      </div>

      <EquipmentCards
        equipments={equipments}
        clients={clients}
        locations={locations}
        onEquipmentAdded={handleEquipmentAdded}
      />
    </div>
  );
}

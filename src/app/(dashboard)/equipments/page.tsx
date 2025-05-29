// app/equipment/page.tsx or wherever you want to use the component
"use client";

import { useState, useEffect } from "react";
import EquipmentCards from "./equip-components/Equipments";
// You'll need to create these API functions based on your backend setup
async function getEquipments() {
  // This should match your Prisma query with includes
  const response = await fetch("/api/equipments/getall");
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

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
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
    }

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6">Loading equipment...</div>;
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
      />
    </div>
  );
}

//locations/[locationId]/clients/[clientId]/projects/[projectId]/vehicles/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getVehiclesByProject } from "@/app/service/client/dynamicClients";
import AddVehicleModal from "@/app/(dashboard)/projects/modal/AddVehicleModal";

interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number;
  expiryDate: string;
  status: string;
  remarks?: string | null;
  owner: string;
  frontImgUrl?: string | null;
  backImgUrl?: string | null;
  side1ImgUrl?: string | null;
  side2ImgUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function VehiclesPage() {
  const { projectId } = useParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  async function loadVehicles() {
    if (!projectId || Array.isArray(projectId)) return;
    setLoading(true);
    try {
      const data = await getVehiclesByProject(projectId);
      setVehicles(data);
    } catch {
      toast.error("Failed to fetch vehicles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVehicles();
  }, [projectId]);

  return (
    <div className="p-6">
      <div className="flex justify-between mb-4 items-center">
        <h1 className="text-2xl font-semibold">
          Vehicles for Project{" "}
          <span className="text-muted-foreground">{projectId}</span>
        </h1>
        <Button onClick={() => setAddOpen(true)}>Add Vehicle</Button>
      </div>

      {loading ? (
        <p>Loading vehicles...</p>
      ) : vehicles.length === 0 ? (
        <p className="text-muted-foreground">No vehicles found.</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">Brand</th>
              <th className="p-2">Model</th>
              <th className="p-2">Type</th>
              <th className="p-2">Plate Number</th>
              <th className="p-2">Inspection Date</th>
              <th className="p-2">Before (months)</th>
              <th className="p-2">Expiry Date</th>
              <th className="p-2">Status</th>
              <th className="p-2">Owner</th>
              <th className="p-2">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.uid} className="border-t">
                <td className="p-2">{v.brand}</td>
                <td className="p-2">{v.model}</td>
                <td className="p-2">{v.type}</td>
                <td className="p-2">{v.plateNumber}</td>
                <td className="p-2">
                  {new Date(v.inspectionDate).toLocaleDateString()}
                </td>
                <td className="p-2">{v.before}</td>
                <td className="p-2">
                  {new Date(v.expiryDate).toLocaleDateString()}
                </td>
                <td className="p-2">{v.status}</td>
                <td className="p-2">{v.owner}</td>
                <td className="p-2">{v.remarks ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <AddVehicleModal
        isOpen={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId as string}
        onCreated={loadVehicles}
      />
    </div>
  );
}

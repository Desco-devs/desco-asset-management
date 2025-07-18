"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase";
import { AssetsClientViewerProps, Equipment, Vehicle } from "@/types/assets";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import EquipmentClientViewer from "./asset-components/EquipmentsClient";
import VehicleClientViewer from "./asset-components/VehiclesClient";

const AssetsClientViewer = ({
  initialEquipment,
  initialVehicles,
  initialClients,
  initialLocations,
  initialProjects,
}: AssetsClientViewerProps) => {
  const [viewMode, setViewMode] = useState<"equipment" | "vehicles">(
    "equipment"
  );
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    // Simulate loading delay for better UX
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Subscribe to equipment table changes
    const equipmentChannel = supabase
      .channel("realtime-equipment")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        async (payload) => {
          console.log("Equipment change received:", payload);

          if (payload.eventType === "INSERT") {
            // For INSERT, create a basic equipment object and add it to the list
            const newEquipment: Equipment = {
              uid: payload.new.uid,
              brand: payload.new.brand || "Unknown",
              model: payload.new.model || "Unknown",
              type: payload.new.type || "Unknown",
              insuranceExpirationDate:
                payload.new.insuranceExpirationDate || "",
              status: payload.new.status || "OPERATIONAL",
              remarks: payload.new.remarks || undefined,
              owner: payload.new.owner || "Unknown",
              image_url: payload.new.image_url || undefined,
              inspectionDate: payload.new.inspectionDate || undefined,
              plateNumber: payload.new.plateNumber || undefined,
              originalReceiptUrl: payload.new.originalReceiptUrl || undefined,
              equipmentRegistrationUrl:
                payload.new.equipmentRegistrationUrl || undefined,
              thirdpartyInspectionImage:
                payload.new.thirdpartyInspectionImage || undefined,
              pgpcInspectionImage: payload.new.pgpcInspectionImage || undefined,
              project: {
                uid: "temp",
                name: "Loading...",
                client: {
                  uid: "temp",
                  name: "Loading...",
                  location: {
                    uid: "temp",
                    address: "Loading...",
                  },
                },
              },
            };

            setEquipment((prev) => [newEquipment, ...prev]);
            setNewItemIds((prev) => new Set([...prev, newEquipment.uid]));

            toast.success(
              `New equipment added: ${newEquipment.brand} ${newEquipment.model}`,
              {
                description: `${newEquipment.type} - Loading project information...`,
                duration: 5000,
              }
            );

            // Fetch complete data in the background and update
            try {
              const response = await fetch(
                `/api/equipments/${payload.new.uid}`
              );
              if (response.ok) {
                const completeEquipment = await response.json();
                setEquipment((prev) =>
                  prev.map((item) =>
                    item.uid === completeEquipment.uid
                      ? completeEquipment
                      : item
                  )
                );
              }
            } catch (error) {
              console.error("Error fetching complete equipment data:", error);
            }
          } else if (payload.eventType === "UPDATE") {
            // For UPDATE, update the basic fields immediately
            setEquipment((prev) =>
              prev.map((item) => {
                if (item.uid === payload.new.uid) {
                  return {
                    ...item,
                    brand: payload.new.brand || item.brand,
                    model: payload.new.model || item.model,
                    type: payload.new.type || item.type,
                    insuranceExpirationDate:
                      payload.new.insuranceExpirationDate ||
                      item.insuranceExpirationDate,
                    status: payload.new.status || item.status,
                    remarks: payload.new.remarks || item.remarks,
                    owner: payload.new.owner || item.owner,
                    image_url: payload.new.image_url || item.image_url,
                    inspectionDate:
                      payload.new.inspectionDate || item.inspectionDate,
                    plateNumber: payload.new.plateNumber || item.plateNumber,
                    originalReceiptUrl:
                      payload.new.originalReceiptUrl || item.originalReceiptUrl,
                    equipmentRegistrationUrl:
                      payload.new.equipmentRegistrationUrl ||
                      item.equipmentRegistrationUrl,
                    thirdpartyInspectionImage:
                      payload.new.thirdpartyInspectionImage ||
                      item.thirdpartyInspectionImage,
                    pgpcInspectionImage:
                      payload.new.pgpcInspectionImage ||
                      item.pgpcInspectionImage,
                  };
                }
                return item;
              })
            );

            toast.info(
              `Equipment updated: ${payload.new.brand} ${payload.new.model}`,
              {
                description: "Equipment information has been updated",
                duration: 3000,
              }
            );

            // Fetch complete data in the background and update if needed
            try {
              const response = await fetch(
                `/api/equipments/${payload.new.uid}`
              );
              if (response.ok) {
                const completeEquipment = await response.json();
                setEquipment((prev) =>
                  prev.map((item) =>
                    item.uid === completeEquipment.uid
                      ? completeEquipment
                      : item
                  )
                );
              }
            } catch (error) {
              console.error("Error fetching complete equipment data:", error);
            }
          } else if (payload.eventType === "DELETE") {
            setEquipment((prev) =>
              prev.filter((item) => item.uid !== payload.old.uid)
            );
            setNewItemIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(payload.old.uid);
              return newSet;
            });
            toast.error("Equipment deleted", {
              description: "Equipment has been removed",
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    // Subscribe to vehicle table changes
    const vehicleChannel = supabase
      .channel("realtime-vehicles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicle" },
        async (payload) => {
          console.log("Vehicle change received:", payload);

          if (payload.eventType === "INSERT") {
            // For INSERT, create a basic vehicle object and add it to the list
            const newVehicle: Vehicle = {
              uid: payload.new.uid,
              brand: payload.new.brand || "Unknown",
              model: payload.new.model || "Unknown",
              type: payload.new.type || "Unknown",
              plateNumber: payload.new.plateNumber || "Unknown",
              inspectionDate: payload.new.inspectionDate || "",
              before: payload.new.before || 0,
              expiryDate: payload.new.expiryDate || "",
              status: payload.new.status || "OPERATIONAL",
              remarks: payload.new.remarks || undefined,
              owner: payload.new.owner || "Unknown",
              frontImgUrl: payload.new.frontImgUrl || undefined,
              backImgUrl: payload.new.backImgUrl || undefined,
              side1ImgUrl: payload.new.side1ImgUrl || undefined,
              side2ImgUrl: payload.new.side2ImgUrl || undefined,
              originalReceiptUrl: payload.new.originalReceiptUrl || undefined,
              carRegistrationUrl: payload.new.carRegistrationUrl || undefined,
              project: {
                uid: "temp",
                name: "Loading...",
                client: {
                  uid: "temp",
                  name: "Loading...",
                  location: {
                    uid: "temp",
                    address: "Loading...",
                  },
                },
              },
            };

            setVehicles((prev) => [newVehicle, ...prev]);
            setNewItemIds((prev) => new Set([...prev, newVehicle.uid]));

            toast.success(
              `New vehicle added: ${newVehicle.brand} ${newVehicle.model}`,
              {
                description: `${newVehicle.type} - ${newVehicle.plateNumber} - Loading project information...`,
                duration: 5000,
              }
            );

            // Fetch complete data in the background and update
            try {
              const response = await fetch(`/api/vehicles/${payload.new.uid}`);
              if (response.ok) {
                const completeVehicle = await response.json();
                setVehicles((prev) =>
                  prev.map((item) =>
                    item.uid === completeVehicle.uid ? completeVehicle : item
                  )
                );
              }
            } catch (error) {
              console.error("Error fetching complete vehicle data:", error);
            }
          } else if (payload.eventType === "UPDATE") {
            // For UPDATE, update the basic fields immediately
            setVehicles((prev) =>
              prev.map((item) => {
                if (item.uid === payload.new.uid) {
                  return {
                    ...item,
                    brand: payload.new.brand || item.brand,
                    model: payload.new.model || item.model,
                    type: payload.new.type || item.type,
                    plateNumber: payload.new.plateNumber || item.plateNumber,
                    inspectionDate:
                      payload.new.inspectionDate || item.inspectionDate,
                    before: payload.new.before || item.before,
                    expiryDate: payload.new.expiryDate || item.expiryDate,
                    status: payload.new.status || item.status,
                    remarks: payload.new.remarks || item.remarks,
                    owner: payload.new.owner || item.owner,
                    frontImgUrl: payload.new.frontImgUrl || item.frontImgUrl,
                    backImgUrl: payload.new.backImgUrl || item.backImgUrl,
                    side1ImgUrl: payload.new.side1ImgUrl || item.side1ImgUrl,
                    side2ImgUrl: payload.new.side2ImgUrl || item.side2ImgUrl,
                    originalReceiptUrl:
                      payload.new.originalReceiptUrl || item.originalReceiptUrl,
                    carRegistrationUrl:
                      payload.new.carRegistrationUrl || item.carRegistrationUrl,
                  };
                }
                return item;
              })
            );

            toast.info(
              `Vehicle updated: ${payload.new.brand} ${payload.new.model}`,
              {
                description: "Vehicle information has been updated",
                duration: 3000,
              }
            );

            // Fetch complete data in the background and update if needed
            try {
              const response = await fetch(`/api/vehicles/${payload.new.uid}`);
              if (response.ok) {
                const completeVehicle = await response.json();
                setVehicles((prev) =>
                  prev.map((item) =>
                    item.uid === completeVehicle.uid ? completeVehicle : item
                  )
                );
              }
            } catch (error) {
              console.error("Error fetching complete vehicle data:", error);
            }
          } else if (payload.eventType === "DELETE") {
            setVehicles((prev) =>
              prev.filter((item) => item.uid !== payload.old.uid)
            );
            setNewItemIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(payload.old.uid);
              return newSet;
            });
            toast.error("Vehicle deleted", {
              description: "Vehicle has been removed",
              duration: 3000,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(vehicleChannel);
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen w-full md:py-0 py-[15dvh] md:max-w-[80dvw] max-w-[85dvw] mx-auto flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading assets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full md:py-[10dvh] py-[15dvh] md:max-w-[80dvw] max-w-[85dvw] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 z-40">
        <div>
          <h1 className="text-3xl font-bold">Assets Viewer</h1>
          <p className="text-muted-foreground">
            View and filter all{" "}
            {viewMode === "equipment" ? "equipment" : "vehicles"} across
            projects
          </p>
        </div>

        <div className="w-full sm:w-auto">
          <Select
            value={viewMode}
            onValueChange={(value: "equipment" | "vehicles") =>
              setViewMode(value)
            }
          >
            <SelectTrigger className="sm:w-[180px] w-full">
              <SelectValue placeholder="Select view mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="vehicles">Vehicles</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {viewMode === "equipment" ? (
        <EquipmentClientViewer
          equipment={equipment}
          clients={initialClients}
          locations={initialLocations}
          projects={initialProjects}
          newItemIds={newItemIds}
        />
      ) : (
        <VehicleClientViewer
          vehicles={vehicles}
          clients={initialClients}
          locations={initialLocations}
          projects={initialProjects}
          newItemIds={newItemIds}
        />
      )}
    </div>
  );
};

export default AssetsClientViewer;

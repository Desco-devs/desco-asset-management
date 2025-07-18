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
  totalEquipmentCount,
  totalVehicleCount,
}: AssetsClientViewerProps) => {
  const [viewMode, setViewMode] = useState<"equipment" | "vehicles">(
    "equipment"
  );
  const [loading, setLoading] = useState(true);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());

  const supabase = createClient();

  // Debug: Log the initial data (removed for cleaner debugging)

  useEffect(() => {
    // Simulate loading delay for better UX
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Subscribe to equipment table changes
    const equipmentChannel = supabase
      .channel("equipment-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const brand = payload.new.brand || "Unknown Brand";
            const model = payload.new.model || "Unknown Model";
            const equipmentId = payload.new.id;

            toast.success(`New Equipment Added`, {
              description: `${brand} ${model} has been successfully added to the system`,
              duration: 5000,
            });

            // Find the actual project from the existing projects data
            const project = initialProjects.find(p => p.uid === payload.new.project_id);
            
            // Find the client with location data
            const client = project ? initialClients.find(c => c.uid === project.client.uid) : null;
            
            // Create equipment object with realtime data
            const newEquipment: Equipment = {
              uid: equipmentId,
              brand: brand,
              model: model,
              type: payload.new.type || "Unknown Type",
              insuranceExpirationDate: payload.new.insurance_expiration_date
                ? new Date(payload.new.insurance_expiration_date).toISOString()
                : "",
              status: payload.new.status || "OPERATIONAL",
              remarks: payload.new.remarks || undefined,
              owner: payload.new.owner || "Unknown Owner",
              image_url: payload.new.image_url || undefined,
              inspectionDate: payload.new.inspection_date
                ? new Date(payload.new.inspection_date).toISOString()
                : undefined,
              plateNumber: payload.new.plate_number || undefined,
              originalReceiptUrl: payload.new.original_receipt_url || undefined,
              equipmentRegistrationUrl:
                payload.new.equipment_registration_url || undefined,
              thirdpartyInspectionImage:
                payload.new.thirdparty_inspection_image || undefined,
              pgpcInspectionImage:
                payload.new.pgpc_inspection_image || undefined,
              project: project && client ? {
                uid: project.uid,
                name: project.name,
                client: {
                  uid: client.uid,
                  name: client.name,
                  location: {
                    uid: client.location.uid,
                    address: client.location.address,
                  },
                },
              } : {
                uid: "unknown-project-id",
                name: "Unknown Project",
                client: {
                  uid: "unknown-client-id",
                  name: "Unknown Client",
                  location: {
                    uid: "unknown-location-id",
                    address: "Unknown Location",
                  },
                },
              },
            };

            setEquipment((prev) => [newEquipment, ...prev]);
            setNewItemIds((prev) => new Set([...prev, equipmentId]));
          } else if (payload.eventType === "UPDATE") {
            setEquipment((prev) =>
              prev.map((item) => {
                if (item.uid === payload.new.id) {
                  return {
                    ...item,
                    brand: payload.new.brand || item.brand,
                    model: payload.new.model || item.model,
                    type: payload.new.type || item.type,
                    insuranceExpirationDate: payload.new
                      .insurance_expiration_date
                      ? new Date(
                          payload.new.insurance_expiration_date
                        ).toISOString()
                      : item.insuranceExpirationDate,
                    status: payload.new.status || item.status,
                    remarks: payload.new.remarks || item.remarks,
                    owner: payload.new.owner || item.owner,
                    image_url: payload.new.image_url || item.image_url,
                    inspectionDate: payload.new.inspection_date
                      ? new Date(payload.new.inspection_date).toISOString()
                      : item.inspectionDate,
                    plateNumber: payload.new.plate_number || item.plateNumber,
                    originalReceiptUrl:
                      payload.new.original_receipt_url ||
                      item.originalReceiptUrl,
                    equipmentRegistrationUrl:
                      payload.new.equipment_registration_url ||
                      item.equipmentRegistrationUrl,
                    thirdpartyInspectionImage:
                      payload.new.thirdparty_inspection_image ||
                      item.thirdpartyInspectionImage,
                    pgpcInspectionImage:
                      payload.new.pgpc_inspection_image ||
                      item.pgpcInspectionImage,
                  };
                }
                return item;
              })
            );

            toast.info(`Equipment Updated`, {
              description: `${payload.new.brand} ${payload.new.model} information has been updated`,
              duration: 3000,
            });
          } else if (payload.eventType === "DELETE") {
            setEquipment((prev) =>
              prev.filter((item) => item.uid !== payload.old.id)
            );
            setNewItemIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(payload.old.id);
              return newSet;
            });
            toast.error("Equipment Removed", {
              description:
                "Equipment has been successfully removed from the system",
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
        { event: "*", schema: "public", table: "vehicles" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const brand = payload.new.brand || "Unknown Brand";
            const model = payload.new.model || "Unknown Model";
            const vehicleId = payload.new.id;

            toast.success(`New Vehicle Added`, {
              description: `${brand} ${model} has been successfully added to the system`,
              duration: 5000,
            });

            // Find the actual project from the existing projects data
            const project = initialProjects.find(p => p.uid === payload.new.project_id);
            
            // Find the client with location data
            const client = project ? initialClients.find(c => c.uid === project.client.uid) : null;
            
            // Create vehicle object with realtime data
            const newVehicle: Vehicle = {
              uid: vehicleId,
              brand: brand,
              model: model,
              type: payload.new.type || "Unknown Type",
              plateNumber: payload.new.plate_number || "",
              inspectionDate: payload.new.inspection_date
                ? new Date(payload.new.inspection_date).toISOString()
                : "",
              before: payload.new.before || 0,
              expiryDate: payload.new.expiry_date
                ? new Date(payload.new.expiry_date).toISOString()
                : "",
              status: payload.new.status || "OPERATIONAL",
              remarks: payload.new.remarks || undefined,
              owner: payload.new.owner || "Unknown Owner",
              frontImgUrl: payload.new.front_img_url || undefined,
              backImgUrl: payload.new.back_img_url || undefined,
              side1ImgUrl: payload.new.side1_img_url || undefined,
              side2ImgUrl: payload.new.side2_img_url || undefined,
              originalReceiptUrl: payload.new.original_receipt_url || undefined,
              carRegistrationUrl: payload.new.car_registration_url || undefined,
              project: project && client ? {
                uid: project.uid,
                name: project.name,
                client: {
                  uid: client.uid,
                  name: client.name,
                  location: {
                    uid: client.location.uid,
                    address: client.location.address,
                  },
                },
              } : {
                uid: "unknown-project-id",
                name: "Unknown Project",
                client: {
                  uid: "unknown-client-id",
                  name: "Unknown Client",
                  location: {
                    uid: "unknown-location-id",
                    address: "Unknown Location",
                  },
                },
              },
            };

            setVehicles((prev) => [newVehicle, ...prev]);
            setNewItemIds((prev) => new Set([...prev, vehicleId]));
          } else if (payload.eventType === "UPDATE") {
            setVehicles((prev) =>
              prev.map((item) => {
                if (item.uid === payload.new.id) {
                  return {
                    ...item,
                    brand: payload.new.brand || item.brand,
                    model: payload.new.model || item.model,
                    type: payload.new.type || item.type,
                    plateNumber: payload.new.plate_number || item.plateNumber,
                    inspectionDate: payload.new.inspection_date
                      ? new Date(payload.new.inspection_date).toISOString()
                      : item.inspectionDate,
                    before: payload.new.before || item.before,
                    expiryDate: payload.new.expiry_date
                      ? new Date(payload.new.expiry_date).toISOString()
                      : item.expiryDate,
                    status: payload.new.status || item.status,
                    remarks: payload.new.remarks || item.remarks,
                    owner: payload.new.owner || item.owner,
                    frontImgUrl: payload.new.front_img_url || item.frontImgUrl,
                    backImgUrl: payload.new.back_img_url || item.backImgUrl,
                    side1ImgUrl: payload.new.side1_img_url || item.side1ImgUrl,
                    side2ImgUrl: payload.new.side2_img_url || item.side2ImgUrl,
                    originalReceiptUrl:
                      payload.new.original_receipt_url ||
                      item.originalReceiptUrl,
                    carRegistrationUrl:
                      payload.new.car_registration_url ||
                      item.carRegistrationUrl,
                  };
                }
                return item;
              })
            );

            toast.info(`Vehicle Updated`, {
              description: `${payload.new.brand} ${payload.new.model} information has been updated`,
              duration: 3000,
            });
          } else if (payload.eventType === "DELETE") {
            setVehicles((prev) =>
              prev.filter((item) => item.uid !== payload.old.id)
            );
            setNewItemIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(payload.old.id);
              return newSet;
            });
            toast.error("Vehicle Removed", {
              description:
                "Vehicle has been successfully removed from the system",
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
  }, [supabase, initialProjects, initialClients]);

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
          totalEquipmentCount={totalEquipmentCount}
        />
      ) : (
        <VehicleClientViewer
          vehicles={vehicles}
          clients={initialClients}
          locations={initialLocations}
          projects={initialProjects}
          newItemIds={newItemIds}
          totalVehicleCount={totalVehicleCount}
        />
      )}
    </div>
  );
};

export default AssetsClientViewer;

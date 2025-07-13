"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EquipmentViewer from "./asset-components/Equipments";
import VehicleViewer from "./asset-components/Vehicles";

interface AssetsPageProps {}

const AssetsPage = ({}: AssetsPageProps) => {
  const [viewMode, setViewMode] = useState<"equipment" | "vehicles">(
    "equipment"
  );
  const [loading, setLoading] = useState(true);

  // Simulate loading delay for better UX
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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

      {viewMode === "equipment" ? <EquipmentViewer /> : <VehicleViewer />}
    </div>
  );
};

export default AssetsPage;

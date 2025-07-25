"use client";

import EditVehicleDrawer from "./EditVehicleDrawer";
import {
  selectIsEditMode,
  selectSelectedVehicle,
  useVehiclesStore,
} from "@/stores/vehiclesStore";

export default function EditVehicleModalModern() {
  // Client state from Zustand
  const selectedVehicle = useVehiclesStore(selectSelectedVehicle);
  const isEditMode = useVehiclesStore(selectIsEditMode);

  if (!selectedVehicle || !isEditMode) {
    return null;
  }

  return <EditVehicleDrawer />;
}
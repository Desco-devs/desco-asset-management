"use client";

import EditEquipmentDrawer from "./EditEquipmentDrawer";
import {
  selectIsEditMode,
  selectSelectedEquipment,
  useEquipmentsStore,
} from "@/stores/equipmentsStore";

export default function EditEquipmentModalModern() {
  // Client state from Zustand
  const selectedEquipment = useEquipmentsStore(selectSelectedEquipment);
  const isEditMode = useEquipmentsStore(selectIsEditMode);

  if (!selectedEquipment || !isEditMode) {
    return null;
  }

  return <EditEquipmentDrawer />;
}
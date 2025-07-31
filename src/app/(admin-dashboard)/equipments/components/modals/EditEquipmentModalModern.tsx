"use client";

import EditEquipmentDrawer from "./EditEquipmentDrawer";
import {
  selectIsEditMode,
  selectSelectedEquipment,
  useEquipmentStore,
} from "@/stores/equipmentStore";

export default function EditEquipmentModalModern() {
  // Client state from Zustand
  const selectedEquipment = useEquipmentStore(selectSelectedEquipment);
  const isEditMode = useEquipmentStore(selectIsEditMode);

  if (!selectedEquipment || !isEditMode) {
    return null;
  }

  return <EditEquipmentDrawer />;
}
"use client";

import type { EquipmentFolder, EquipmentPart } from "@/types/equipment-parts";
import EquipmentPartsManager from "@/app/(dashboard)/equipments/equip-components/EquipmentPartsManager";

interface EquipmentPartsSectionProps {
  equipmentParts: EquipmentPart[];
  setEquipmentParts: React.Dispatch<React.SetStateAction<EquipmentPart[]>>;
  equipmentFolders: EquipmentFolder[];
  setEquipmentFolders: React.Dispatch<React.SetStateAction<EquipmentFolder[]>>;
}

export function EquipmentPartsSection({
  equipmentParts,
  setEquipmentParts,
  equipmentFolders,
  setEquipmentFolders,
}: EquipmentPartsSectionProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Equipment Parts</h3>
      <EquipmentPartsManager
        equipmentParts={equipmentParts}
        setEquipmentParts={setEquipmentParts}
        equipmentFolders={equipmentFolders}
        setEquipmentFolders={setEquipmentFolders}
      />
    </div>
  );
}
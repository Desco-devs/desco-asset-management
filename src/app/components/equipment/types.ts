// Equipment Form Types and Interfaces

export interface EquipmentFile {
  file: File | null;
  preview?: string;
}

export interface Project {
  id: string;
  name: string;
  client: {
    id: string;
    name: string;
    location: {
      id: string;
      address: string;
    };
  };
}

export interface EquipmentFormData {
  brand: string;
  model: string;
  type: string;
  owner: string;
  projectId: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks: string;
  plateNumber: string;
  inspectionDate: string;
  insuranceExpirationDate: string;
  before: string;
}

export interface EquipmentFiles {
  image: EquipmentFile;
  originalReceipt: EquipmentFile;
  equipmentRegistration: EquipmentFile;
  thirdpartyInspection: EquipmentFile;
  pgpcInspection: EquipmentFile;
}

export interface EquipmentFormProps {
  trigger?: React.ReactNode;
  onEquipmentAdded?: () => void;
  mode?: 'create' | 'edit';
  title?: string;
  description?: string;
  initialData?: Partial<EquipmentFormData>;
  showFullFeatures?: boolean; // For enabling/disabling advanced features like parts management
}

export interface EquipmentFormDialogProps extends EquipmentFormProps {
  // Additional props specific to dialog wrapper
}
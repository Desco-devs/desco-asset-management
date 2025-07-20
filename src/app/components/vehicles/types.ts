// Vehicle Form Types and Interfaces

export interface VehicleFile {
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

export interface VehicleFormData {
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  owner: string;
  projectId: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks: string;
  inspectionDate: string;
  expiryDate: string;
  before: string;
}

export interface VehicleFiles {
  front: VehicleFile;
  back: VehicleFile;
  side1: VehicleFile;
  side2: VehicleFile;
  originalReceipt: VehicleFile;
  carRegistration: VehicleFile;
  pgpcInspection: VehicleFile;
}

export interface VehicleFormProps {
  trigger?: React.ReactNode;
  onVehicleAdded?: () => void;
  mode?: 'create' | 'edit';
  title?: string;
  description?: string;
  initialData?: Partial<VehicleFormData>;
  showFullFeatures?: boolean; // For enabling/disabling advanced features like document uploads
}

export interface VehicleFormDialogProps extends VehicleFormProps {
  // Dialog-specific props
  className?: string;
}
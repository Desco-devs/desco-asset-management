// Equipment-related types and interfaces

export type Status = "OPERATIONAL" | "NON_OPERATIONAL";

export interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number;
  expiryDate: string;
  status: Status;
  remarks?: string;
  owner: string;
  frontImgUrl?: string;
  backImgUrl?: string;
  side1ImgUrl?: string;
  side2ImgUrl?: string;
  originalReceiptUrl?: string;
  carRegistrationUrl?: string;
  project: {
    uid: string;
    name: string;
    client: {
      uid: string;
      name: string;
      location: {
        uid: string;
        address: string;
      };
    };
  };
}

export interface Location {
  uid: string;
  address: string;
  created_at?: string;
  updated_at?: string;
}

export interface Client {
  uid: string;
  name: string;
  locationId?: string;
  location?: {
    uid: string;
    address: string;
  };
}

export interface Project {
  uid: string;
  name: string;
  clientId: string;
  client: {
    uid: string;
    name: string;
    location: {
      uid: string;
      address: string;
    };
  };
}

export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate?: string;
  registrationExpiry?: string;
  before?: number;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
  plateNumber?: string;
  originalReceiptUrl?: string;
  equipmentRegistrationUrl?: string;
  thirdpartyInspectionImage?: string;
  pgpcInspectionImage?: string;
  equipmentParts?: string[];
  created_at?: string;
  created_by?: string;
  project: {
    uid: string;
    name: string;
    client: {
      uid: string;
      name: string;
      location: {
        uid: string;
        address: string;
      };
    };
  };
}

export interface EquipmentFormData {
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate: Date | undefined;
  registrationExpiry: Date | undefined;
  before: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks: string;
  owner: string;
  plateNumber: string;
  inspectionDate: Date | undefined;
  projectId: string;
}

export interface AddEquipmentModalProps {
  onEquipmentAdded: () => void;
  editEquipment?: Equipment | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export interface FileUploadState {
  file: File | null;
  preview: string | null;
  keepExisting: boolean;
}

export interface FileState {
  file: File | null;
  keep: boolean;
}

export interface FilesState {
  image: FileState;
  receipt: FileState;
  registration: FileState;
  thirdpartyInspection: FileState;
  pgpcInspection: FileState;
}

export interface AddEquipmentModalProps {
  onEquipmentAdded: () => void;
  editEquipment?: Equipment | null;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
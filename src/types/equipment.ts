// Equipment Types - Clean and Simple
// Based on Prisma schema for perfect alignment

export type Status = "OPERATIONAL" | "NON_OPERATIONAL";

// Core Equipment Interface - Matches Prisma Schema exactly
export interface Equipment {
  id: string;
  brand: string;
  model: string;
  type: string;
  insurance_expiration_date: string | null;
  registration_expiry: string | null;
  before: number | null;
  status: Status;
  remarks: string | null;
  owner: string;
  image_url: string | null;
  inspection_date: string | null;
  project_id: string;
  plate_number: string | null;
  original_receipt_url: string | null;
  equipment_registration_url: string | null;
  thirdparty_inspection_image: string | null;
  pgpc_inspection_image: string | null;
  equipment_parts: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  
  // Relations
  project: Project;
  maintenance_reports?: MaintenanceReport[];
}

// Related Types
export interface Project {
  id: string;
  name: string;
  client: Client;
}

export interface Client {
  id: string;
  name: string;
  location: Location;
}

export interface Location {
  id: string;
  address: string;
}

export interface MaintenanceReport {
  id: string;
  equipment_id: string;
  location_id: string;
  issue_description: string;
  remarks: string | null;
  inspection_details: string | null;
  action_taken: string | null;
  parts_replaced: string[];
  priority: string | null;
  status: string | null;
  downtime_hours: string | null;
  date_reported: string;
  date_repaired: string | null;
  attachment_urls: string[];
  reported_by: string | null;
  repaired_by: string | null;
  created_at: string;
  updated_at: string;
}

// API Response Types
export interface EquipmentResponse {
  data: Equipment[];
  total: number;
  user_role: string;
  permissions: {
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
}


// Vehicle interface (keeping existing for compatibility)
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
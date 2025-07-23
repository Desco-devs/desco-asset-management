export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate: string;
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

export interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number;
  expiryDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
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

export interface Client {
  uid: string;
  name: string;
  location: {
    uid: string;
    address: string;
  } | null;
}

export interface Location {
  uid: string;
  address: string;
}

export interface Project {
  uid: string;
  name: string;
  client: {
    uid: string;
    name: string;
  };
}

export interface FilterState {
  selectedClient: string;
  selectedLocation: string;
  selectedProject: string;
  selectedStatus: string;
  searchQuery: string;
}

export interface FilterProps {
  clients: Client[];
  locations: Location[];
  projects: Project[];
  filterState: FilterState;
  onFilterChange: (field: keyof FilterState, value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultsCount: number;
  totalCount: number;
}

export interface AssetsClientViewerProps {
  initialEquipment: Equipment[];
  initialVehicles: Vehicle[];
  initialClients: Client[];
  initialLocations: Location[];
  initialProjects: Project[];
  totalEquipmentCount: number;
  totalVehicleCount: number;
}

export interface AssetsPageData {
  equipment: EquipmentWithRelations[];
  vehicles: VehicleWithRelations[];
  locations: Location[];
  clients: Client[];
  projects: Project[];
  equipmentCount: number;
  vehicleCount: number;
}

export interface EquipmentWithRelations {
  id: string;
  brand: string;
  model: string;
  type: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  serialNumber?: string;
  category?: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    client?: {
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      location?: {
        id: string;
        address: string;
        createdAt: string;
        updatedAt: string;
      } | null;
    } | null;
  } | null;
}

export interface VehicleWithRelations {
  id: string;
  make?: string;
  brand: string;
  model: string;
  category?: string;
  type: string;
  licensePlate?: string;
  plate_number: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  owner: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    client?: {
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      location?: {
        id: string;
        address: string;
        createdAt: string;
        updatedAt: string;
      } | null;
    } | null;
  } | null;
}
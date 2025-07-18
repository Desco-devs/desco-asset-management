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
  };
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
}
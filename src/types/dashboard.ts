// Dashboard Types
export interface EquipmentVehicleCounts {
  OPERATIONAL: number;
  NON_OPERATIONAL: number;
}

export interface AssetCounts {
  equipment: EquipmentVehicleCounts;
  vehicles: EquipmentVehicleCounts;
}

export interface GrowthMetrics {
  newClientsThisWeek: number;
  newProjectsThisWeek: number;
  newEquipmentThisWeek: number;
  newVehiclesThisWeek: number;
}

export interface StatsData {
  locations: number;
  clients: number;
  projects: number;
  vehicles: { total: number; operational: number; nonOperational: number };
  equipment: { total: number; operational: number; nonOperational: number };
  maintenanceReports: { total: number; pending: number; inProgress: number };
  growth: GrowthMetrics;
}

export interface DetailedData {
  locations: LocationData[];
  clients: ClientData[];
  projects: ProjectData[];
  equipment: EquipmentData[];
  vehicles: VehicleData[];
  maintenanceReports: MaintenanceReportData[];
}

export interface ActivityItem {
  id: string;
  type: 'equipment' | 'vehicle' | 'project' | 'client' | 'maintenance';
  action: 'created' | 'updated' | 'reported';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  priority?: string;
}

// Prisma result types (simplified)
export interface LocationData {
  id: string
  address: string
  created_at: Date
  clients?: { id: string; name: string }[]
  user: { full_name: string } | null   // ✅ allow null
}


export interface ClientData {
  id: string;
  name: string;
  created_at: Date;
  location?: { id: string; address: string; created_at: Date };
  projects?: { id: string }[];
}

export interface ProjectData {
  id: string;
  name: string;
  created_at: Date;
  client?: {
    name: string;
    location?: { address: string };
  };
  equipments?: { id: string }[];
  vehicles?: { id: string }[];
}

export interface EquipmentData {
  id: string;
  brand: string;
  model: string;
  type: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  owner: string;
  created_at: Date;
  inspection_date?: Date | null          // ✅ allow Date | null
  insurance_expiration_date?: Date | null // ✅ allow Date | null
  project?: {
    client?: {
      location?: { address: string };
    };
  };
}

export interface VehicleData {
  id: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  owner: string;
  created_at: Date;
  inspection_date?: Date | null          // ✅ allow Date | null
  insurance_expiration_date?: Date | null // ✅ allow Date | null
  project?: {
    client?: {
      location?: { address: string };
    };
  };
}

export interface MaintenanceReportData {
  id: string
  issue_description: string
  status: 'REPORTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | null
  date_reported: Date
  created_at: Date
  equipment?: {
    project?: {
      client?: {
        location?: { address: string }
      }
    }
  }
}



// Component Props Types
export interface OverviewStatsProps {
  initialData: StatsData;
  detailedData: DetailedData;
}

export interface RecentActivityProps {
  initialData: ActivityItem[];
}

export interface AssetCountProps {
  initialData: EquipmentVehicleCounts;
}
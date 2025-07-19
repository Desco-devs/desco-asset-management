// Main Dashboard Components
export { OverviewStats } from "./OverviewStats";
export { RecentActivity } from "./RecentActivity";

// Asset Count Components  
export { EquipmentsCount } from "./EquipmentsCount";
export { VehiclesCount } from "./VehiclesCount";

// Feature Components
export { VehiclesAndEquipments } from "./VehiclesAndEquipments";
export { MaintenanceAlerts } from "./MaintenanceAlerts";
export { QuickActions } from "./QuickActions";
export { ProjectsCountPerMonth } from "./ProjectsCountPerMonth";

// Types (re-export for convenience)
export type {
  StatsData,
  DetailedData,
  ActivityItem,
  OverviewStatsProps,
  RecentActivityProps,
  AssetCountProps,
} from "@/types/dashboard";
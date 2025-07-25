// Modern dashboard components exports
export { default as DashboardContainer } from './DashboardContainer';

// Stats components
export { OverviewStatsGrid } from './stats/OverviewStatsGrid';

// Chart components
export { 
  AssetStatusChart,
  EquipmentStatusChart,
  VehicleStatusChart,
  CombinedAssetStatusChart
} from './charts/AssetStatusChart';

// Alert components
export { MaintenanceAlertsPanel } from './alerts/MaintenanceAlertsPanel';

// Activity components
export { RecentActivityFeed } from './activity/RecentActivityFeed';

// Legacy components (for backward compatibility - will be removed)
export { default as ClientDashboard } from './ClientDashboard';

// Legacy component exports (maintaining existing exports)
export { VehiclesAndEquipments } from './charts/VehiclesAndEquipments';
export { ProjectsCountPerMonth } from './charts/ProjectsCountPerMonth';
export { EquipmentsCount } from './stats/EquipmentsCount';
export { OverviewStats } from './stats/OverviewStats';
export { VehiclesCount } from './stats/VehiclesCount';
export { MaintenanceAlerts } from './ui/MaintenanceAlerts';
export { RecentActivity } from './ui/RecentActivity';
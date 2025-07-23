import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { ActivityItem } from '@/types/dashboard';

export interface AssetCounts {
  OPERATIONAL: number;
  NON_OPERATIONAL: number;
}

export interface OverviewStats {
  locations: number;
  clients: number;
  projects: number;
  vehicles: { total: number; operational: number; nonOperational: number };
  equipment: { total: number; operational: number; nonOperational: number };
  maintenanceReports: { total: number; pending: number; inProgress: number };
  growth: {
    newClientsThisWeek: number;
    newProjectsThisWeek: number;
    newEquipmentThisWeek: number;
    newVehiclesThisWeek: number;
  };
}

export interface MaintenanceAlert {
  id: string;
  type: 'equipment' | 'vehicle';
  name: string;
  status: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

interface DashboardState {
  // Server state cache (synced with TanStack Query)
  overviewStats: OverviewStats | null;
  equipmentCounts: AssetCounts;
  vehicleCounts: AssetCounts;
  recentActivity: ActivityItem[];
  maintenanceAlerts: MaintenanceAlert[];
  
  // Client-side UI state
  selectedTimeRange: 'week' | 'month' | 'year';
  alertsExpanded: boolean;
  quickActionsExpanded: boolean;
  selectedAssetType: 'all' | 'equipment' | 'vehicles';
  
  // Loading states
  isLoadingRealtime: boolean;
  lastUpdated: Date | null;
  
  // Actions for server state updates (called by realtime hooks)
  setOverviewStats: (stats: OverviewStats) => void;
  setEquipmentCounts: (counts: AssetCounts) => void;
  setVehicleCounts: (counts: AssetCounts) => void;
  setRecentActivity: (activities: ActivityItem[]) => void;
  setMaintenanceAlerts: (alerts: MaintenanceAlert[]) => void;
  
  // Real-time update actions
  updateEquipmentCount: (id: string, newStatus: string) => void;
  updateVehicleCount: (id: string, newStatus: string) => void;
  addRecentActivity: (activity: ActivityItem) => void;
  updateMaintenanceAlert: (alert: MaintenanceAlert) => void;
  removeMaintenanceAlert: (alertId: string) => void;
  
  // Client state actions
  setSelectedTimeRange: (range: 'week' | 'month' | 'year') => void;
  toggleAlertsExpanded: () => void;
  toggleQuickActionsExpanded: () => void;
  setSelectedAssetType: (type: 'all' | 'equipment' | 'vehicles') => void;
  setLoadingRealtime: (loading: boolean) => void;
  
  // Computed selectors
  getTotalAssets: () => number;
  getOperationalPercentage: () => number;
  getMaintenanceAlertsCount: () => number;
  getCriticalAlertsCount: () => number;
  
  // Reset function
  reset: () => void;
}

const initialState = {
  overviewStats: null,
  equipmentCounts: { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
  vehicleCounts: { OPERATIONAL: 0, NON_OPERATIONAL: 0 },
  recentActivity: [],
  maintenanceAlerts: [],
  selectedTimeRange: 'month' as const,
  alertsExpanded: true,
  quickActionsExpanded: false,
  selectedAssetType: 'all' as const,
  isLoadingRealtime: false,
  lastUpdated: null,
};

export const useDashboardStore = create<DashboardState>()(
  devtools(
    subscribeWithSelector((set, get) => ({
      ...initialState,
      
      // Server state setters
      setOverviewStats: (stats) =>
        set({ overviewStats: stats, lastUpdated: new Date() }, false, 'setOverviewStats'),
      
      setEquipmentCounts: (counts) =>
        set({ equipmentCounts: counts, lastUpdated: new Date() }, false, 'setEquipmentCounts'),
      
      setVehicleCounts: (counts) =>
        set({ vehicleCounts: counts, lastUpdated: new Date() }, false, 'setVehicleCounts'),
      
      setRecentActivity: (activities) =>
        set({ recentActivity: activities, lastUpdated: new Date() }, false, 'setRecentActivity'),
      
      setMaintenanceAlerts: (alerts) =>
        set({ maintenanceAlerts: alerts, lastUpdated: new Date() }, false, 'setMaintenanceAlerts'),
      
      // Real-time update actions
      updateEquipmentCount: (id, newStatus) =>
        set((state) => {
          const isNowOperational = newStatus === 'OPERATIONAL';
          const wasOperational = true; // We'd need to track previous state for accuracy
          
          const newCounts = { ...state.equipmentCounts };
          
          if (isNowOperational && !wasOperational) {
            newCounts.OPERATIONAL += 1;
            newCounts.NON_OPERATIONAL = Math.max(0, newCounts.NON_OPERATIONAL - 1);
          } else if (!isNowOperational && wasOperational) {
            newCounts.NON_OPERATIONAL += 1;
            newCounts.OPERATIONAL = Math.max(0, newCounts.OPERATIONAL - 1);
          }
          
          return {
            equipmentCounts: newCounts,
            lastUpdated: new Date(),
          };
        }, false, 'updateEquipmentCount'),
      
      updateVehicleCount: (id, newStatus) =>
        set((state) => {
          const isNowOperational = newStatus === 'OPERATIONAL';
          const wasOperational = true; // We'd need to track previous state for accuracy
          
          const newCounts = { ...state.vehicleCounts };
          
          if (isNowOperational && !wasOperational) {
            newCounts.OPERATIONAL += 1;
            newCounts.NON_OPERATIONAL = Math.max(0, newCounts.NON_OPERATIONAL - 1);
          } else if (!isNowOperational && wasOperational) {
            newCounts.NON_OPERATIONAL += 1;
            newCounts.OPERATIONAL = Math.max(0, newCounts.OPERATIONAL - 1);
          }
          
          return {
            vehicleCounts: newCounts,
            lastUpdated: new Date(),
          };
        }, false, 'updateVehicleCount'),
      
      addRecentActivity: (activity) =>
        set((state) => ({
          recentActivity: [activity, ...state.recentActivity].slice(0, 50), // Keep only last 50
          lastUpdated: new Date(),
        }), false, 'addRecentActivity'),
      
      updateMaintenanceAlert: (alert) =>
        set((state) => {
          const existingIndex = state.maintenanceAlerts.findIndex(a => a.id === alert.id);
          let newAlerts;
          
          if (existingIndex >= 0) {
            newAlerts = [...state.maintenanceAlerts];
            newAlerts[existingIndex] = alert;
          } else {
            newAlerts = [alert, ...state.maintenanceAlerts];
          }
          
          return {
            maintenanceAlerts: newAlerts,
            lastUpdated: new Date(),
          };
        }, false, 'updateMaintenanceAlert'),
      
      removeMaintenanceAlert: (alertId) =>
        set((state) => ({
          maintenanceAlerts: state.maintenanceAlerts.filter(alert => alert.id !== alertId),
          lastUpdated: new Date(),
        }), false, 'removeMaintenanceAlert'),
      
      // Client state actions
      setSelectedTimeRange: (range) =>
        set({ selectedTimeRange: range }, false, 'setSelectedTimeRange'),
      
      toggleAlertsExpanded: () =>
        set((state) => ({ alertsExpanded: !state.alertsExpanded }), false, 'toggleAlertsExpanded'),
      
      toggleQuickActionsExpanded: () =>
        set((state) => ({ quickActionsExpanded: !state.quickActionsExpanded }), false, 'toggleQuickActionsExpanded'),
      
      setSelectedAssetType: (type) =>
        set({ selectedAssetType: type }, false, 'setSelectedAssetType'),
      
      setLoadingRealtime: (loading) =>
        set({ isLoadingRealtime: loading }, false, 'setLoadingRealtime'),
      
      // Computed selectors (use direct state access to avoid get() instability)
      getTotalAssets: () => {
        const state = get();
        return (
          state.equipmentCounts.OPERATIONAL +
          state.equipmentCounts.NON_OPERATIONAL +
          state.vehicleCounts.OPERATIONAL +
          state.vehicleCounts.NON_OPERATIONAL
        );
      },
      
      getOperationalPercentage: () => {
        const state = get();
        const total = (
          state.equipmentCounts.OPERATIONAL +
          state.equipmentCounts.NON_OPERATIONAL +
          state.vehicleCounts.OPERATIONAL +
          state.vehicleCounts.NON_OPERATIONAL
        );
        if (total === 0) return 0;
        
        const operational = state.equipmentCounts.OPERATIONAL + state.vehicleCounts.OPERATIONAL;
        return Math.round((operational / total) * 100);
      },
      
      getMaintenanceAlertsCount: () => get().maintenanceAlerts.length,
      
      getCriticalAlertsCount: () =>
        get().maintenanceAlerts.filter(alert => alert.priority === 'critical').length,
      
      // Reset function
      reset: () => set(initialState, false, 'reset'),
    })),
    {
      name: 'dashboard-store',
    }
  )
);

// Selector hooks for specific data slices
export const useOverviewStats = () => useDashboardStore(state => state.overviewStats);
export const useEquipmentCounts = () => useDashboardStore(state => state.equipmentCounts);
export const useVehicleCounts = () => useDashboardStore(state => state.vehicleCounts);
export const useRecentActivity = () => useDashboardStore(state => state.recentActivity);
export const useMaintenanceAlerts = () => useDashboardStore(state => state.maintenanceAlerts);
export const useSelectedTimeRange = () => useDashboardStore(state => state.selectedTimeRange);
export const useSelectedAssetType = () => useDashboardStore(state => state.selectedAssetType);
export const useAlertsExpanded = () => useDashboardStore(state => state.alertsExpanded);
export const useQuickActionsExpanded = () => useDashboardStore(state => state.quickActionsExpanded);
export const useIsLoadingRealtime = () => useDashboardStore(state => state.isLoadingRealtime);
export const useLastUpdated = () => useDashboardStore(state => state.lastUpdated);

// Computed selectors (stable references)
export const useTotalAssets = () => useDashboardStore(state => 
  state.equipmentCounts.OPERATIONAL +
  state.equipmentCounts.NON_OPERATIONAL +
  state.vehicleCounts.OPERATIONAL +
  state.vehicleCounts.NON_OPERATIONAL
);

export const useOperationalPercentage = () => useDashboardStore(state => {
  const total = state.equipmentCounts.OPERATIONAL +
    state.equipmentCounts.NON_OPERATIONAL +
    state.vehicleCounts.OPERATIONAL +
    state.vehicleCounts.NON_OPERATIONAL;
  
  if (total === 0) return 0;
  
  const operational = state.equipmentCounts.OPERATIONAL + state.vehicleCounts.OPERATIONAL;
  return Math.round((operational / total) * 100);
});

export const useMaintenanceAlertsCount = () => useDashboardStore(state => state.maintenanceAlerts.length);

export const useCriticalAlertsCount = () => useDashboardStore(state => 
  state.maintenanceAlerts.filter(alert => alert.priority === 'critical').length
);
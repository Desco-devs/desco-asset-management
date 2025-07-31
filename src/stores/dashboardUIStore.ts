import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Dashboard UI Store - UI STATE ONLY
 * Following REALTIME_PATTERN.md: "Separation of Concerns: UI state ≠ Data state"
 * 
 * This store ONLY manages:
 * - Modal states
 * - Filter preferences  
 * - UI interactions
 * - View settings
 * 
 * Does NOT manage server data - that's TanStack Query's job!
 */
interface DashboardUIState {
  // Time range filter
  selectedTimeRange: 'week' | 'month' | 'year';
  
  // UI interaction states
  alertsExpanded: boolean;
  selectedAssetType: 'all' | 'equipment' | 'vehicles';
  
  // Chart preferences
  chartType: 'bar' | 'line' | 'pie';
  showTrends: boolean;
  
  // Actions
  setSelectedTimeRange: (range: 'week' | 'month' | 'year') => void;
  setAlertsExpanded: (expanded: boolean) => void;
  setSelectedAssetType: (type: 'all' | 'equipment' | 'vehicles') => void;
  setChartType: (type: 'bar' | 'line' | 'pie') => void;
  setShowTrends: (show: boolean) => void;
  
  // Reset filters
  resetFilters: () => void;
}

export const useDashboardUIStore = create<DashboardUIState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        selectedTimeRange: 'month',
        alertsExpanded: false,
        selectedAssetType: 'all',
        chartType: 'bar',
        showTrends: true,
        
        // Actions
        setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
        setAlertsExpanded: (expanded) => set({ alertsExpanded: expanded }),
        setSelectedAssetType: (type) => set({ selectedAssetType: type }),
        setChartType: (type) => set({ chartType: type }),
        setShowTrends: (show) => set({ showTrends: show }),
        
        // Reset all filters to defaults
        resetFilters: () => set({
          selectedTimeRange: 'month',
          alertsExpanded: false,
          selectedAssetType: 'all',
          chartType: 'bar',
          showTrends: true,
        }),
      }),
      {
        name: 'dashboard-ui-settings',
        // Only persist UI preferences that should survive browser refresh
        partialize: (state) => ({
          selectedTimeRange: state.selectedTimeRange,
          chartType: state.chartType,
          showTrends: state.showTrends,
        }),
      }
    ),
    { name: 'DashboardUIStore' }
  )
);

// Selectors for better performance (prevent unnecessary re-renders)
export const useSelectedTimeRange = () => 
  useDashboardUIStore((state) => state.selectedTimeRange);

export const useAlertsExpanded = () => 
  useDashboardUIStore((state) => state.alertsExpanded);

export const useSelectedAssetType = () => 
  useDashboardUIStore((state) => state.selectedAssetType);

export const useChartType = () => 
  useDashboardUIStore((state) => state.chartType);

export const useShowTrends = () => 
  useDashboardUIStore((state) => state.showTrends);
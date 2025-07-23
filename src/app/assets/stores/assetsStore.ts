import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type ViewMode = 'equipment' | 'vehicles';

export interface FilterState {
  search: string;
  locationId: string;
  clientId: string;
  projectId: string;
  status: 'all' | 'operational' | 'non-operational';
}

export interface UIState {
  currentPage: number;
  isFiltersCollapsed: boolean;
  newItemIds: Set<string>;
}

interface AssetsState {
  // View mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Filter state
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;

  // UI state
  ui: UIState;
  setCurrentPage: (page: number) => void;
  toggleFiltersCollapsed: () => void;
  addNewItemId: (id: string) => void;
  removeNewItemId: (id: string) => void;
  clearNewItemIds: () => void;

  // Computed getters
  hasActiveFilters: () => boolean;
  getFilteredParams: () => Record<string, string>;
}

const initialFilters: FilterState = {
  search: '',
  locationId: '',
  clientId: '',
  projectId: '',
  status: 'all',
};

const initialUI: UIState = {
  currentPage: 1,
  isFiltersCollapsed: false,
  newItemIds: new Set(),
};

export const useAssetsStore = create<AssetsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      viewMode: 'equipment',
      filters: initialFilters,
      ui: initialUI,

      // View mode actions
      setViewMode: (mode) =>
        set(
          (state) => ({
            viewMode: mode,
            ui: { ...state.ui, currentPage: 1 }, // Reset page when switching views
          }),
          false,
          'setViewMode'
        ),

      // Filter actions
      setFilters: (newFilters) =>
        set(
          (state) => ({
            filters: { ...state.filters, ...newFilters },
            ui: { ...state.ui, currentPage: 1 }, // Reset page when filters change
          }),
          false,
          'setFilters'
        ),

      resetFilters: () =>
        set(
          (state) => ({
            filters: initialFilters,
            ui: { ...state.ui, currentPage: 1 },
          }),
          false,
          'resetFilters'
        ),

      // UI actions
      setCurrentPage: (page) =>
        set(
          (state) => ({
            ui: { ...state.ui, currentPage: page },
          }),
          false,
          'setCurrentPage'
        ),

      toggleFiltersCollapsed: () =>
        set(
          (state) => ({
            ui: {
              ...state.ui,
              isFiltersCollapsed: !state.ui.isFiltersCollapsed,
            },
          }),
          false,
          'toggleFiltersCollapsed'
        ),

      addNewItemId: (id) =>
        set(
          (state) => {
            const newSet = new Set(state.ui.newItemIds);
            newSet.add(id);
            return {
              ui: { ...state.ui, newItemIds: newSet },
            };
          },
          false,
          'addNewItemId'
        ),

      removeNewItemId: (id) =>
        set(
          (state) => {
            const newSet = new Set(state.ui.newItemIds);
            newSet.delete(id);
            return {
              ui: { ...state.ui, newItemIds: newSet },
            };
          },
          false,
          'removeNewItemId'
        ),

      clearNewItemIds: () =>
        set(
          (state) => ({
            ui: { ...state.ui, newItemIds: new Set() },
          }),
          false,
          'clearNewItemIds'
        ),

      // Computed getters
      hasActiveFilters: () => {
        const { filters } = get();
        return (
          filters.search !== '' ||
          filters.locationId !== '' ||
          filters.clientId !== '' ||
          filters.projectId !== '' ||
          filters.status !== 'all'
        );
      },

      getFilteredParams: () => {
        const { filters } = get();
        const params: Record<string, string> = {};

        if (filters.search) params.search = filters.search;
        if (filters.locationId) params.locationId = filters.locationId;
        if (filters.clientId) params.clientId = filters.clientId;
        if (filters.projectId) params.projectId = filters.projectId;
        if (filters.status !== 'all') params.status = filters.status;

        return params;
      },
    }),
    {
      name: 'assets-store',
    }
  )
);
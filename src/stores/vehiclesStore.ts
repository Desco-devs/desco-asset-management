import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  owner: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  inspection_date: string;
  expiry_date: string;
  before: number;
  remarks?: string;
  created_at: string;
  project: {
    id: string;
    name: string;
    client: {
      id: string;
      name: string;
      location: {
        id: string;
        address: string;
      };
    };
  };
  user: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

export interface MaintenanceReport {
  id: string;
  vehicle_id: string;
  issue_description: string;
  remarks?: string;
  inspection_details?: string;
  action_taken?: string;
  parts_replaced: string[];
  priority?: string;
  status?: string;
  downtime_hours?: string;
  date_reported: string;
  date_repaired?: string;
  attachment_urls: string[];
  reported_by?: string;
  repaired_by?: string;
  location_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  location_id: string;
  created_at: string;
}

export interface Location {
  id: string;
  address: string;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  email: string;
  role: string;
}

interface VehiclesState {
  // UI state (not persisted to localStorage)
  selectedVehicle: Vehicle | null;
  isModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEditMode: boolean;
  selectedMaintenanceReport: MaintenanceReport | null;
  isMaintenanceModalOpen: boolean;
  currentPage: number;
  isMobile: boolean;
  searchQuery: string;
  
  // Pagination & filtering settings (persisted to localStorage)
  itemsPerPage: number;
  sortBy: 'created_at' | 'brand' | 'status' | 'expiry_date' | 'model' | 'plate_number';
  sortOrder: 'asc' | 'desc';
  filterStatus: 'all' | 'OPERATIONAL' | 'NON_OPERATIONAL';
  filterProject: string; // 'all' or project ID
  
  // UI Actions
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditMode: (isEdit: boolean) => void;
  setSelectedMaintenanceReport: (report: MaintenanceReport | null) => void;
  setIsMaintenanceModalOpen: (open: boolean) => void;
  setCurrentPage: (page: number) => void;
  setIsMobile: (isMobile: boolean) => void;
  setSearchQuery: (query: string) => void;
  
  // Filter & Sort Actions
  setSortBy: (sortBy: VehiclesState['sortBy']) => void;
  setSortOrder: (order: VehiclesState['sortOrder']) => void;
  setFilterStatus: (status: VehiclesState['filterStatus']) => void;
  setFilterProject: (projectId: string) => void;
  setItemsPerPage: (count: number) => void;
  
  // Computed selectors (derived state - no re-renders)
  getFilteredVehicles: (vehicles: Vehicle[]) => Vehicle[];
  getSortedVehicles: (vehicles: Vehicle[]) => Vehicle[];
  getPaginatedVehicles: (vehicles: Vehicle[]) => Vehicle[];
  getTotalPages: (vehicles: Vehicle[]) => number;
  getEffectiveItemsPerPage: () => number;
  
  // Reset functions
  resetFilters: () => void;
  closeAllModals: () => void;
}

interface PersistedState {
  itemsPerPage: number;
  sortBy: VehiclesState['sortBy'];
  sortOrder: VehiclesState['sortOrder'];
  filterStatus: VehiclesState['filterStatus'];
  filterProject: string;
}

export const useVehiclesStore = create<VehiclesState>()(
  // Enable subscriptions to specific slices of state
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // UI state (not persisted)
        selectedVehicle: null,
        isModalOpen: false,
        isCreateModalOpen: false,
        isEditMode: false,
        selectedMaintenanceReport: null,
        isMaintenanceModalOpen: false,
        currentPage: 1,
        isMobile: false,
        searchQuery: '',
        
        // Pagination & filtering settings (persisted)
        itemsPerPage: 12,
        sortBy: 'created_at',
        sortOrder: 'desc',
        filterStatus: 'all',
        filterProject: 'all',
        
        // UI Actions
        setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
        setIsModalOpen: (open) => set({ isModalOpen: open }),
        setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
        setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
        setSelectedMaintenanceReport: (report) => set({ selectedMaintenanceReport: report }),
        setIsMaintenanceModalOpen: (open) => set({ isMaintenanceModalOpen: open }),
        setCurrentPage: (page) => set({ currentPage: page }),
        setIsMobile: (isMobile) => set({ isMobile }),
        setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
        
        // Filter & Sort Actions
        setSortBy: (sortBy) => set({ sortBy, currentPage: 1 }),
        setSortOrder: (order) => set({ sortOrder: order }),
        setFilterStatus: (status) => set({ filterStatus: status, currentPage: 1 }),
        setFilterProject: (projectId) => set({ filterProject: projectId, currentPage: 1 }),
        setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),
        
        // Computed selectors (accept vehicles as parameter - no direct state access)
        getFilteredVehicles: (vehicles: Vehicle[]) => {
          const { filterStatus, filterProject, searchQuery } = get();
          
          let filtered = vehicles;
          
          // Filter by status
          if (filterStatus !== 'all') {
            filtered = filtered.filter(vehicle => vehicle.status === filterStatus);
          }
          
          // Filter by project
          if (filterProject !== 'all') {
            filtered = filtered.filter(vehicle => vehicle.project.id === filterProject);
          }
          
          // Filter by search query
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(vehicle => 
              vehicle.brand.toLowerCase().includes(query) ||
              vehicle.model.toLowerCase().includes(query) ||
              vehicle.plate_number.toLowerCase().includes(query) ||
              vehicle.owner.toLowerCase().includes(query) ||
              vehicle.project.name.toLowerCase().includes(query)
            );
          }
          
          return filtered;
        },
        
        getSortedVehicles: (vehicles: Vehicle[]) => {
          const { sortBy, sortOrder } = get();
          const filtered = get().getFilteredVehicles(vehicles);
          
          return [...filtered].sort((a, b) => {
            let aValue: any, bValue: any;
            
            switch (sortBy) {
              case 'brand':
                aValue = a.brand.toLowerCase();
                bValue = b.brand.toLowerCase();
                break;
              case 'model':
                aValue = a.model.toLowerCase();
                bValue = b.model.toLowerCase();
                break;
              case 'plate_number':
                aValue = a.plate_number.toLowerCase();
                bValue = b.plate_number.toLowerCase();
                break;
              case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
              case 'expiry_date':
                aValue = new Date(a.expiry_date);
                bValue = new Date(b.expiry_date);
                break;
              case 'created_at':
              default:
                aValue = new Date(a.created_at);
                bValue = new Date(b.created_at);
                break;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        },
        
        getPaginatedVehicles: (vehicles: Vehicle[]) => {
          const { currentPage } = get();
          const sorted = get().getSortedVehicles(vehicles);
          const itemsPerPage = get().getEffectiveItemsPerPage();
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          return sorted.slice(startIndex, endIndex);
        },
        
        getTotalPages: (vehicles: Vehicle[]) => {
          const sorted = get().getSortedVehicles(vehicles);
          const itemsPerPage = get().getEffectiveItemsPerPage();
          return Math.ceil(sorted.length / itemsPerPage);
        },
        
        getEffectiveItemsPerPage: () => {
          const { isMobile, itemsPerPage } = get();
          return isMobile ? 6 : itemsPerPage;
        },
        
        // Reset functions
        resetFilters: () => set({
          filterStatus: 'all',
          filterProject: 'all',
          searchQuery: '',
          currentPage: 1
        }),
        
        closeAllModals: () => set({
          isModalOpen: false,
          isCreateModalOpen: false,
          isMaintenanceModalOpen: false,
          selectedVehicle: null,
          selectedMaintenanceReport: null,
          isEditMode: false
        }),
      }),
      {
        name: 'vehicles-settings',
        // Only persist user preferences, not the actual data or UI state
        partialize: (state): PersistedState => ({
          itemsPerPage: state.itemsPerPage,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
          filterStatus: state.filterStatus,
          filterProject: state.filterProject,
        }),
      }
    )
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const selectSelectedVehicle = (state: VehiclesState) => state.selectedVehicle;
export const selectIsModalOpen = (state: VehiclesState) => state.isModalOpen;
export const selectIsCreateModalOpen = (state: VehiclesState) => state.isCreateModalOpen;
export const selectIsEditMode = (state: VehiclesState) => state.isEditMode;
export const selectSelectedMaintenanceReport = (state: VehiclesState) => state.selectedMaintenanceReport;
export const selectIsMaintenanceModalOpen = (state: VehiclesState) => state.isMaintenanceModalOpen;
export const selectCurrentPage = (state: VehiclesState) => state.currentPage;
export const selectIsMobile = (state: VehiclesState) => state.isMobile;
export const selectSearchQuery = (state: VehiclesState) => state.searchQuery;
export const selectItemsPerPage = (state: VehiclesState) => state.itemsPerPage;
export const selectSortBy = (state: VehiclesState) => state.sortBy;
export const selectSortOrder = (state: VehiclesState) => state.sortOrder;
export const selectFilterStatus = (state: VehiclesState) => state.filterStatus;
export const selectFilterProject = (state: VehiclesState) => state.filterProject;

// Computed selectors that accept data as parameters
export const selectFilteredVehicles = (vehicles: Vehicle[]) => (state: VehiclesState) => 
  state.getFilteredVehicles(vehicles);
export const selectSortedVehicles = (vehicles: Vehicle[]) => (state: VehiclesState) => 
  state.getSortedVehicles(vehicles);
export const selectPaginatedVehicles = (vehicles: Vehicle[]) => (state: VehiclesState) => 
  state.getPaginatedVehicles(vehicles);
export const selectTotalPages = (vehicles: Vehicle[]) => (state: VehiclesState) => 
  state.getTotalPages(vehicles);
export const selectEffectiveItemsPerPage = (state: VehiclesState) => state.getEffectiveItemsPerPage();

// Compound selectors for common UI needs
export const selectPaginationInfo = (vehicles: Vehicle[]) => (state: VehiclesState) => ({
  currentPage: state.currentPage,
  totalPages: state.getTotalPages(vehicles),
  itemsPerPage: state.getEffectiveItemsPerPage(),
  totalItems: state.getSortedVehicles(vehicles).length
});

export const selectFilterInfo = (state: VehiclesState) => ({
  status: state.filterStatus,
  project: state.filterProject,
  search: state.searchQuery,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder
});
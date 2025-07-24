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
  front_img_url?: string;
  back_img_url?: string;
  side1_img_url?: string;
  side2_img_url?: string;
  original_receipt_url?: string;
  car_registration_url?: string;
  pgpc_inspection_image?: string;
  vehicle_parts?: string[];
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
  // Related objects from API
  location?: {
    id: string;
    address: string;
  };
  reported_user?: {
    id: string;
    username: string;
    full_name: string;
  };
  repaired_user?: {
    id: string;
    username: string;
    full_name: string;
  };
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

export interface ExportFilters {
  format?: 'pdf' | 'excel';
  reportType?: 'summary' | 'detailed';
  vehicleId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
}

interface VehiclesState {
  // UI state (not persisted to localStorage)
  selectedVehicle: Vehicle | null;
  isModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEditMode: boolean;
  selectedMaintenanceReport: MaintenanceReport | null;
  isMaintenanceModalOpen: boolean;
  selectedMaintenanceReportForDetail: MaintenanceReport | null;
  isMaintenanceReportDetailOpen: boolean;
  selectedMaintenanceReportForEdit: MaintenanceReport | null;
  isEditMaintenanceReportDrawerOpen: boolean;
  isExportModalOpen: boolean;
  currentPage: number;
  isMobile: boolean;
  searchQuery: string;
  isPhotosCollapsed: boolean;
  isDocumentsCollapsed: boolean;
  
  // Image viewer state
  viewerImage: { url: string; title: string } | null;
  
  // Delete confirmation state - unified approach
  deleteConfirmation: {
    isOpen: boolean;
    vehicle: Vehicle | null;
  };
  
  // Pagination & filtering settings (persisted to localStorage)
  itemsPerPage: number;
  sortBy: 'created_at' | 'brand' | 'status' | 'expiry_date' | 'model' | 'plate_number' | 'owner' | '';
  sortOrder: 'asc' | 'desc';
  filterStatus: 'all' | 'OPERATIONAL' | 'NON_OPERATIONAL';
  filterProject: string; // 'all' or project ID
  filterType: string; // 'all' or vehicle type
  filterOwner: string; // 'all' or owner name
  filterMaintenance: 'all' | 'has_issues' | 'no_issues'; // filter by maintenance status
  filterExpiryDays: number | null; // null or days (show vehicles expiring within X days)
  filterDateRange: {
    startDate: string | null;
    endDate: string | null;
    dateType: 'inspection' | 'expiry' | 'created';
  };
  
  // UI Actions
  setSelectedVehicle: (vehicle: Vehicle | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditMode: (isEdit: boolean) => void;
  setSelectedMaintenanceReport: (report: MaintenanceReport | null) => void;
  setIsMaintenanceModalOpen: (open: boolean) => void;
  setSelectedMaintenanceReportForDetail: (report: MaintenanceReport | null) => void;
  setIsMaintenanceReportDetailOpen: (open: boolean) => void;
  setSelectedMaintenanceReportForEdit: (report: MaintenanceReport | null) => void;
  setIsEditMaintenanceReportDrawerOpen: (open: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setCurrentPage: (page: number) => void;
  setIsMobile: (isMobile: boolean) => void;
  setSearchQuery: (query: string) => void;
  setIsPhotosCollapsed: (collapsed: boolean) => void;
  setIsDocumentsCollapsed: (collapsed: boolean) => void;
  setViewerImage: (image: { url: string; title: string } | null) => void;
  setDeleteConfirmation: (state: { isOpen: boolean; vehicle: Vehicle | null }) => void;
  
  // Filter & Sort Actions
  setSortBy: (sortBy: VehiclesState['sortBy']) => void;
  setSortOrder: (order: VehiclesState['sortOrder']) => void;
  setFilterStatus: (status: VehiclesState['filterStatus']) => void;
  setFilterProject: (projectId: string) => void;
  setFilterType: (type: string) => void;
  setFilterOwner: (owner: string) => void;
  setFilterMaintenance: (maintenance: VehiclesState['filterMaintenance']) => void;
  setFilterExpiryDays: (days: number | null) => void;
  setFilterDateRange: (dateRange: VehiclesState['filterDateRange']) => void;
  setItemsPerPage: (count: number) => void;
  
  // Export Actions
  exportMaintenanceReports: (filters?: ExportFilters) => Promise<void>;
  isExporting: boolean;
  setIsExporting: (exporting: boolean) => void;
  
  // Computed selectors (derived state - no re-renders)
  getFilteredVehicles: (vehicles: Vehicle[], maintenanceReports?: MaintenanceReport[]) => Vehicle[];
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
  // Don't persist filters - always start fresh
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
        selectedMaintenanceReportForDetail: null,
        isMaintenanceReportDetailOpen: false,
        selectedMaintenanceReportForEdit: null,
        isEditMaintenanceReportDrawerOpen: false,
        isExportModalOpen: false,
        currentPage: 1,
        isMobile: false,
        searchQuery: '',
        isPhotosCollapsed: false,
        isDocumentsCollapsed: false,
        viewerImage: null,
        deleteConfirmation: {
          isOpen: false,
          vehicle: null,
        },
        
        // Pagination & filtering settings (persisted)
        itemsPerPage: 12,
        sortBy: '',
        sortOrder: 'desc',
        filterStatus: 'all',
        filterProject: 'all',
        filterType: 'all',
        filterOwner: 'all',
        filterMaintenance: 'all',
        filterExpiryDays: null,
        filterDateRange: {
          startDate: null,
          endDate: null,
          dateType: 'created'
        },
        
        // UI Actions
        setSelectedVehicle: (vehicle) => set({ selectedVehicle: vehicle }),
        setIsModalOpen: (open) => set({ isModalOpen: open }),
        setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
        setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
        setSelectedMaintenanceReport: (report) => set({ selectedMaintenanceReport: report }),
        setIsMaintenanceModalOpen: (open) => set({ isMaintenanceModalOpen: open }),
        setSelectedMaintenanceReportForDetail: (report) => set({ selectedMaintenanceReportForDetail: report }),
        setIsMaintenanceReportDetailOpen: (open) => set({ isMaintenanceReportDetailOpen: open }),
        setSelectedMaintenanceReportForEdit: (report) => set({ selectedMaintenanceReportForEdit: report }),
        setIsEditMaintenanceReportDrawerOpen: (open) => set({ isEditMaintenanceReportDrawerOpen: open }),
        setIsExportModalOpen: (open) => set({ isExportModalOpen: open }),
        setCurrentPage: (page) => set({ currentPage: page }),
        setIsMobile: (isMobile) => set({ isMobile }),
        setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
        setIsPhotosCollapsed: (collapsed) => set({ isPhotosCollapsed: collapsed }),
        setIsDocumentsCollapsed: (collapsed) => set({ isDocumentsCollapsed: collapsed }),
        setViewerImage: (image) => set({ viewerImage: image }),
        setDeleteConfirmation: (state) => set({ deleteConfirmation: state }),
        
        // Filter & Sort Actions
        setSortBy: (sortBy) => set({ sortBy, currentPage: 1 }),
        setSortOrder: (order) => set({ sortOrder: order }),
        setFilterStatus: (status) => set({ filterStatus: status, currentPage: 1 }),
        setFilterProject: (projectId) => set({ filterProject: projectId, currentPage: 1 }),
        setFilterType: (type) => set({ filterType: type, currentPage: 1 }),
        setFilterOwner: (owner) => set({ filterOwner: owner, currentPage: 1 }),
        setFilterMaintenance: (maintenance) => set({ filterMaintenance: maintenance, currentPage: 1 }),
        setFilterExpiryDays: (days) => set({ filterExpiryDays: days, currentPage: 1 }),
        setFilterDateRange: (dateRange) => set({ filterDateRange: dateRange, currentPage: 1 }),
        setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),
        
        // Export state
        isExporting: false,
        setIsExporting: (exporting) => set({ isExporting: exporting }),
        
        // Export function
        exportMaintenanceReports: async (filters?: ExportFilters) => {
          const { setIsExporting } = get();
          
          try {
            setIsExporting(true);
            
            // Build query parameters
            const params = new URLSearchParams();
            if (filters?.format) params.append('format', filters.format);
            if (filters?.reportType) params.append('reportType', filters.reportType);
            if (filters?.vehicleId && filters.vehicleId !== 'ALL_VEHICLES') params.append('vehicleId', filters.vehicleId);
            if (filters?.status && filters.status !== 'ALL_STATUS') params.append('status', filters.status);
            if (filters?.priority && filters.priority !== 'ALL_PRIORITIES') params.append('priority', filters.priority);
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);

            const response = await fetch(`/api/vehicles/maintenance-reports/export?${params.toString()}`);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
              throw new Error(errorData.error || 'Export failed');
            }

            // Get the filename from the response headers
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition 
              ? contentDisposition.split('filename="')[1]?.split('"')[0]
              : `vehicle-maintenance-reports-${new Date().toISOString().split('T')[0]}.${filters?.format || 'pdf'}`;

            // Create blob and trigger download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

          } catch (error) {
            console.error('Export failed:', error);
            throw error;
          } finally {
            setIsExporting(false);
          }
        },
        
        // Computed selectors (accept vehicles as parameter - no direct state access)
        getFilteredVehicles: (vehicles: Vehicle[], maintenanceReports: MaintenanceReport[] = []) => {
          const { 
            filterStatus, 
            filterProject, 
            filterType,
            filterOwner,
            filterMaintenance,
            filterExpiryDays,
            filterDateRange,
            searchQuery 
          } = get();
          
          
          let filtered = vehicles;
          
          // Filter by status
          if (filterStatus !== 'all') {
            filtered = filtered.filter(vehicle => vehicle.status === filterStatus);
          }
          
          // Filter by project
          if (filterProject !== 'all') {
            filtered = filtered.filter(vehicle => vehicle.project.id === filterProject);
          }
          
          // Filter by vehicle type
          if (filterType !== 'all') {
            filtered = filtered.filter(vehicle => vehicle.type === filterType);
          }
          
          // Filter by owner
          if (filterOwner !== 'all') {
            filtered = filtered.filter(vehicle => vehicle.owner === filterOwner);
          }
          
          // Filter by maintenance status
          if (filterMaintenance !== 'all') {
            filtered = filtered.filter(vehicle => {
              const hasReports = maintenanceReports.some(report => report.vehicle_id === vehicle.id);
              const hasOpenIssues = maintenanceReports.some(report => 
                report.vehicle_id === vehicle.id && 
                report.status && 
                !['COMPLETED', 'RESOLVED'].includes(report.status.toUpperCase())
              );
              
              if (filterMaintenance === 'has_issues') {
                return hasReports && hasOpenIssues;
              } else if (filterMaintenance === 'no_issues') {
                return !hasReports || !hasOpenIssues;
              }
              return true;
            });
          }
          
          // Filter by expiry days (vehicles expiring within X days)
          if (filterExpiryDays !== null && filterExpiryDays > 0) {
            const now = new Date();
            const targetDate = new Date(now.getTime() + (filterExpiryDays * 24 * 60 * 60 * 1000));
            filtered = filtered.filter(vehicle => {
              const expiryDate = new Date(vehicle.expiry_date);
              return expiryDate >= now && expiryDate <= targetDate;
            });
          }
          
          // Filter by date range
          if (filterDateRange.startDate || filterDateRange.endDate) {
            filtered = filtered.filter(vehicle => {
              let dateToCheck: Date;
              switch (filterDateRange.dateType) {
                case 'inspection':
                  dateToCheck = new Date(vehicle.inspection_date);
                  break;
                case 'expiry':
                  dateToCheck = new Date(vehicle.expiry_date);
                  break;
                case 'created':
                default:
                  dateToCheck = new Date(vehicle.created_at);
                  break;
              }
              
              if (filterDateRange.startDate && filterDateRange.endDate) {
                const startDate = new Date(filterDateRange.startDate);
                const endDate = new Date(filterDateRange.endDate);
                return dateToCheck >= startDate && dateToCheck <= endDate;
              } else if (filterDateRange.startDate) {
                const startDate = new Date(filterDateRange.startDate);
                return dateToCheck >= startDate;
              } else if (filterDateRange.endDate) {
                const endDate = new Date(filterDateRange.endDate);
                return dateToCheck <= endDate;
              }
              
              return true;
            });
          }
          
          // Filter by search query (enhanced to include client and location)
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(vehicle => 
              vehicle.brand.toLowerCase().includes(query) ||
              vehicle.model.toLowerCase().includes(query) ||
              vehicle.plate_number.toLowerCase().includes(query) ||
              vehicle.owner.toLowerCase().includes(query) ||
              vehicle.type.toLowerCase().includes(query) ||
              vehicle.project.name.toLowerCase().includes(query) ||
              vehicle.project.client.name.toLowerCase().includes(query) ||
              vehicle.project.client.location.address.toLowerCase().includes(query)
            );
          }
          
          
          return filtered;
        },
        
        getSortedVehicles: (vehicles: Vehicle[]) => {
          const { sortBy, sortOrder } = get();
          const filtered = get().getFilteredVehicles(vehicles);
          
          return [...filtered].sort((a, b) => {
            let aValue: string | number | Date, bValue: string | number | Date;
            
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
          sortBy: '',
          filterStatus: 'all',
          filterProject: 'all',
          filterType: 'all',
          filterOwner: 'all',
          filterMaintenance: 'all',
          filterExpiryDays: null,
          filterDateRange: {
            startDate: null,
            endDate: null,
            dateType: 'created'
          },
          searchQuery: '',
          currentPage: 1
        }),
        
        closeAllModals: () => set({
          isModalOpen: false,
          isCreateModalOpen: false,
          isMaintenanceModalOpen: false,
          isMaintenanceReportDetailOpen: false,
          isEditMaintenanceReportDrawerOpen: false,
          isExportModalOpen: false,
          selectedVehicle: null,
          selectedMaintenanceReport: null,
          selectedMaintenanceReportForDetail: null,
          selectedMaintenanceReportForEdit: null,
          isEditMode: false
        }),
      }),
      {
        name: 'vehicles-settings',
        // Only persist user preferences, not filters (always start fresh)
        partialize: (state): PersistedState => ({
          itemsPerPage: state.itemsPerPage,
          sortBy: state.sortBy,
          sortOrder: state.sortOrder,
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
export const selectSelectedMaintenanceReportForDetail = (state: VehiclesState) => state.selectedMaintenanceReportForDetail;
export const selectIsMaintenanceReportDetailOpen = (state: VehiclesState) => state.isMaintenanceReportDetailOpen;
export const selectSelectedMaintenanceReportForEdit = (state: VehiclesState) => state.selectedMaintenanceReportForEdit;
export const selectIsEditMaintenanceReportDrawerOpen = (state: VehiclesState) => state.isEditMaintenanceReportDrawerOpen;
export const selectCurrentPage = (state: VehiclesState) => state.currentPage;
export const selectIsMobile = (state: VehiclesState) => state.isMobile;
export const selectSearchQuery = (state: VehiclesState) => state.searchQuery;
export const selectIsPhotosCollapsed = (state: VehiclesState) => state.isPhotosCollapsed;
export const selectIsDocumentsCollapsed = (state: VehiclesState) => state.isDocumentsCollapsed;
export const selectViewerImage = (state: VehiclesState) => state.viewerImage;
export const selectDeleteConfirmation = (state: VehiclesState) => state.deleteConfirmation;
export const selectItemsPerPage = (state: VehiclesState) => state.itemsPerPage;
export const selectSortBy = (state: VehiclesState) => state.sortBy;
export const selectSortOrder = (state: VehiclesState) => state.sortOrder;
export const selectFilterStatus = (state: VehiclesState) => state.filterStatus;
export const selectFilterProject = (state: VehiclesState) => state.filterProject;
export const selectFilterType = (state: VehiclesState) => state.filterType;
export const selectFilterOwner = (state: VehiclesState) => state.filterOwner;
export const selectFilterMaintenance = (state: VehiclesState) => state.filterMaintenance;
export const selectFilterExpiryDays = (state: VehiclesState) => state.filterExpiryDays;
export const selectFilterDateRange = (state: VehiclesState) => state.filterDateRange;

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
  type: state.filterType,
  owner: state.filterOwner,
  maintenance: state.filterMaintenance,
  expiryDays: state.filterExpiryDays,
  dateRange: state.filterDateRange,
  search: state.searchQuery,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder
});

// Helper functions for getting active filter count
export const selectActiveFilterCount = (state: VehiclesState) => {
  let count = 0;
  if (state.filterStatus !== 'all') count++;
  if (state.filterProject !== 'all') count++;
  if (state.filterType !== 'all') count++;
  if (state.filterOwner !== 'all') count++;
  if (state.filterMaintenance !== 'all') count++;
  if (state.filterExpiryDays !== null) count++;
  if (state.filterDateRange.startDate || state.filterDateRange.endDate) count++;
  if (state.searchQuery.trim()) count++;
  return count;
};
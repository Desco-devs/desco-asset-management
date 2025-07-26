import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';

export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate: string;
  before?: string | number;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
  plateNumber?: string;
  originalReceiptUrl?: string;
  equipmentRegistrationUrl?: string;
  thirdpartyInspectionImage?: string;
  pgpcInspectionImage?: string;
  equipmentParts?: string[];
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

export interface MaintenanceReport {
  id: string;
  equipment_id: string;
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

export interface EquipmentMaintenanceReport {
  id: string;
  equipment_id: string;
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
  equipmentId?: string;
  status?: string;
  priority?: string;
  startDate?: string;
  endDate?: string;
}

interface EquipmentsState {
  // UI state (not persisted to localStorage)
  selectedEquipment: Equipment | null;
  isModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEditMode: boolean;
  selectedMaintenanceReport: MaintenanceReport | null;
  isMaintenanceModalOpen: boolean;
  selectedEquipmentMaintenanceReport: EquipmentMaintenanceReport | null;
  isEquipmentMaintenanceModalOpen: boolean;
  selectedMaintenanceReportForDetail: EquipmentMaintenanceReport | null;
  isMaintenanceReportDetailOpen: boolean;
  selectedMaintenanceReportForEdit: EquipmentMaintenanceReport | null;
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
    equipment: Equipment | null;
  };
  
  // Pagination & filtering settings (persisted to localStorage)
  itemsPerPage: number;
  sortBy: 'created_at' | 'brand' | 'status' | 'insuranceExpirationDate' | 'model' | 'type' | 'owner' | '';
  sortOrder: 'asc' | 'desc';
  filterStatus: 'all' | 'OPERATIONAL' | 'NON_OPERATIONAL';
  filterProject: string; // 'all' or project ID
  filterType: string; // 'all' or equipment type
  filterOwner: string; // 'all' or owner name
  filterMaintenance: 'all' | 'has_issues' | 'no_issues'; // filter by maintenance status
  filterExpiryDays: number | null; // null or days (show equipment expiring within X days)
  filterDateRange: {
    startDate: string | null;
    endDate: string | null;
    dateType: 'inspection' | 'insurance_expiry' | 'created';
  };
  
  // UI Actions
  setSelectedEquipment: (equipment: Equipment | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditMode: (isEdit: boolean) => void;
  setSelectedMaintenanceReport: (report: MaintenanceReport | null) => void;
  setIsMaintenanceModalOpen: (open: boolean) => void;
  setSelectedEquipmentMaintenanceReport: (report: EquipmentMaintenanceReport | null) => void;
  setIsEquipmentMaintenanceModalOpen: (open: boolean) => void;
  setSelectedMaintenanceReportForDetail: (report: EquipmentMaintenanceReport | null) => void;
  setIsMaintenanceReportDetailOpen: (open: boolean) => void;
  setSelectedMaintenanceReportForEdit: (report: EquipmentMaintenanceReport | null) => void;
  setIsEditMaintenanceReportDrawerOpen: (open: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setCurrentPage: (page: number) => void;
  setIsMobile: (isMobile: boolean) => void;
  setSearchQuery: (query: string) => void;
  setIsPhotosCollapsed: (collapsed: boolean) => void;
  setIsDocumentsCollapsed: (collapsed: boolean) => void;
  setViewerImage: (image: { url: string; title: string } | null) => void;
  setDeleteConfirmation: (state: { isOpen: boolean; equipment: Equipment | null }) => void;
  
  // Filter & Sort Actions
  setSortBy: (sortBy: EquipmentsState['sortBy']) => void;
  setSortOrder: (order: EquipmentsState['sortOrder']) => void;
  setFilterStatus: (status: EquipmentsState['filterStatus']) => void;
  setFilterProject: (projectId: string) => void;
  setFilterType: (type: string) => void;
  setFilterOwner: (owner: string) => void;
  setFilterMaintenance: (maintenance: EquipmentsState['filterMaintenance']) => void;
  setFilterExpiryDays: (days: number | null) => void;
  setFilterDateRange: (dateRange: EquipmentsState['filterDateRange']) => void;
  setItemsPerPage: (count: number) => void;
  
  // Export Actions
  exportMaintenanceReports: (filters?: ExportFilters) => Promise<void>;
  isExporting: boolean;
  setIsExporting: (exporting: boolean) => void;
  
  // Computed selectors (derived state - no re-renders)
  getFilteredEquipments: (equipments: Equipment[], maintenanceReports?: MaintenanceReport[]) => Equipment[];
  getSortedEquipments: (equipments: Equipment[]) => Equipment[];
  getPaginatedEquipments: (equipments: Equipment[]) => Equipment[];
  getTotalPages: (equipments: Equipment[]) => number;
  getEffectiveItemsPerPage: () => number;
  
  // Reset functions
  resetFilters: () => void;
  closeAllModals: () => void;
}

interface PersistedState {
  itemsPerPage: number;
  sortBy: EquipmentsState['sortBy'];
  sortOrder: EquipmentsState['sortOrder'];
  // Don't persist filters - always start fresh
}

export const useEquipmentsStore = create<EquipmentsState>()(
  // Enable subscriptions to specific slices of state
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // UI state (not persisted)
        selectedEquipment: null,
        isModalOpen: false,
        isCreateModalOpen: false,
        isEditMode: false,
        selectedMaintenanceReport: null,
        isMaintenanceModalOpen: false,
        selectedEquipmentMaintenanceReport: null,
        isEquipmentMaintenanceModalOpen: false,
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
          equipment: null,
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
        setSelectedEquipment: (equipment) => set({ selectedEquipment: equipment }),
        setIsModalOpen: (open) => set({ isModalOpen: open }),
        setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
        setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
        setSelectedMaintenanceReport: (report) => set({ selectedMaintenanceReport: report }),
        setIsMaintenanceModalOpen: (open) => set({ isMaintenanceModalOpen: open }),
        setSelectedEquipmentMaintenanceReport: (report) => set({ selectedEquipmentMaintenanceReport: report }),
        setIsEquipmentMaintenanceModalOpen: (open) => set({ isEquipmentMaintenanceModalOpen: open }),
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
            if (filters?.equipmentId && filters.equipmentId !== 'ALL_EQUIPMENTS') params.append('equipmentId', filters.equipmentId);
            if (filters?.status && filters.status !== 'ALL_STATUS') params.append('status', filters.status);
            if (filters?.priority && filters.priority !== 'ALL_PRIORITIES') params.append('priority', filters.priority);
            if (filters?.startDate) params.append('startDate', filters.startDate);
            if (filters?.endDate) params.append('endDate', filters.endDate);

            const response = await fetch(`/api/equipments/maintenance-reports/export?${params.toString()}`);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
              throw new Error(errorData.error || 'Export failed');
            }

            // Get the filename from the response headers
            const contentDisposition = response.headers.get('content-disposition');
            const filename = contentDisposition 
              ? contentDisposition.split('filename="')[1]?.split('"')[0]
              : `equipment-maintenance-reports-${new Date().toISOString().split('T')[0]}.${filters?.format || 'pdf'}`;

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
        
        // Computed selectors (accept equipments as parameter - no direct state access)
        getFilteredEquipments: (equipments: Equipment[], maintenanceReports: MaintenanceReport[] = []) => {
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
          
          let filtered = equipments;
          
          // Filter by status
          if (filterStatus !== 'all') {
            filtered = filtered.filter(equipment => equipment.status === filterStatus);
          }
          
          // Filter by project
          if (filterProject !== 'all') {
            filtered = filtered.filter(equipment => equipment.project.uid === filterProject);
          }
          
          // Filter by equipment type
          if (filterType !== 'all') {
            filtered = filtered.filter(equipment => equipment.type === filterType);
          }
          
          // Filter by owner
          if (filterOwner !== 'all') {
            filtered = filtered.filter(equipment => equipment.owner === filterOwner);
          }
          
          // Filter by maintenance status
          if (filterMaintenance !== 'all') {
            filtered = filtered.filter(equipment => {
              const hasReports = maintenanceReports.some(report => report.equipment_id === equipment.uid);
              const hasOpenIssues = maintenanceReports.some(report => 
                report.equipment_id === equipment.uid && 
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
          
          // Filter by expiry days (equipments expiring within X days)
          if (filterExpiryDays !== null && filterExpiryDays > 0) {
            const now = new Date();
            const targetDate = new Date(now.getTime() + (filterExpiryDays * 24 * 60 * 60 * 1000));
            filtered = filtered.filter(equipment => {
              if (!equipment.insuranceExpirationDate) return false;
              const expiryDate = new Date(equipment.insuranceExpirationDate);
              return expiryDate >= now && expiryDate <= targetDate;
            });
          }
          
          // Filter by date range
          if (filterDateRange.startDate || filterDateRange.endDate) {
            filtered = filtered.filter(equipment => {
              let dateToCheck: Date | null = null;
              switch (filterDateRange.dateType) {
                case 'inspection':
                  dateToCheck = equipment.inspectionDate ? new Date(equipment.inspectionDate) : null;
                  break;
                case 'insurance_expiry':
                  dateToCheck = equipment.insuranceExpirationDate ? new Date(equipment.insuranceExpirationDate) : null;
                  break;
                case 'created':
                default:
                  // Equipment doesn't have created_at in the interface, so skip date range filter for now
                  return true;
              }
              
              if (!dateToCheck) return false;
              
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
            filtered = filtered.filter(equipment => 
              equipment.brand.toLowerCase().includes(query) ||
              equipment.model.toLowerCase().includes(query) ||
              equipment.type.toLowerCase().includes(query) ||
              equipment.owner.toLowerCase().includes(query) ||
              (equipment.plateNumber && equipment.plateNumber.toLowerCase().includes(query)) ||
              equipment.project.name.toLowerCase().includes(query) ||
              equipment.project.client.name.toLowerCase().includes(query) ||
              equipment.project.client.location.address.toLowerCase().includes(query)
            );
          }
          
          return filtered;
        },
        
        getSortedEquipments: (equipments: Equipment[]) => {
          const { sortBy, sortOrder } = get();
          const filtered = get().getFilteredEquipments(equipments);
          
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
              case 'type':
                aValue = a.type.toLowerCase();
                bValue = b.type.toLowerCase();
                break;
              case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
              case 'insuranceExpirationDate':
                aValue = a.insuranceExpirationDate ? new Date(a.insuranceExpirationDate) : new Date(0);
                bValue = b.insuranceExpirationDate ? new Date(b.insuranceExpirationDate) : new Date(0);
                break;
              case 'owner':
                aValue = a.owner.toLowerCase();
                bValue = b.owner.toLowerCase();
                break;
              case 'created_at':
              default:
                // Since Equipment interface doesn't have created_at, use brand as fallback
                aValue = a.brand.toLowerCase();
                bValue = b.brand.toLowerCase();
                break;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        },
        
        getPaginatedEquipments: (equipments: Equipment[]) => {
          const { currentPage } = get();
          const sorted = get().getSortedEquipments(equipments);
          const itemsPerPage = get().getEffectiveItemsPerPage();
          const startIndex = (currentPage - 1) * itemsPerPage;
          const endIndex = startIndex + itemsPerPage;
          return sorted.slice(startIndex, endIndex);
        },
        
        getTotalPages: (equipments: Equipment[]) => {
          const sorted = get().getSortedEquipments(equipments);
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
          isEquipmentMaintenanceModalOpen: false,
          isMaintenanceReportDetailOpen: false,
          isEditMaintenanceReportDrawerOpen: false,
          isExportModalOpen: false,
          selectedEquipment: null,
          selectedMaintenanceReport: null,
          selectedEquipmentMaintenanceReport: null,
          selectedMaintenanceReportForDetail: null,
          selectedMaintenanceReportForEdit: null,
          isEditMode: false
        }),
      }),
      {
        name: 'equipments-settings',
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
export const selectSelectedEquipment = (state: EquipmentsState) => state.selectedEquipment;
export const selectIsModalOpen = (state: EquipmentsState) => state.isModalOpen;
export const selectIsCreateModalOpen = (state: EquipmentsState) => state.isCreateModalOpen;
export const selectIsEditMode = (state: EquipmentsState) => state.isEditMode;
export const selectSelectedMaintenanceReport = (state: EquipmentsState) => state.selectedMaintenanceReport;
export const selectIsMaintenanceModalOpen = (state: EquipmentsState) => state.isMaintenanceModalOpen;
export const selectSelectedEquipmentMaintenanceReport = (state: EquipmentsState) => state.selectedEquipmentMaintenanceReport;
export const selectIsEquipmentMaintenanceModalOpen = (state: EquipmentsState) => state.isEquipmentMaintenanceModalOpen;
export const selectSelectedMaintenanceReportForDetail = (state: EquipmentsState) => state.selectedMaintenanceReportForDetail;
export const selectIsMaintenanceReportDetailOpen = (state: EquipmentsState) => state.isMaintenanceReportDetailOpen;
export const selectSelectedMaintenanceReportForEdit = (state: EquipmentsState) => state.selectedMaintenanceReportForEdit;
export const selectIsEditMaintenanceReportDrawerOpen = (state: EquipmentsState) => state.isEditMaintenanceReportDrawerOpen;
export const selectCurrentPage = (state: EquipmentsState) => state.currentPage;
export const selectIsMobile = (state: EquipmentsState) => state.isMobile;
export const selectSearchQuery = (state: EquipmentsState) => state.searchQuery;
export const selectIsPhotosCollapsed = (state: EquipmentsState) => state.isPhotosCollapsed;
export const selectIsDocumentsCollapsed = (state: EquipmentsState) => state.isDocumentsCollapsed;
export const selectViewerImage = (state: EquipmentsState) => state.viewerImage;
export const selectDeleteConfirmation = (state: EquipmentsState) => state.deleteConfirmation;
export const selectItemsPerPage = (state: EquipmentsState) => state.itemsPerPage;
export const selectSortBy = (state: EquipmentsState) => state.sortBy;
export const selectSortOrder = (state: EquipmentsState) => state.sortOrder;
export const selectFilterStatus = (state: EquipmentsState) => state.filterStatus;
export const selectFilterProject = (state: EquipmentsState) => state.filterProject;
export const selectFilterType = (state: EquipmentsState) => state.filterType;
export const selectFilterOwner = (state: EquipmentsState) => state.filterOwner;
export const selectFilterMaintenance = (state: EquipmentsState) => state.filterMaintenance;
export const selectFilterExpiryDays = (state: EquipmentsState) => state.filterExpiryDays;
export const selectFilterDateRange = (state: EquipmentsState) => state.filterDateRange;

// Computed selectors that accept data as parameters
export const selectFilteredEquipments = (equipments: Equipment[]) => (state: EquipmentsState) => 
  state.getFilteredEquipments(equipments);
export const selectSortedEquipments = (equipments: Equipment[]) => (state: EquipmentsState) => 
  state.getSortedEquipments(equipments);
export const selectPaginatedEquipments = (equipments: Equipment[]) => (state: EquipmentsState) => 
  state.getPaginatedEquipments(equipments);
export const selectTotalPages = (equipments: Equipment[]) => (state: EquipmentsState) => 
  state.getTotalPages(equipments);
export const selectEffectiveItemsPerPage = (state: EquipmentsState) => state.getEffectiveItemsPerPage();

// Compound selectors for common UI needs
export const selectPaginationInfo = (equipments: Equipment[]) => (state: EquipmentsState) => ({
  currentPage: state.currentPage,
  totalPages: state.getTotalPages(equipments),
  itemsPerPage: state.getEffectiveItemsPerPage(),
  totalItems: state.getSortedEquipments(equipments).length
});

export const selectFilterInfo = (state: EquipmentsState) => ({
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
export const selectActiveFilterCount = (state: EquipmentsState) => {
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
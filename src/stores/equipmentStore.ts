import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Equipment, MaintenanceReport } from '@/types/equipment';

/**
 * Equipment UI Store - Following REALTIME_PATTERN.md
 * 
 * SIMPLE & CLEAN - UI state only, no data management.
 * TanStack Query handles all data fetching and caching.
 * 
 * This store manages:
 * - Modal states (create, view, edit)
 * - Filters (not persisted - start fresh)
 * - Pagination state
 * - Selected equipment for modal
 * - Simple filtering function
 */

interface EquipmentUIState {
  // Modal state
  isModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEditMode: boolean;
  selectedEquipment: Equipment | null;
  
  // Maintenance modal state
  isMaintenanceModalOpen: boolean;
  
  // Export modal state
  isExportModalOpen: boolean;
  
  // Mobile UI state
  isMobile: boolean;
  
  // Image viewer state
  viewerImage: { url: string; title: string } | null;
  
  // Delete confirmation state
  deleteConfirmation: {
    isOpen: boolean;
    equipment: Equipment | null;
  };
  
  // Active modal state for maintenance reports
  activeModal: string | null;

  // Unified maintenance report state - optimized for modal workflow
  selectedMaintenanceReport: MaintenanceReport | null;
  maintenanceReportMode: 'view' | 'edit' | null;
  

  // Filters (not persisted - start fresh each session)
  searchQuery: string;
  filterStatus: 'all' | 'OPERATIONAL' | 'NON_OPERATIONAL';
  filterType: string;
  filterOwner: string;
  filterProject: string;
  filterMaintenance: 'all' | 'has_issues' | 'no_issues';
  
  // Sorting
  sortBy: 'created_at' | 'brand' | 'status' | 'model' | 'owner' | 'type' | 'insuranceExpirationDate' | 'registrationExpiry' | '';
  sortOrder: 'asc' | 'desc';
  
  // Pagination (currentPage and itemsPerPage persisted as per pattern)
  currentPage: number;
  itemsPerPage: number;

  // Actions
  setIsModalOpen: (open: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditMode: (isEdit: boolean) => void;
  setSelectedEquipment: (equipment: Equipment | null) => void;
  setIsMaintenanceModalOpen: (open: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setViewerImage: (image: { url: string; title: string } | null) => void;
  setDeleteConfirmation: (state: { isOpen: boolean; equipment: Equipment | null }) => void;
  setActiveModal: (modal: string | null) => void;
  
  // Unified maintenance report actions
  setSelectedMaintenanceReport: (report: MaintenanceReport | null) => void;
  setMaintenanceReportMode: (mode: 'view' | 'edit' | null) => void;
  openMaintenanceReportView: (report: MaintenanceReport) => void;
  openMaintenanceReportEdit: (report: MaintenanceReport) => void;
  closeMaintenanceReport: () => void;
  
  
  setSearchQuery: (query: string) => void;
  setFilterStatus: (status: 'all' | 'OPERATIONAL' | 'NON_OPERATIONAL') => void;
  setFilterType: (type: string) => void;
  setFilterOwner: (owner: string) => void;
  setFilterProject: (project: string) => void;
  setFilterMaintenance: (maintenance: 'all' | 'has_issues' | 'no_issues') => void;
  setSortBy: (sortBy: EquipmentUIState['sortBy']) => void;
  setSortOrder: (order: EquipmentUIState['sortOrder']) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;

  // Utility functions
  getFilteredEquipments: (equipments: Equipment[]) => Equipment[];
  getSortedEquipments: (equipments: Equipment[]) => Equipment[];
  getPaginatedEquipments: (equipments: Equipment[]) => Equipment[];
  getTotalPages: (equipments: Equipment[]) => number;
  getEffectiveItemsPerPage: () => number;
  resetFilters: () => void;
  closeAllModals: () => void;
}

export const useEquipmentStore = create<EquipmentUIState>()(
  persist(
    (set, get) => ({
      // Modal state
      isModalOpen: false,
      isCreateModalOpen: false,
      isEditMode: false,
      selectedEquipment: null,
      
      // Maintenance modal state
      isMaintenanceModalOpen: false,
      
      // Export modal state
      isExportModalOpen: false,
      
      // Mobile UI state
      isMobile: false,
      
      // Image viewer state
      viewerImage: null,
      
      // Delete confirmation state
      deleteConfirmation: {
        isOpen: false,
        equipment: null,
      },
      
      // Active modal state
      activeModal: null,

      // Unified maintenance report state
      selectedMaintenanceReport: null,
      maintenanceReportMode: null,
      

      // Filters (not persisted)
      searchQuery: '',
      filterStatus: 'all',
      filterType: 'all',
      filterOwner: 'all',
      filterProject: 'all',
      filterMaintenance: 'all',
      
      // Sorting
      sortBy: '',
      sortOrder: 'desc',
      
      // Pagination
      currentPage: 1,
      itemsPerPage: 12,

      // Actions
      setIsModalOpen: (open) => set({ isModalOpen: open }),
      setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
      setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
      setSelectedEquipment: (equipment) => set({ selectedEquipment: equipment }),
      setIsMaintenanceModalOpen: (open) => set({ isMaintenanceModalOpen: open }),
      setIsExportModalOpen: (open) => set({ isExportModalOpen: open }),
      setIsMobile: (mobile) => set({ isMobile: mobile }),
      setViewerImage: (image) => set({ viewerImage: image }),
      setDeleteConfirmation: (state) => set({ deleteConfirmation: state }),
      setActiveModal: (modal) => set({ activeModal: modal }),
      
      // Unified maintenance report actions
      setSelectedMaintenanceReport: (report) => set({ selectedMaintenanceReport: report }),
      setMaintenanceReportMode: (mode) => set({ maintenanceReportMode: mode }),
      
      openMaintenanceReportView: (report) => {
        set({
          selectedMaintenanceReport: report,
          maintenanceReportMode: 'view',
          activeModal: 'maintenance-view',
          // Ensure equipment modal is closed
          isModalOpen: false,
          selectedEquipment: null,
        });
      },
      
      openMaintenanceReportEdit: (report) => set({
        selectedMaintenanceReport: report,
        maintenanceReportMode: 'edit',
        activeModal: 'maintenance-edit',
        // Ensure other modals are closed
        isModalOpen: false,
        isMaintenanceModalOpen: false,
      }),
      
      closeMaintenanceReport: () => set({
        selectedMaintenanceReport: null,
        maintenanceReportMode: null,
        activeModal: null,
      }),
      
      
      setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
      setFilterStatus: (status) => set({ filterStatus: status, currentPage: 1 }),
      setFilterType: (type) => set({ filterType: type, currentPage: 1 }),
      setFilterOwner: (owner) => set({ filterOwner: owner, currentPage: 1 }),
      setFilterProject: (project) => set({ filterProject: project, currentPage: 1 }),
      setFilterMaintenance: (maintenance) => set({ filterMaintenance: maintenance, currentPage: 1 }),
      setSortBy: (sortBy) => set({ sortBy: sortBy, currentPage: 1 }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),

      // Simple filtering function that works with Equipment[] arrays
      getFilteredEquipments: (equipments: Equipment[]) => {
        const { searchQuery, filterStatus, filterType, filterOwner, filterProject, filterMaintenance } = get();
        
        let filtered = equipments;
        
        // Filter by status
        if (filterStatus !== 'all') {
          filtered = filtered.filter(equipment => equipment.status === filterStatus);
        }
        
        // Filter by type
        if (filterType !== 'all') {
          filtered = filtered.filter(equipment => equipment.type === filterType);
        }
        
        // Filter by owner
        if (filterOwner !== 'all') {
          filtered = filtered.filter(equipment => equipment.owner === filterOwner);
        }
        
        // Filter by project
        if (filterProject !== 'all') {
          filtered = filtered.filter(equipment => equipment.project_id === filterProject);
        }
        
        // Filter by maintenance status
        if (filterMaintenance !== 'all') {
          filtered = filtered.filter(equipment => {
            const hasIssues = equipment.maintenance_reports && equipment.maintenance_reports.length > 0;
            return filterMaintenance === 'has_issues' ? hasIssues : !hasIssues;
          });
        }
        
        // Filter by search query (brand, model, owner)
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(equipment =>
            equipment.brand.toLowerCase().includes(query) ||
            equipment.model.toLowerCase().includes(query) ||
            equipment.owner.toLowerCase().includes(query) ||
            (equipment.plate_number && equipment.plate_number.toLowerCase().includes(query)) ||
            equipment.project.name.toLowerCase().includes(query) ||
            equipment.project.client.name.toLowerCase().includes(query) ||
            equipment.project.client.location.address.toLowerCase().includes(query)
          );
        }
        
        return filtered;
      },

      // Sorting function
      getSortedEquipments: (equipments: Equipment[]) => {
        const { sortBy, sortOrder } = get();
        
        if (!sortBy) return equipments;
        
        return [...equipments].sort((a, b) => {
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
            case 'owner':
              aValue = a.owner.toLowerCase();
              bValue = b.owner.toLowerCase();
              break;
            case 'type':
              aValue = a.type.toLowerCase();
              bValue = b.type.toLowerCase();
              break;
            case 'status':
              aValue = a.status;
              bValue = b.status;
              break;
            case 'created_at':
              aValue = new Date(a.created_at);
              bValue = new Date(b.created_at);
              break;
            case 'insuranceExpirationDate':
              aValue = a.insurance_expiration_date ? new Date(a.insurance_expiration_date) : new Date(0);
              bValue = b.insurance_expiration_date ? new Date(b.insurance_expiration_date) : new Date(0);
              break;
            case 'registrationExpiry':
              aValue = a.registration_expiry ? new Date(a.registration_expiry) : new Date(0);
              bValue = b.registration_expiry ? new Date(b.registration_expiry) : new Date(0);
              break;
            default:
              return 0;
          }
          
          if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
          if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      },

      // Pagination function
      getPaginatedEquipments: (equipments: Equipment[]) => {
        const { currentPage, itemsPerPage } = get();
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return equipments.slice(startIndex, endIndex);
      },

      // Get total pages
      getTotalPages: (equipments: Equipment[]) => {
        const { itemsPerPage } = get();
        return Math.ceil(equipments.length / itemsPerPage);
      },

      // Get effective items per page
      getEffectiveItemsPerPage: () => {
        const { itemsPerPage } = get();
        return itemsPerPage;
      },

      // Reset all filters
      resetFilters: () => set({
        searchQuery: '',
        filterStatus: 'all',
        filterType: 'all',
        filterOwner: 'all',
        filterProject: 'all',
        filterMaintenance: 'all',
        currentPage: 1,
      }),

      // Close all modals with proper cleanup
      closeAllModals: () => set({
        isModalOpen: false,
        isCreateModalOpen: false,
        isEditMode: false,
        isMaintenanceModalOpen: false,
        isExportModalOpen: false,
        selectedEquipment: null,
        activeModal: null,
        viewerImage: null,
        deleteConfirmation: {
          isOpen: false,
          equipment: null,
        },
        // Clean up maintenance report state
        selectedMaintenanceReport: null,
        maintenanceReportMode: null,
      }),
    }),
    {
      name: 'equipment-ui-settings',
      // Only persist UI preferences (currentPage, itemsPerPage), not filters
      partialize: (state) => ({
        currentPage: state.currentPage,
        itemsPerPage: state.itemsPerPage,
      }),
    }
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const selectIsModalOpen = (state: EquipmentUIState) => state.isModalOpen;
export const selectIsCreateModalOpen = (state: EquipmentUIState) => state.isCreateModalOpen;
export const selectIsEditMode = (state: EquipmentUIState) => state.isEditMode;
export const selectSelectedEquipment = (state: EquipmentUIState) => state.selectedEquipment;
export const selectIsMaintenanceModalOpen = (state: EquipmentUIState) => state.isMaintenanceModalOpen;
export const selectIsMobile = (state: EquipmentUIState) => state.isMobile;
export const selectViewerImage = (state: EquipmentUIState) => state.viewerImage;
export const selectDeleteConfirmation = (state: EquipmentUIState) => state.deleteConfirmation;
export const selectActiveModal = (state: EquipmentUIState) => state.activeModal;

// Maintenance Report Selectors - Optimized for performance
export const selectSelectedMaintenanceReport = (state: EquipmentUIState) => state.selectedMaintenanceReport;
export const selectMaintenanceReportMode = (state: EquipmentUIState) => state.maintenanceReportMode;
export const selectIsMaintenanceReportViewOpen = (state: EquipmentUIState) => 
  state.maintenanceReportMode === 'view' && state.activeModal === 'maintenance-view';
export const selectIsMaintenanceReportEditOpen = (state: EquipmentUIState) => 
  state.maintenanceReportMode === 'edit' && state.activeModal === 'maintenance-edit';


// Filter and Pagination Selectors
export const selectSearchQuery = (state: EquipmentUIState) => state.searchQuery;
export const selectFilterStatus = (state: EquipmentUIState) => state.filterStatus;
export const selectFilterType = (state: EquipmentUIState) => state.filterType;
export const selectFilterOwner = (state: EquipmentUIState) => state.filterOwner;
export const selectFilterProject = (state: EquipmentUIState) => state.filterProject;
export const selectFilterMaintenance = (state: EquipmentUIState) => state.filterMaintenance;
export const selectSortBy = (state: EquipmentUIState) => state.sortBy;
export const selectSortOrder = (state: EquipmentUIState) => state.sortOrder;
export const selectCurrentPage = (state: EquipmentUIState) => state.currentPage;
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Equipment } from '@/types/equipment';

/**
 * Simple Equipment Store - UI State Only
 * 
 * This store only handles UI state (modals, pagination, filters).
 * Data state is handled by TanStack Query + Supabase Realtime.
 * 
 * SIMPLE & CLEAN - No complex data transformations or computed state.
 */

interface EquipmentUIState {
  // Modal State
  selectedEquipment: Equipment | null;
  isModalOpen: boolean;
  isCreateModalOpen: boolean;
  isEditMode: boolean;
  isExportModalOpen: boolean;
  
  // Image Viewer
  viewerImage: { url: string; title: string } | null;
  
  // Delete Confirmation
  deleteConfirmation: {
    isOpen: boolean;
    equipment: Equipment | null;
  };
  
  // UI Preferences (persisted)
  currentPage: number;
  itemsPerPage: number;
  isMobile: boolean;
  
  // Filters & Search (not persisted - start fresh each session)
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filterStatus: 'all' | 'OPERATIONAL' | 'NON_OPERATIONAL';
  filterProject: string;
  filterType: string;
  filterOwner: string;
  filterMaintenance: 'all' | 'has_issues' | 'no_issues';
  
  // Actions
  setSelectedEquipment: (equipment: Equipment | null) => void;
  setIsModalOpen: (open: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditMode: (isEdit: boolean) => void;
  setIsExportModalOpen: (open: boolean) => void;
  setViewerImage: (image: { url: string; title: string } | null) => void;
  setDeleteConfirmation: (state: { isOpen: boolean; equipment: Equipment | null }) => void;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  setIsMobile: (isMobile: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sortBy: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setFilterStatus: (status: 'all' | 'OPERATIONAL' | 'NON_OPERATIONAL') => void;
  setFilterProject: (projectId: string) => void;
  setFilterType: (type: string) => void;
  setFilterOwner: (owner: string) => void;
  setFilterMaintenance: (maintenance: 'all' | 'has_issues' | 'no_issues') => void;
  
  // Utility Functions
  resetFilters: () => void;
  closeAllModals: () => void;
  getFilteredEquipments: (equipments: Equipment[]) => Equipment[];
  getEffectiveItemsPerPage: () => number;
}

export const useEquipmentStore = create<EquipmentUIState>()(
  persist(
    (set, get) => ({
      // UI State (not persisted)
      selectedEquipment: null,
      isModalOpen: false,
      isCreateModalOpen: false,
      isEditMode: false,
      isExportModalOpen: false,
      viewerImage: null,
      deleteConfirmation: {
        isOpen: false,
        equipment: null,
      },
      
      // UI Preferences (persisted)
      currentPage: 1,
      itemsPerPage: 12,
      isMobile: false,
      
      // Filters & Search (not persisted)
      searchQuery: '',
      sortBy: '',
      sortOrder: 'desc',
      filterStatus: 'all',
      filterProject: 'all',
      filterType: 'all',
      filterOwner: 'all',
      filterMaintenance: 'all',
      
      // Actions
      setSelectedEquipment: (equipment) => set({ selectedEquipment: equipment }),
      setIsModalOpen: (open) => set({ isModalOpen: open }),
      setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
      setIsEditMode: (isEdit) => set({ isEditMode: isEdit }),
      setIsExportModalOpen: (open) => set({ isExportModalOpen: open }),
      setViewerImage: (image) => set({ viewerImage: image }),
      setDeleteConfirmation: (state) => set({ deleteConfirmation: state }),
      setCurrentPage: (page) => set({ currentPage: page }),
      setItemsPerPage: (count) => set({ itemsPerPage: count, currentPage: 1 }),
      setIsMobile: (isMobile) => set({ isMobile }),
      setSearchQuery: (query) => set({ searchQuery: query, currentPage: 1 }),
      setSortBy: (sortBy) => set({ sortBy, currentPage: 1 }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setFilterStatus: (status) => set({ filterStatus: status, currentPage: 1 }),
      setFilterProject: (projectId) => set({ filterProject: projectId, currentPage: 1 }),
      setFilterType: (type) => set({ filterType: type, currentPage: 1 }),
      setFilterOwner: (owner) => set({ filterOwner: owner, currentPage: 1 }),
      setFilterMaintenance: (maintenance) => set({ filterMaintenance: maintenance, currentPage: 1 }),
      
      // Utility Functions
      resetFilters: () => set({
        searchQuery: '',
        sortBy: '',
        sortOrder: 'desc',
        filterStatus: 'all',
        filterProject: 'all',
        filterType: 'all',
        filterOwner: 'all',
        filterMaintenance: 'all',
        currentPage: 1,
      }),
      
      closeAllModals: () => set({
        isModalOpen: false,
        isCreateModalOpen: false,
        isExportModalOpen: false,
        selectedEquipment: null,
        isEditMode: false,
        viewerImage: null,
        deleteConfirmation: { isOpen: false, equipment: null },
      }),
      
      // Simple filtering function
      getFilteredEquipments: (equipments: Equipment[]) => {
        const { 
          searchQuery, 
          filterStatus, 
          filterType, 
          filterOwner,
          sortBy,
          sortOrder 
        } = get();
        
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
        
        // Filter by search query
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(equipment => 
            equipment.brand.toLowerCase().includes(query) ||
            equipment.model.toLowerCase().includes(query) ||
            equipment.type.toLowerCase().includes(query) ||
            equipment.owner.toLowerCase().includes(query) ||
            (equipment.plate_number && equipment.plate_number.toLowerCase().includes(query)) ||
            equipment.project.name.toLowerCase().includes(query) ||
            equipment.project.client.name.toLowerCase().includes(query) ||
            equipment.project.client.location.address.toLowerCase().includes(query)
          );
        }
        
        // Apply sorting
        if (sortBy) {
          filtered = [...filtered].sort((a, b) => {
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
              case 'type':
                aValue = a.type.toLowerCase();
                bValue = b.type.toLowerCase();
                break;
              case 'status':
                aValue = a.status;
                bValue = b.status;
                break;
              case 'owner':
                aValue = a.owner.toLowerCase();
                bValue = b.owner.toLowerCase();
                break;
              case 'insuranceExpirationDate':
                aValue = a.insurance_expiration_date ? new Date(a.insurance_expiration_date).getTime() : 0;
                bValue = b.insurance_expiration_date ? new Date(b.insurance_expiration_date).getTime() : 0;
                break;
              case 'registrationExpiry':
                aValue = a.registration_expiry ? new Date(a.registration_expiry).getTime() : 0;
                bValue = b.registration_expiry ? new Date(b.registration_expiry).getTime() : 0;
                break;
              default:
                return 0;
            }
            
            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
          });
        }
        
        return filtered;
      },
      
      getEffectiveItemsPerPage: () => {
        const { isMobile, itemsPerPage } = get();
        return isMobile ? 6 : itemsPerPage;
      },
    }),
    {
      name: 'equipment-ui-settings',
      // Only persist UI preferences, not state or filters
      partialize: (state) => ({
        itemsPerPage: state.itemsPerPage,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
      }),
    }
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const selectSelectedEquipment = (state: EquipmentUIState) => state.selectedEquipment;
export const selectIsModalOpen = (state: EquipmentUIState) => state.isModalOpen;
export const selectIsCreateModalOpen = (state: EquipmentUIState) => state.isCreateModalOpen;
export const selectIsEditMode = (state: EquipmentUIState) => state.isEditMode;
export const selectIsExportModalOpen = (state: EquipmentUIState) => state.isExportModalOpen;
export const selectViewerImage = (state: EquipmentUIState) => state.viewerImage;
export const selectDeleteConfirmation = (state: EquipmentUIState) => state.deleteConfirmation;
export const selectCurrentPage = (state: EquipmentUIState) => state.currentPage;
export const selectIsMobile = (state: EquipmentUIState) => state.isMobile;
export const selectSearchQuery = (state: EquipmentUIState) => state.searchQuery;
export const selectSortBy = (state: EquipmentUIState) => state.sortBy;
export const selectSortOrder = (state: EquipmentUIState) => state.sortOrder;
export const selectFilterStatus = (state: EquipmentUIState) => state.filterStatus;
export const selectFilterProject = (state: EquipmentUIState) => state.filterProject;
export const selectFilterType = (state: EquipmentUIState) => state.filterType;
export const selectFilterOwner = (state: EquipmentUIState) => state.filterOwner;
export const selectFilterMaintenance = (state: EquipmentUIState) => state.filterMaintenance;
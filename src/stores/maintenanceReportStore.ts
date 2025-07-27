import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Simple Maintenance Report Store - UI State Only
 * 
 * This store only handles UI state (modals, tabs, form state).
 * Data state is handled by TanStack Query + Supabase Realtime.
 * 
 * SIMPLE & CLEAN - Following REALTIME_PATTERN.md
 */

type MaintenanceReportTab = 'details' | 'parts' | 'attachments';

interface MaintenanceReportFormData {
  issue_description: string;
  remarks: string;
  inspection_details: string;
  action_taken: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REPORTED';
  downtime_hours: string;
  location_id: string;
  parts_replaced: string[];
  attachment_urls: string[];
  repaired_by: string;
}

interface MaintenanceReportUIState {
  // Modal State
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  selectedReportId: string | null;
  
  // Tab State
  activeTab: MaintenanceReportTab;
  
  // Form State
  formData: MaintenanceReportFormData;
  partsFiles: File[];
  attachmentFiles: File[];
  
  // Actions
  setIsCreateModalOpen: (open: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  setSelectedReportId: (id: string | null) => void;
  setActiveTab: (tab: MaintenanceReportTab) => void;
  
  // Form Actions
  updateFormData: (field: keyof MaintenanceReportFormData, value: any) => void;
  updateArrayField: (field: 'parts_replaced' | 'attachment_urls', index: number, value: string) => void;
  addArrayItem: (field: 'parts_replaced' | 'attachment_urls') => void;
  removeArrayItem: (field: 'parts_replaced' | 'attachment_urls', index: number) => void;
  setPartsFiles: (files: File[]) => void;
  setAttachmentFiles: (files: File[]) => void;
  
  // Utility Functions
  resetForm: () => void;
  closeAllModals: () => void;
  getPartsCount: () => number;
  getAttachmentsCount: () => number;
}

const initialFormData: MaintenanceReportFormData = {
  issue_description: '',
  remarks: '',
  inspection_details: '',
  action_taken: '',
  priority: 'MEDIUM',
  status: 'REPORTED',
  downtime_hours: '',
  location_id: '',
  parts_replaced: [''],
  attachment_urls: [''],
  repaired_by: '',
};

export const useMaintenanceReportStore = create<MaintenanceReportUIState>()(
  persist(
    (set, get) => ({
      // UI State (not persisted)
      isCreateModalOpen: false,
      isEditModalOpen: false,
      selectedReportId: null,
      activeTab: 'details',
      formData: initialFormData,
      partsFiles: [],
      attachmentFiles: [],
      
      // Actions
      setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
      setIsEditModalOpen: (open) => set({ isEditModalOpen: open }),
      setSelectedReportId: (id) => set({ selectedReportId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      // Form Actions
      updateFormData: (field, value) => set((state) => ({
        formData: { ...state.formData, [field]: value }
      })),
      
      updateArrayField: (field, index, value) => set((state) => ({
        formData: {
          ...state.formData,
          [field]: state.formData[field].map((item, i) => i === index ? value : item)
        }
      })),
      
      addArrayItem: (field) => set((state) => ({
        formData: {
          ...state.formData,
          [field]: [...state.formData[field], '']
        }
      })),
      
      removeArrayItem: (field, index) => set((state) => ({
        formData: {
          ...state.formData,
          [field]: state.formData[field].filter((_, i) => i !== index)
        }
      })),
      
      setPartsFiles: (files) => set({ partsFiles: files }),
      setAttachmentFiles: (files) => set({ attachmentFiles: files }),
      
      // Utility Functions
      resetForm: () => set({
        formData: initialFormData,
        partsFiles: [],
        attachmentFiles: [],
        activeTab: 'details',
      }),
      
      closeAllModals: () => set({
        isCreateModalOpen: false,
        isEditModalOpen: false,
        selectedReportId: null,
      }),
      
      getPartsCount: () => {
        const { formData, partsFiles } = get();
        const partsWithFiles = partsFiles.filter(file => file !== null).length;
        const partsWithText = formData.parts_replaced.filter(part => part.trim() !== '').length;
        return Math.max(partsWithFiles, partsWithText);
      },
      
      getAttachmentsCount: () => {
        const { formData, attachmentFiles } = get();
        const filesCount = attachmentFiles.filter(file => file !== null).length;
        const urlsCount = formData.attachment_urls.filter(url => url.trim() !== '').length;
        return filesCount + urlsCount;
      },
    }),
    {
      name: 'maintenance-report-ui-settings',
      // Only persist tab preference
      partialize: (state) => ({
        activeTab: state.activeTab,
      }),
    }
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const selectIsCreateModalOpen = (state: MaintenanceReportUIState) => state.isCreateModalOpen;
export const selectIsEditModalOpen = (state: MaintenanceReportUIState) => state.isEditModalOpen;
export const selectActiveTab = (state: MaintenanceReportUIState) => state.activeTab;
export const selectFormData = (state: MaintenanceReportUIState) => state.formData;
export const selectPartsFiles = (state: MaintenanceReportUIState) => state.partsFiles;
export const selectAttachmentFiles = (state: MaintenanceReportUIState) => state.attachmentFiles;
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { LocationTableState, ClientTableState, ProjectTableState } from '@/types/projects'

interface ProjectsUIState {
  // Location Management
  locationTable: LocationTableState
  isLocationModalOpen: boolean
  editingLocationId: string | null
  
  // Client Management  
  clientTable: ClientTableState
  isClientModalOpen: boolean
  editingClientId: string | null
  
  // Project Management
  projectTable: ProjectTableState
  isProjectModalOpen: boolean
  editingProjectId: string | null
  
  // Navigation State
  selectedLocationId: string | null
  selectedClientId: string | null
  
  // UI State
  currentView: 'locations' | 'clients' | 'projects'
  isMobile: boolean
  
  // Actions
  setLocationTable: (state: Partial<LocationTableState>) => void
  setLocationModal: (open: boolean, editingId?: string | null) => void
  
  setClientTable: (state: Partial<ClientTableState>) => void
  setClientModal: (open: boolean, editingId?: string | null) => void
  
  setProjectTable: (state: Partial<ProjectTableState>) => void
  setProjectModal: (open: boolean, editingId?: string | null) => void
  
  setSelectedLocation: (locationId: string | null) => void
  setSelectedClient: (clientId: string | null) => void
  
  setCurrentView: (view: 'locations' | 'clients' | 'projects') => void
  setIsMobile: (isMobile: boolean) => void
  
  // Computed getters
  getFilteredLocationTable: () => LocationTableState
  getFilteredClientTable: () => ClientTableState
  getFilteredProjectTable: () => ProjectTableState
  
  // Pagination helpers
  getEffectiveLocationItemsPerPage: () => number
  getEffectiveClientItemsPerPage: () => number
  getEffectiveProjectItemsPerPage: () => number
  
  // Reset functions
  resetLocationTable: () => void
  resetClientTable: () => void
  resetProjectTable: () => void
  resetAll: () => void
}

// Initial states
const initialLocationTable: LocationTableState = {
  search: '',
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
}

const initialClientTable: ClientTableState = {
  search: '',
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
  location_id: undefined,
}

const initialProjectTable: ProjectTableState = {
  search: '',
  page: 1,
  limit: 10,
  sortBy: 'created_at',
  sortOrder: 'desc',
  client_id: undefined,
}

export const useProjectsStore = create<ProjectsUIState>()(
  devtools(
    (set, get) => ({
      // Initial State
      locationTable: initialLocationTable,
      isLocationModalOpen: false,
      editingLocationId: null,
      
      clientTable: initialClientTable,
      isClientModalOpen: false,
      editingClientId: null,
      
      projectTable: initialProjectTable,
      isProjectModalOpen: false,
      editingProjectId: null,
      
      selectedLocationId: null,
      selectedClientId: null,
      currentView: 'locations',
      isMobile: false,
      
      // Location Actions
      setLocationTable: (state) =>
        set((prev) => ({
          locationTable: { ...prev.locationTable, ...state }
        }), false, 'setLocationTable'),
      
      setLocationModal: (open, editingId = null) =>
        set({
          isLocationModalOpen: open,
          editingLocationId: editingId,
        }, false, 'setLocationModal'),
      
      // Client Actions
      setClientTable: (state) =>
        set((prev) => ({
          clientTable: { ...prev.clientTable, ...state }
        }), false, 'setClientTable'),
      
      setClientModal: (open, editingId = null) =>
        set({
          isClientModalOpen: open,
          editingClientId: editingId,
        }, false, 'setClientModal'),
      
      // Project Actions
      setProjectTable: (state) =>
        set((prev) => ({
          projectTable: { ...prev.projectTable, ...state }
        }), false, 'setProjectTable'),
      
      setProjectModal: (open, editingId = null) =>
        set({
          isProjectModalOpen: open,
          editingProjectId: editingId,
        }, false, 'setProjectModal'),
      
      // Navigation Actions
      setSelectedLocation: (locationId) =>
        set((prev) => ({
          ...prev,
          selectedLocationId: locationId,
          // Reset client selection when location changes
          selectedClientId: null,
          // Update client table filter
          clientTable: {
            ...prev.clientTable,
            location_id: locationId || undefined,
            page: 1, // Reset to first page
          },
          // Update project table filter (clear client filter)
          projectTable: {
            ...prev.projectTable,
            client_id: undefined,
            page: 1,
          }
        }), false, 'setSelectedLocation'),
      
      setSelectedClient: (clientId) =>
        set((prev) => ({
          ...prev,
          selectedClientId: clientId,
          // Update project table filter
          projectTable: {
            ...prev.projectTable,
            client_id: clientId || undefined,
            page: 1, // Reset to first page
          }
        }), false, 'setSelectedClient'),
      
      setCurrentView: (view) =>
        set({ currentView: view }, false, 'setCurrentView'),
      
      setIsMobile: (isMobile) =>
        set({ isMobile }, false, 'setIsMobile'),
      
      // Computed getters
      getFilteredLocationTable: () => {
        const state = get()
        return state.locationTable
      },
      
      getFilteredClientTable: () => {
        const state = get()
        return {
          ...state.clientTable,
          location_id: state.selectedLocationId || state.clientTable.location_id,
        }
      },
      
      getFilteredProjectTable: () => {
        const state = get()
        return {
          ...state.projectTable,
          client_id: state.selectedClientId || state.projectTable.client_id,
        }
      },
      
      // Pagination helpers
      getEffectiveLocationItemsPerPage: () => {
        const { isMobile, locationTable } = get()
        return isMobile ? 6 : locationTable.limit
      },
      
      getEffectiveClientItemsPerPage: () => {
        const { isMobile, clientTable } = get()
        return isMobile ? 6 : clientTable.limit
      },
      
      getEffectiveProjectItemsPerPage: () => {
        const { isMobile, projectTable } = get()
        return isMobile ? 6 : projectTable.limit
      },
      
      // Reset functions
      resetLocationTable: () =>
        set({ locationTable: initialLocationTable }, false, 'resetLocationTable'),
      
      resetClientTable: () =>
        set({ clientTable: initialClientTable }, false, 'resetClientTable'),
      
      resetProjectTable: () =>
        set({ projectTable: initialProjectTable }, false, 'resetProjectTable'),
      
      resetAll: () =>
        set({
          locationTable: initialLocationTable,
          clientTable: initialClientTable,
          projectTable: initialProjectTable,
          selectedLocationId: null,
          selectedClientId: null,
          currentView: 'locations',
          isLocationModalOpen: false,
          editingLocationId: null,
          isClientModalOpen: false,
          editingClientId: null,
          isProjectModalOpen: false,
          editingProjectId: null,
        }, false, 'resetAll'),
    }),
    {
      name: 'projects-store',
    }
  )
)

// Selector hooks for better performance
export const useLocationTable = () => useProjectsStore((state) => state.locationTable)
export const useClientTable = () => useProjectsStore((state) => state.clientTable)  
export const useProjectTable = () => useProjectsStore((state) => state.projectTable)

export const useLocationModal = () => useProjectsStore((state) => ({
  isOpen: state.isLocationModalOpen,
  editingId: state.editingLocationId,
  setModal: state.setLocationModal,
}))

export const useClientModal = () => useProjectsStore((state) => ({
  isOpen: state.isClientModalOpen,
  editingId: state.editingClientId,
  setModal: state.setClientModal,
}))

export const useProjectModal = () => useProjectsStore((state) => ({
  isOpen: state.isProjectModalOpen,
  editingId: state.editingProjectId,
  setModal: state.setProjectModal,
}))

// Individual selectors to avoid infinite loops
export const useSelectedLocationId = () => useProjectsStore(state => state.selectedLocationId)
export const useSelectedClientId = () => useProjectsStore(state => state.selectedClientId)
export const useCurrentView = () => useProjectsStore(state => state.currentView)
export const useSetSelectedLocation = () => useProjectsStore(state => state.setSelectedLocation)
export const useSetSelectedClient = () => useProjectsStore(state => state.setSelectedClient)
export const useSetCurrentView = () => useProjectsStore(state => state.setCurrentView)

// Combined hook for convenience (with proper memoization)
export const useProjectsNavigation = () => {
  const selectedLocationId = useSelectedLocationId()
  const selectedClientId = useSelectedClientId()
  const currentView = useCurrentView()
  const setSelectedLocation = useSetSelectedLocation()
  const setSelectedClient = useSetSelectedClient()
  const setCurrentView = useSetCurrentView()
  
  return {
    selectedLocationId,
    selectedClientId,
    currentView,
    setSelectedLocation,
    setSelectedClient,
    setCurrentView,
  }
}
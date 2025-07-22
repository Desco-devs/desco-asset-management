'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, UserFiltersSchema } from '@/types/users'

interface UserModalState {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  user: User | null
}

interface UsersStore {
  // UI State
  modalState: UserModalState
  selectedUsers: string[]
  tableView: 'table' | 'grid'
  
  // Filters & Preferences (persisted)
  filters: UserFiltersSchema
  sortBy: 'created_at' | 'full_name' | 'username' | 'role'
  sortOrder: 'asc' | 'desc'
  
  // Computed values
  hasActiveFilters: boolean
  
  // Actions
  setModalState: (state: Partial<UserModalState>) => void
  openCreateModal: () => void
  openEditModal: (user: User) => void
  openViewModal: (user: User) => void
  closeModal: () => void
  
  setSelectedUsers: (userIds: string[]) => void
  toggleUserSelection: (userId: string) => void
  clearSelection: () => void
  
  setTableView: (view: 'table' | 'grid') => void
  
  setFilters: (filters: Partial<UserFiltersSchema>) => void
  clearFilters: () => void
  setSortBy: (sortBy: 'created_at' | 'full_name' | 'username' | 'role') => void
  setSortOrder: (order: 'asc' | 'desc') => void
  
  // Batch actions
  resetUIState: () => void
}

const initialFilters: UserFiltersSchema = {
  limit: 50,
  offset: 0,
}

const initialModalState: UserModalState = {
  isOpen: false,
  mode: 'create',
  user: null,
}

export const useUsersStore = create<UsersStore>()(
  persist(
    (set, get) => ({
      // Initial state
      modalState: initialModalState,
      selectedUsers: [],
      tableView: 'table',
      filters: initialFilters,
      sortBy: 'created_at',
      sortOrder: 'desc',
      
      // Computed values
      get hasActiveFilters() {
        const { filters } = get()
        return !!(filters.search || filters.role || filters.status)
      },
      
      // Modal actions
      setModalState: (state) => set((prev) => ({
        modalState: { ...prev.modalState, ...state }
      })),
      
      openCreateModal: () => set({
        modalState: { isOpen: true, mode: 'create', user: null }
      }),
      
      openEditModal: (user) => set({
        modalState: { isOpen: true, mode: 'edit', user }
      }),
      
      openViewModal: (user) => set({
        modalState: { isOpen: true, mode: 'view', user }
      }),
      
      closeModal: () => set({
        modalState: initialModalState
      }),
      
      // Selection actions
      setSelectedUsers: (userIds) => set({ selectedUsers: userIds }),
      
      toggleUserSelection: (userId) => set((state) => ({
        selectedUsers: state.selectedUsers.includes(userId)
          ? state.selectedUsers.filter(id => id !== userId)
          : [...state.selectedUsers, userId]
      })),
      
      clearSelection: () => set({ selectedUsers: [] }),
      
      // View actions
      setTableView: (view) => set({ tableView: view }),
      
      // Filter actions
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters, offset: 0 }
      })),
      
      clearFilters: () => set({ filters: initialFilters }),
      
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (sortOrder) => set({ sortOrder }),
      
      // Reset actions
      resetUIState: () => set({
        modalState: initialModalState,
        selectedUsers: [],
        tableView: 'table',
      }),
    }),
    {
      name: 'users-store',
      // Only persist user preferences, not UI state
      partialize: (state) => ({
        filters: state.filters,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        tableView: state.tableView,
      }),
    }
  )
)

// Selectors for specific state slices
export const useUserModalState = () => useUsersStore(state => state.modalState)
export const useUserFilters = () => useUsersStore(state => state.filters)
export const useUserSelection = () => useUsersStore(state => ({
  selectedUsers: state.selectedUsers,
  toggleUserSelection: state.toggleUserSelection,
  clearSelection: state.clearSelection,
}))
export const useUserPreferences = () => useUsersStore(state => ({
  tableView: state.tableView,
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  setTableView: state.setTableView,
  setSortBy: state.setSortBy,
  setSortOrder: state.setSortOrder,
}))
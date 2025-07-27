'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types/users'

interface UserModalState {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  user: User | null
}

interface UsersUIState {
  // Modal state
  isModalOpen: boolean
  isCreateModalOpen: boolean
  selectedUser: User | null
  modalMode: 'create' | 'edit' | 'view'

  // Filters (not persisted - start fresh)
  searchQuery: string
  filterRole: string
  filterStatus: string

  // Actions
  setIsModalOpen: (open: boolean) => void
  setSelectedUser: (user: User | null) => void
  setModalMode: (mode: 'create' | 'edit' | 'view') => void
  setSearchQuery: (query: string) => void
  setFilterRole: (role: string) => void
  setFilterStatus: (status: string) => void

  // Utility functions
  getFilteredUsers: (users: User[]) => User[]
  resetFilters: () => void

  // Combined modal actions for convenience
  openCreateModal: () => void
  openEditModal: (user: User) => void
  openViewModal: (user: User) => void
  closeModal: () => void
}

export const useUsersStore = create<UsersUIState>()(
  persist(
    (set, get) => ({
      // State
      isModalOpen: false,
      isCreateModalOpen: false,
      selectedUser: null,
      modalMode: 'create',
      searchQuery: '',
      filterRole: '',
      filterStatus: '',

      // Actions
      setIsModalOpen: (open) => set({ isModalOpen: open }),
      setSelectedUser: (user) => set({ selectedUser: user }),
      setModalMode: (mode) => set({ modalMode: mode }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterRole: (role) => set({ filterRole: role }),
      setFilterStatus: (status) => set({ filterStatus: status }),

      // Utility
      getFilteredUsers: (users) => {
        const { searchQuery, filterRole, filterStatus } = get()
        return users.filter(user => {
          const matchesSearch = !searchQuery || 
            user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
          
          const matchesRole = !filterRole || user.role === filterRole
          const matchesStatus = !filterStatus || user.user_status === filterStatus
          
          return matchesSearch && matchesRole && matchesStatus
        })
      },

      resetFilters: () => set({ 
        searchQuery: '', 
        filterRole: '', 
        filterStatus: '' 
      }),

      // Combined actions
      openCreateModal: () => set({ 
        isModalOpen: true, 
        modalMode: 'create', 
        selectedUser: null 
      }),
      
      openEditModal: (user) => set({ 
        isModalOpen: true, 
        modalMode: 'edit', 
        selectedUser: user 
      }),
      
      openViewModal: (user) => set({ 
        isModalOpen: true, 
        modalMode: 'view', 
        selectedUser: user 
      }),
      
      closeModal: () => set({ 
        isModalOpen: false, 
        selectedUser: null 
      }),
    }),
    {
      name: 'users-ui-settings',
      partialize: (state) => ({
        // Only persist UI preferences, not temporary state
      }),
    }
  )
)
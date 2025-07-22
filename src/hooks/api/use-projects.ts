'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { 
  Location, 
  Client, 
  Project, 
  CreateLocationData, 
  CreateClientData, 
  CreateProjectData,
  UpdateLocationData,
  UpdateClientData,
  UpdateProjectData
} from '@/types/projects'

// Query Keys
export const projectsKeys = {
  all: ['projects'] as const,
  locations: () => [...projectsKeys.all, 'locations'] as const,
  clients: () => [...projectsKeys.all, 'clients'] as const,
  projects: () => [...projectsKeys.all, 'projects'] as const,
  clientsByLocation: (locationId: string) => [...projectsKeys.clients(), locationId] as const,
  projectsByClient: (clientId: string) => [...projectsKeys.projects(), clientId] as const,
}

// API Functions
const api = {
  // Locations
  async getLocations(): Promise<Location[]> {
    const response = await fetch('/api/locations')
    if (!response.ok) throw new Error('Failed to fetch locations')
    return response.json()
  },

  async createLocation(data: CreateLocationData): Promise<Location> {
    const response = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create location')
    }
    const result = await response.json()
    return result.data // API returns { success: true, data: location }
  },

  async updateLocation(data: UpdateLocationData): Promise<Location> {
    const response = await fetch(`/api/locations/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: data.address }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update location')
    }
    const result = await response.json()
    return result.data || result
  },

  async deleteLocation(id: string): Promise<void> {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete location')
    }
  },

  // Clients  
  async getClients(locationId?: string): Promise<Client[]> {
    const url = locationId ? `/api/clients?location_id=${locationId}` : '/api/clients'
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch clients')
    return response.json()
  },

  async createClient(data: CreateClientData): Promise<Client> {
    const response = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create client')
    }
    const result = await response.json()
    return result.data || result
  },

  async updateClient(data: UpdateClientData): Promise<Client> {
    const response = await fetch(`/api/clients/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, location_id: data.location_id }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update client')
    }
    const result = await response.json()
    return result.data || result
  },

  async deleteClient(id: string): Promise<void> {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete client')
    }
  },

  // Projects
  async getProjects(clientId?: string): Promise<Project[]> {
    const url = clientId ? `/api/projects?clientId=${clientId}` : '/api/projects'
    const response = await fetch(url)
    if (!response.ok) throw new Error('Failed to fetch projects')
    const result = await response.json()
    return result.data || result  // API returns {data: projects, total}
  },

  async createProject(data: CreateProjectData): Promise<Project> {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create project')
    }
    const result = await response.json()
    return result.data || result
  },

  async updateProject(data: UpdateProjectData): Promise<Project> {
    const response = await fetch(`/api/projects/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, client_id: data.client_id }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update project')
    }
    const result = await response.json()
    return result.data || result
  },

  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to delete project')
    }
  },
}

// Custom Hooks
export function useLocations() {
  return useQuery({
    queryKey: projectsKeys.locations(),
    queryFn: api.getLocations,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useClients(locationId?: string) {
  return useQuery({
    queryKey: locationId ? projectsKeys.clientsByLocation(locationId) : projectsKeys.clients(),
    queryFn: () => api.getClients(locationId),
    staleTime: 1000 * 60 * 5,
  })
}

export function useProjects(clientId?: string) {
  return useQuery({
    queryKey: clientId ? projectsKeys.projectsByClient(clientId) : projectsKeys.projects(),
    queryFn: () => api.getProjects(clientId),
    staleTime: 1000 * 60 * 5,
  })
}

// Mutation Hooks
export function useCreateLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.locations() })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.updateLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.locations() })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.locations() })
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
    },
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.updateClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.updateProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
    },
  })
}
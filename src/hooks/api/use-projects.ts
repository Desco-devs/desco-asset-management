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
      body: JSON.stringify({
        name: data.name,
        locationId: data.location_id
      }),
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to create client')
    }
    const result = await response.json()
    return result.client || result.data || result
  },

  async updateClient(data: UpdateClientData): Promise<Client> {
    const response = await fetch(`/api/clients/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, locationId: data.location_id }),
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
      body: JSON.stringify({
        name: data.name,
        clientId: data.client_id
      }),
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
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.name, clientId: data.client_id }),
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
    staleTime: 30 * 1000, // 30 seconds - rely on realtime for updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useClients(locationId?: string) {
  return useQuery({
    queryKey: locationId ? projectsKeys.clientsByLocation(locationId) : projectsKeys.clients(),
    queryFn: () => api.getClients(locationId),
    staleTime: 30 * 1000, // 30 seconds - rely on realtime for updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useProjects(clientId?: string) {
  return useQuery({
    queryKey: clientId ? projectsKeys.projectsByClient(clientId) : projectsKeys.projects(),
    queryFn: () => api.getProjects(clientId),
    staleTime: 30 * 1000, // 30 seconds - rely on realtime for updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Mutation Hooks
export function useCreateLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createLocation,
    onSuccess: (newLocation) => {
      // Optimistically add to cache immediately, checking for duplicates
      queryClient.setQueryData<Location[]>(projectsKeys.locations(), (oldData) => {
        if (!oldData) return [newLocation]
        // Check if location already exists to prevent duplicates
        const exists = oldData.some(location => location.id === newLocation.id)
        if (exists) return oldData
        return [newLocation, ...oldData]
      })
    },
  })
}

export function useUpdateLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.updateLocation,
    onSuccess: (updatedLocation) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<Location[]>(projectsKeys.locations(), (oldData) => {
        if (!oldData) return [updatedLocation]
        return oldData.map(location => 
          location.id === updatedLocation.id ? updatedLocation : location
        )
      })
      // Invalidate locations cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: projectsKeys.locations() })
      // Also invalidate clients cache since client location data might be affected
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteLocation,
    onSuccess: (_, locationId) => {
      // Optimistically remove from cache immediately
      queryClient.setQueryData<Location[]>(projectsKeys.locations(), (oldData) => {
        return oldData ? oldData.filter(location => location.id !== locationId) : []
      })
      // Also invalidate dependent data
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
    },
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createClient,
    onSuccess: (newClient) => {
      // Optimistically add to cache immediately, checking for duplicates
      queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
        if (!oldData) return [newClient]
        // Check if client already exists to prevent duplicates
        const exists = oldData.some(client => client.id === newClient.id)
        if (exists) return oldData
        return [newClient, ...oldData]
      })
      // Also update location-specific queries if applicable
      queryClient.setQueryData<Client[]>(projectsKeys.clientsByLocation(newClient.location_id), (oldData) => {
        if (!oldData) return [newClient]
        // Check if client already exists to prevent duplicates
        const exists = oldData.some(client => client.id === newClient.id)
        if (exists) return oldData
        return [newClient, ...oldData]
      })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.updateClient,
    onSuccess: (updatedClient) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
        if (!oldData) return [updatedClient]
        return oldData.map(client => 
          client.id === updatedClient.id ? updatedClient : client
        )
      })
      // Update location-specific queries
      queryClient.setQueryData<Client[]>(projectsKeys.clientsByLocation(updatedClient.location_id), (oldData) => {
        if (!oldData) return [updatedClient]
        return oldData.map(client => 
          client.id === updatedClient.id ? updatedClient : client
        )
      })
      // Invalidate clients cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
      // Also invalidate projects cache since project client data might be affected
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteClient,
    onSuccess: (_, clientId) => {
      // Optimistically remove from cache immediately
      queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
        return oldData ? oldData.filter(client => client.id !== clientId) : []
      })
      // Also invalidate dependent data
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: (newProject) => {
      // Optimistically add to cache immediately, checking for duplicates
      queryClient.setQueryData<Project[]>(projectsKeys.projects(), (oldData) => {
        if (!oldData) return [newProject]
        // Check if project already exists to prevent duplicates
        const exists = oldData.some(project => project.id === newProject.id)
        if (exists) return oldData
        return [newProject, ...oldData]
      })
      // Also update client-specific queries if applicable
      queryClient.setQueryData<Project[]>(projectsKeys.projectsByClient(newProject.client_id), (oldData) => {
        if (!oldData) return [newProject]
        // Check if project already exists to prevent duplicates
        const exists = oldData.some(project => project.id === newProject.id)
        if (exists) return oldData
        return [newProject, ...oldData]
      })
      
      // Update clients cache to reflect new project count
      queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
        if (!oldData) return oldData
        return oldData.map(client => {
          if (client.id === newProject.client_id) {
            return {
              ...client,
              projects: client.projects ? [...client.projects, { id: newProject.id, name: newProject.name }] : [{ id: newProject.id, name: newProject.name }]
            }
          }
          return client
        })
      })
      
      // Also invalidate clients queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.updateProject,
    onSuccess: (updatedProject) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData<Project[]>(projectsKeys.projects(), (oldData) => {
        if (!oldData) return [updatedProject]
        return oldData.map(project => 
          project.id === updatedProject.id ? updatedProject : project
        )
      })
      // Update client-specific queries
      queryClient.setQueryData<Project[]>(projectsKeys.projectsByClient(updatedProject.client_id), (oldData) => {
        if (!oldData) return [updatedProject]
        return oldData.map(project => 
          project.id === updatedProject.id ? updatedProject : project
        )
      })
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: (_, projectId) => {
      // Get the project that was deleted to update client cache
      const projectsData = queryClient.getQueryData<Project[]>(projectsKeys.projects())
      const deletedProject = projectsData?.find(p => p.id === projectId)
      
      // Optimistically remove from cache immediately
      queryClient.setQueryData<Project[]>(projectsKeys.projects(), (oldData) => {
        return oldData ? oldData.filter(project => project.id !== projectId) : []
      })
      
      // Update clients cache to reflect removed project
      if (deletedProject) {
        queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
          if (!oldData) return oldData
          return oldData.map(client => {
            if (client.id === deletedProject.client_id) {
              return {
                ...client,
                projects: client.projects ? client.projects.filter(p => p.id !== projectId) : []
              }
            }
            return client
          })
        })
        
        // Also invalidate clients queries to ensure fresh data
        queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
      }
    },
  })
}
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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

// Custom error class for validation errors that should show as warnings
class ProjectValidationError extends Error {
  constructor(message: string, public isValidationError: boolean = true) {
    super(message)
    this.name = 'ProjectValidationError'
  }
}

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
      const result = await response.json()
      const errorMessage = result.error || 'Failed to create location'
      
      // Check if it's a validation error (400 status)
      const isValidationError = response.status === 400 && (
        errorMessage.includes('already exists') ||
        errorMessage.includes('required') ||
        errorMessage.includes('Invalid')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
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
      const result = await response.json()
      const errorMessage = result.error || 'Failed to update location'
      
      const isValidationError = response.status === 400 && (
        errorMessage.includes('already exists') ||
        errorMessage.includes('required') ||
        errorMessage.includes('Invalid')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
    }
    const result = await response.json()
    return result.data || result
  },

  async deleteLocation(id: string): Promise<void> {
    const response = await fetch(`/api/locations/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const result = await response.json()
      const errorMessage = result.error || 'Failed to delete location'
      
      const isValidationError = (response.status === 400 || response.status === 403) && (
        errorMessage.includes('existing clients') ||
        errorMessage.includes('Cannot delete') ||
        errorMessage.includes('Insufficient permissions')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
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
      const result = await response.json()
      const errorMessage = result.error || 'Failed to create client'
      
      const isValidationError = response.status === 400 && (
        errorMessage.includes('already exists') ||
        errorMessage.includes('required') ||
        errorMessage.includes('Invalid')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
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
      const result = await response.json()
      const errorMessage = result.error || 'Failed to update client'
      
      const isValidationError = response.status === 400 && (
        errorMessage.includes('already exists') ||
        errorMessage.includes('required') ||
        errorMessage.includes('Invalid')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
    }
    const result = await response.json()
    return result.data || result
  },

  async deleteClient(id: string): Promise<void> {
    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const result = await response.json()
      const errorMessage = result.error || 'Failed to delete client'
      
      const isValidationError = (response.status === 400 || response.status === 403) && (
        errorMessage.includes('existing projects') ||
        errorMessage.includes('Cannot delete') ||
        errorMessage.includes('Insufficient permissions')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
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
      const result = await response.json()
      const errorMessage = result.error || 'Failed to create project'
      
      const isValidationError = response.status === 400 && (
        errorMessage.includes('already exists') ||
        errorMessage.includes('required') ||
        errorMessage.includes('Invalid')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
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
      const result = await response.json()
      const errorMessage = result.error || 'Failed to update project'
      
      const isValidationError = response.status === 400 && (
        errorMessage.includes('already exists') ||
        errorMessage.includes('required') ||
        errorMessage.includes('Invalid')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
    }
    const result = await response.json()
    return result.data || result
  },

  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const result = await response.json()
      const errorMessage = result.error || 'Failed to delete project'
      
      const isValidationError = (response.status === 400 || response.status === 403) && (
        errorMessage.includes('Cannot delete') ||
        errorMessage.includes('Insufficient permissions') ||
        errorMessage.includes('Invalid')
      )
      
      if (isValidationError) {
        throw new ProjectValidationError(errorMessage)
      } else {
        throw new Error(errorMessage)
      }
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
    queryFn: async () => {
      const result = await api.getProjects(clientId)
      // If result is an array, it means it's from clientId query, return as is
      if (Array.isArray(result)) {
        return { data: result, permissions: null }
      }
      // If result has data property, return full result with permissions
      return result
    },
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
        if (!Array.isArray(oldData)) return [newLocation]
        // Check if location already exists to prevent duplicates
        const exists = oldData.some(location => location.id === newLocation.id)
        if (exists) return oldData
        return [newLocation, ...oldData]
      })
      // Show toast immediately for better UX with deduplication
      const toastId = `location-create-${newLocation.id}`
      toast.success('Location created successfully', { id: toastId })
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('already exists')) {
          toast.warning('A location with this address already exists. Please use a different address.')
        } else if (error.message.includes('required')) {
          toast.warning('Please fill in all required fields.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to create location. Please try again.')
      }
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
        if (!Array.isArray(oldData)) return [updatedLocation]
        return oldData.map(location => 
          location.id === updatedLocation.id ? updatedLocation : location
        )
      })
      // Invalidate locations cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: projectsKeys.locations() })
      // Also invalidate clients cache since client location data might be affected
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
      // Show toast immediately for better UX with deduplication
      const toastId = `location-update-${updatedLocation.id}`
      toast.success('Location updated successfully', { id: toastId })
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('already exists')) {
          toast.warning('A location with this address already exists. Please use a different address.')
        } else if (error.message.includes('required')) {
          toast.warning('Please fill in all required fields.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to update location. Please try again.')
      }
    },
  })
}

export function useDeleteLocation() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteLocation,
    onSuccess: (_, locationId) => {
      // Optimistically remove from cache immediately for better UX
      queryClient.setQueryData<Location[]>(projectsKeys.locations(), (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return []
        return oldData.filter(location => location.id !== locationId)
      })
      // Also invalidate dependent data
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
      // Show toast immediately for better UX with deduplication
      console.log('🚀 MUTATION: Location delete successful, showing toast')
      const toastId = `location-delete-${locationId}`
      toast.success('Location deleted successfully', { id: toastId })
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('existing clients')) {
          toast.warning('Cannot delete location with existing clients. Please move or delete clients first.')
        } else if (error.message.includes('Insufficient permissions')) {
          toast.warning('You do not have permission to delete locations.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to delete location. Please try again.')
      }
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
        if (!Array.isArray(oldData)) return [newClient]
        // Check if client already exists to prevent duplicates
        const exists = oldData.some(client => client.id === newClient.id)
        if (exists) return oldData
        return [newClient, ...oldData]
      })
      // Also update location-specific queries if applicable
      queryClient.setQueryData<Client[]>(projectsKeys.clientsByLocation(newClient.location_id), (oldData) => {
        if (!oldData) return [newClient]
        if (!Array.isArray(oldData)) return [newClient]
        // Check if client already exists to prevent duplicates
        const exists = oldData.some(client => client.id === newClient.id)
        if (exists) return oldData
        return [newClient, ...oldData]
      })
      // Show toast immediately for better UX with deduplication
      const toastId = `client-create-${newClient.id}`
      toast.success('Client created successfully', { id: toastId })
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('already exists')) {
          toast.warning('A client with this name already exists in this location. Please use a different name.')
        } else if (error.message.includes('required')) {
          toast.warning('Please fill in all required fields.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to create client. Please try again.')
      }
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
        if (!Array.isArray(oldData)) return [updatedClient]
        return oldData.map(client => 
          client.id === updatedClient.id ? updatedClient : client
        )
      })
      // Update location-specific queries
      queryClient.setQueryData<Client[]>(projectsKeys.clientsByLocation(updatedClient.location_id), (oldData) => {
        if (!oldData) return [updatedClient]
        if (!Array.isArray(oldData)) return [updatedClient]
        return oldData.map(client => 
          client.id === updatedClient.id ? updatedClient : client
        )
      })
      // Invalidate clients cache to ensure fresh data
      queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
      // Also invalidate projects cache since project client data might be affected
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
      // Show toast immediately for better UX
      toast.success('Client updated successfully')
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('already exists')) {
          toast.warning('A client with this name already exists in this location. Please use a different name.')
        } else if (error.message.includes('required')) {
          toast.warning('Please fill in all required fields.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to update client. Please try again.')
      }
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteClient,
    onSuccess: (_, clientId) => {
      // Optimistically remove from cache immediately for better UX
      queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
        if (!oldData || !Array.isArray(oldData)) return []
        return oldData.filter(client => client.id !== clientId)
      })
      // Also invalidate dependent data
      queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
      // Show toast immediately for better UX with deduplication
      console.log('🚀 MUTATION: Client delete successful, showing toast')
      const toastId = `client-delete-${clientId}`
      toast.success('Client deleted successfully', { id: toastId })
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('existing projects')) {
          toast.warning('Cannot delete client with existing projects. Please move or delete projects first.')
        } else if (error.message.includes('Insufficient permissions')) {
          toast.warning('You do not have permission to delete clients.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to delete client. Please try again.')
      }
    },
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: (newProject) => {
      // Optimistically add to cache immediately, checking for duplicates
      queryClient.setQueryData(projectsKeys.projects(), (oldData: any) => {
        if (!oldData) return { data: [newProject], permissions: null }
        if (!oldData.data || !Array.isArray(oldData.data)) return { data: [newProject], permissions: oldData?.permissions || null }
        // Check if project already exists to prevent duplicates
        const exists = oldData.data.some((project: Project) => project.id === newProject.id)
        if (exists) return oldData
        return { ...oldData, data: [newProject, ...oldData.data] }
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
      queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData: any) => {
        if (!oldData) return oldData
        return oldData.map((client: any) => {
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
      // Show toast immediately for better UX
      toast.success('Project created successfully')
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('already exists')) {
          toast.warning('A project with this name already exists for this client. Please use a different name.')
        } else if (error.message.includes('required')) {
          toast.warning('Please fill in all required fields.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to create project. Please try again.')
      }
    },
  })
}

export function useUpdateProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.updateProject,
    onSuccess: (updatedProject) => {
      // Optimistically update in cache immediately
      queryClient.setQueryData(projectsKeys.projects(), (oldData: any) => {
        if (!oldData) return { data: [updatedProject], permissions: null }
        if (!oldData.data || !Array.isArray(oldData.data)) return { data: [updatedProject], permissions: oldData?.permissions || null }
        return {
          ...oldData,
          data: oldData.data.map((project: Project) => 
            project.id === updatedProject.id ? updatedProject : project
          )
        }
      })
      // Update client-specific queries
      queryClient.setQueryData<Project[]>(projectsKeys.projectsByClient(updatedProject.client_id), (oldData) => {
        if (!oldData) return [updatedProject]
        return oldData.map(project => 
          project.id === updatedProject.id ? updatedProject : project
        )
      })
      // Show toast immediately for better UX
      toast.success('Project updated successfully')
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('already exists')) {
          toast.warning('A project with this name already exists for this client. Please use a different name.')
        } else if (error.message.includes('required')) {
          toast.warning('Please fill in all required fields.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to update project. Please try again.')
      }
    },
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: api.deleteProject,
    onSuccess: (_, projectId) => {
      // Get the project that was deleted to update client cache
      const projectsData = queryClient.getQueryData(projectsKeys.projects()) as any
      const deletedProject = projectsData?.data?.find((p: Project) => p.id === projectId)
      
      // Optimistically remove from cache immediately
      queryClient.setQueryData(projectsKeys.projects(), (oldData: any) => {
        if (!oldData) return { data: [], permissions: null }
        if (!oldData.data || !Array.isArray(oldData.data)) return { data: [], permissions: oldData?.permissions || null }
        return {
          ...oldData,
          data: oldData.data.filter((project: Project) => project.id !== projectId)
        }
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
      // Show toast immediately for better UX with deduplication
      console.log('🚀 MUTATION: Project delete successful, showing toast')
      const toastId = `project-delete-${projectId}`
      toast.success('Project deleted successfully', { id: toastId })
    },
    onError: (error: Error) => {
      if (error instanceof ProjectValidationError) {
        if (error.message.includes('Insufficient permissions')) {
          toast.warning('You do not have permission to delete projects.')
        } else {
          toast.warning(error.message)
        }
      } else {
        toast.error(error.message || 'Failed to delete project. Please try again.')
      }
    },
  })
}
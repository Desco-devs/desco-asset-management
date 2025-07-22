export interface Location {
  id: string
  address: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  name: string
  location_id: string
  location?: Location
  projects?: Project[]
  created_at: string
  updated_at: string
  created_by?: string
}

export interface Project {
  id: string
  name: string
  client_id: string
  client?: Client
  equipments?: Equipment[]
  vehicles?: Vehicle[]
  created_at: string
  updated_at: string
  created_by?: string
}

// Form types
export interface CreateLocationData {
  address: string
}

export interface UpdateLocationData {
  id: string
  address: string
}

export interface CreateClientData {
  name: string
  location_id: string
}

export interface UpdateClientData {
  id: string
  name: string
  location_id: string
}

export interface CreateProjectData {
  name: string
  client_id: string
}

export interface UpdateProjectData {
  id: string
  name: string
  client_id: string
}

// API Response types
export interface LocationsResponse {
  locations: Location[]
  total: number
}

export interface ClientsResponse {
  clients: Client[]
  total: number
}

export interface ProjectsResponse {
  projects: Project[]
  total: number
}

// UI State types
export interface LocationTableState {
  search: string
  page: number
  limit: number
  sortBy: 'address' | 'created_at' | 'updated_at'
  sortOrder: 'asc' | 'desc'
}

export interface ClientTableState {
  search: string
  page: number
  limit: number
  sortBy: 'name' | 'created_at' | 'updated_at'
  sortOrder: 'asc' | 'desc'
  location_id?: string
}

export interface ProjectTableState {
  search: string
  page: number
  limit: number
  sortBy: 'name' | 'created_at' | 'updated_at'
  sortOrder: 'asc' | 'desc'
  client_id?: string
}

// Import related types
import type { Equipment } from './equipment'
import type { Vehicle } from './vehicles'

export type { Equipment, Vehicle }
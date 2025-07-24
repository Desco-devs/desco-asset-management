import { Database } from './database.types'
import { User as SupabaseUser } from '@supabase/supabase-js'

// User roles from database
export type UserRole = Database['public']['Enums']['Role']
export type UserStatus = Database['public']['Enums']['user_status']

// User interface matching database schema
export interface User {
  id: string
  username: string
  full_name: string
  phone: string | null
  user_profile: string | null
  role: UserRole
  user_status: UserStatus
  created_at: string
  updated_at: string
  auth_user?: SupabaseUser
}

// Route access configuration
export interface RouteAccess {
  path: string
  requiredRole: UserRole
  allowedRoles: UserRole[]
}

// Permission types
export interface RolePermissions {
  canView: boolean
  canCreate: boolean
  canUpdate: boolean
  canDelete: boolean
}

// Resource types for permission checking
export type ResourceType = 
  | 'users' 
  | 'locations' 
  | 'clients' 
  | 'projects' 
  | 'equipment' 
  | 'vehicles' 
  | 'maintenance_reports'

// Auth context type
export interface AuthContextType {
  user: User | null
  supabaseUser: SupabaseUser | null
  setUser: (user: User | null) => void
  clearUser: () => void
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

// Auth component prop types
export interface RoleGuardProps {
  children: React.ReactNode
  requiredRole: UserRole
  fallback?: React.ReactNode
  redirectTo?: string
}

export interface PermissionGateProps {
  children: React.ReactNode
  resource: ResourceType
  action: 'view' | 'create' | 'update' | 'delete'
  userRole?: UserRole
  fallback?: React.ReactNode
}

// Auth form types
export interface SignInFormData {
  email: string
  password: string
}

export interface SignInProps {
  onToggle: () => void
  onForgotPassword: () => void
}

// API response types
export interface AuthError {
  message: string
  code?: string
}

export interface UserUpdateData {
  username?: string
  full_name?: string
  phone?: string | null
  role?: UserRole
  user_status?: UserStatus
}
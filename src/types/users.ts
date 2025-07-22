import { Role, user_status } from '@prisma/client'

export type UserRole = Role
export type UserStatus = user_status

export interface User {
  id: string
  username: string
  full_name: string
  phone: string | null
  user_profile: string | null
  role: UserRole
  user_status: UserStatus
  is_online: boolean
  last_seen: Date | null
  created_at: Date
  updated_at: Date
}

export interface UserWithRelations extends User {
  created_clients?: any[]
  created_equipments?: any[]
  created_locations?: any[]
  created_projects?: any[]
  created_vehicles?: any[]
}

export interface CreateUserData {
  email: string
  password: string
  username: string
  full_name: string
  phone?: string | null
  role?: UserRole
}

export interface UpdateUserData {
  username?: string
  full_name?: string
  phone?: string | null
  role?: UserRole
  user_status?: UserStatus
}

export interface UsersApiResponse {
  data: User[]
  total: number
  user_role: UserRole
  permissions: {
    can_create: boolean
    can_update: boolean
    can_delete: boolean
  }
}

// Re-export validation schemas and types
export type { 
  CreateUserSchema, 
  UpdateUserSchema, 
  UserFiltersSchema 
} from '@/lib/validations/users'

export interface UserTableColumn {
  key: keyof User
  label: string
  sortable?: boolean
  render?: (user: User) => React.ReactNode
}

export const USER_ROLES: Record<UserRole, string> = {
  SUPERADMIN: 'Super Admin',
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
}

export const USER_STATUSES: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPERADMIN: 'bg-red-100 text-red-800',
  ADMIN: 'bg-blue-100 text-blue-800',
  VIEWER: 'bg-gray-100 text-gray-800',
}

export const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-red-100 text-red-800',
}
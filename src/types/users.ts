import { Role, user_status } from '@prisma/client'

export type UserRole = Role
export type UserStatus = user_status

export interface User {
  id: string
  username: string
  email: string | null
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
  SUPERADMIN: 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive-foreground',
  ADMIN: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
  VIEWER: 'bg-muted text-muted-foreground border-border dark:bg-muted dark:text-muted-foreground',
}

export const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
  INACTIVE: 'bg-destructive/10 text-destructive border-destructive/20 dark:bg-destructive/20 dark:text-destructive-foreground',
}
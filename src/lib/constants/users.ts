import { UserRole, UserStatus } from '@/types/users'

// Valid filter options
export const VALID_USER_ROLES: UserRole[] = ['SUPERADMIN', 'ADMIN', 'VIEWER']
export const VALID_USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE']

// Filter helpers
export const isValidUserRole = (role: string): role is UserRole => {
  return VALID_USER_ROLES.includes(role as UserRole)
}

export const isValidUserStatus = (status: string): status is UserStatus => {
  return VALID_USER_STATUSES.includes(status as UserStatus)
}

// Filter conversion helpers
export const parseUserRole = (role: string): UserRole | undefined => {
  return role === 'all' ? undefined : isValidUserRole(role) ? role : undefined
}

export const parseUserStatus = (status: string): UserStatus | undefined => {
  return status === 'all' ? undefined : isValidUserStatus(status) ? status : undefined
}
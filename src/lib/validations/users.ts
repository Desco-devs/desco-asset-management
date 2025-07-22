import { z } from 'zod'

// Define the role and status enums as const arrays
const USER_ROLES = ['SUPERADMIN', 'ADMIN', 'VIEWER'] as const
const USER_STATUSES = ['ACTIVE', 'INACTIVE'] as const

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z.string().min(1, 'Username is required').max(50, 'Username must be less than 50 characters'),
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
  phone: z.string().nullable().optional(),
  role: z.enum(USER_ROLES).optional().default('VIEWER'),
})

export const updateUserSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50, 'Username must be less than 50 characters').optional(),
  full_name: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters').optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(USER_ROLES).optional(),
  user_status: z.enum(USER_STATUSES).optional(),
})

export const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(USER_ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  limit: z.number().positive().max(100).optional(),
  offset: z.number().min(0).optional(),
})

export type CreateUserSchema = z.infer<typeof createUserSchema>
export type UpdateUserSchema = z.infer<typeof updateUserSchema>
export type UserFiltersSchema = z.infer<typeof userFiltersSchema>
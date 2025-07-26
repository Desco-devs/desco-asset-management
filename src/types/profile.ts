import { User } from './auth'

// Re-export User type for convenience
export type { User } from './auth'

// Profile update interfaces matching Prisma schema exactly
export interface ProfileUpdateData {
  username: string
  full_name: string
  phone: string | null
  user_profile: string | null
}

// Profile form data for UI components
export interface ProfileFormData {
  username: string
  full_name: string
  phone: string
  user_profile: string
}

// Profile validation schema
export interface ProfileValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

// Profile image upload types
export interface ProfileImageUpload {
  file: File
  preview: string
}

// Profile settings and preferences
export interface ProfileSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  theme: 'light' | 'dark' | 'system'
  language: string
}

// Profile activity tracking
export interface ProfileActivity {
  id: string
  user_id: string
  action: 'profile_updated' | 'image_changed' | 'settings_changed'
  details: Record<string, unknown>
  created_at: string
}

// Profile stats for admin view
export interface ProfileStats {
  loginCount: number
  lastLogin: string | null
  profileCompleteness: number
  activeSessions: number
}

// Profile security information
export interface ProfileSecurity {
  twoFactorEnabled: boolean
  lastPasswordChange: string | null
  activeSessions: number
  recentActivity: ProfileActivity[]
}

// Complete profile interface with all relations
export interface ProfileWithDetails extends User {
  settings?: ProfileSettings
  stats?: ProfileStats
  security?: ProfileSecurity
  activities?: ProfileActivity[]
}

// API response types
export interface ProfileUpdateResponse {
  success: boolean
  user: User
  message: string
}

export interface ProfileImageUploadResponse {
  success: boolean
  url: string
  message: string
}

// Profile form validation rules
export interface ProfileValidationRules {
  username: {
    required: boolean
    minLength: number
    maxLength: number
    pattern: RegExp
    unique: boolean
  }
  full_name: {
    required: boolean
    minLength: number
    maxLength: number
  }
  phone: {
    required: boolean
    pattern: RegExp
  }
  user_profile: {
    maxSize: number
    allowedTypes: string[]
  }
}

// Profile field metadata for dynamic forms
export interface ProfileFieldMeta {
  key: keyof ProfileFormData
  label: string
  type: 'text' | 'email' | 'tel' | 'file' | 'select'
  required: boolean
  placeholder: string
  helpText?: string
  validation: unknown
}

// Optimistic update types for TanStack Query
export interface OptimisticProfileUpdate {
  user: User
  timestamp: number
}

// Profile change history for audit
export interface ProfileChangeHistory {
  id: string
  user_id: string
  field: keyof ProfileUpdateData
  old_value: unknown
  new_value: unknown
  changed_by: string
  changed_at: string
}

// Export default validation rules
export const defaultProfileValidationRules: ProfileValidationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
    unique: true
  },
  full_name: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  phone: {
    required: false,
    pattern: /^[\+]?[1-9][\d]{0,15}$/
  },
  user_profile: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  }
}
'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ProfileFormData, ProfileValidationResult } from '@/types/profile'

interface ProfileEditState {
  isOpen: boolean
  mode: 'view' | 'edit'
  hasUnsavedChanges: boolean
}

interface ProfileImageState {
  selectedFile: File | null
  previewUrl: string | null
  isUploading: boolean
  uploadProgress: number
}

interface ProfileFormState {
  formData: ProfileFormData
  originalData: ProfileFormData | null
  errors: Record<string, string | undefined>
  touched: Record<string, boolean>
  isValid: boolean
  isDirty: boolean
}

interface ProfileUIPreferences {
  showAdvancedSettings: boolean
  compactView: boolean
  autoSave: boolean
}

interface ProfileStore {
  // Edit State
  editState: ProfileEditState
  
  // Form State
  formState: ProfileFormState
  
  // Image State
  imageState: ProfileImageState
  
  // UI Preferences (persisted)
  preferences: ProfileUIPreferences
  
  // Computed values
  canSave: boolean
  hasChanges: boolean
  
  // Edit Actions
  startEdit: () => void
  cancelEdit: () => void
  saveEdit: () => void
  setEditMode: (mode: 'view' | 'edit') => void
  
  // Form Actions
  setFormData: (data: Partial<ProfileFormData>) => void
  setFieldValue: (field: keyof ProfileFormData, value: string) => void
  setFieldError: (field: string, error: string) => void
  clearFieldError: (field: string) => void
  setFieldTouched: (field: string, touched: boolean) => void
  validateField: (field: keyof ProfileFormData, value: string) => string | null
  validateForm: () => ProfileValidationResult
  resetForm: () => void
  initializeForm: (data: ProfileFormData) => void
  
  // Image Actions
  setSelectedFile: (file: File | null) => void
  setPreviewUrl: (url: string | null) => void
  setUploadProgress: (progress: number) => void
  setIsUploading: (uploading: boolean) => void
  clearImage: () => void
  
  // Preference Actions
  setPreferences: (prefs: Partial<ProfileUIPreferences>) => void
  toggleAdvancedSettings: () => void
  toggleCompactView: () => void
  toggleAutoSave: () => void
  
  // Utility Actions
  resetState: () => void
  markAsClean: () => void
}

const initialFormData: ProfileFormData = {
  username: '',
  full_name: '',
  phone: '',
  user_profile: '',
}

const initialEditState: ProfileEditState = {
  isOpen: false,
  mode: 'view',
  hasUnsavedChanges: false,
}

const initialFormState: ProfileFormState = {
  formData: initialFormData,
  originalData: null,
  errors: {},
  touched: {},
  isValid: false,
  isDirty: false,
}

const initialImageState: ProfileImageState = {
  selectedFile: null,
  previewUrl: null,
  isUploading: false,
  uploadProgress: 0,
}

const initialPreferences: ProfileUIPreferences = {
  showAdvancedSettings: false,
  compactView: false,
  autoSave: false,
}

// Validation functions - simple and direct
function validateUsername(value: string): string | null {
  if (!value.trim()) return 'Username is required'
  if (value.length < 3) return 'Username must be at least 3 characters'
  if (value.length > 50) return 'Username must be less than 50 characters'
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) return 'Username can only contain letters, numbers, hyphens, and underscores'
  return null
}

function validateFullName(value: string): string | null {
  if (!value.trim()) return 'Full name is required'
  if (value.length < 2) return 'Full name must be at least 2 characters'
  if (value.length > 100) return 'Full name must be less than 100 characters'
  return null
}

function validatePhone(value: string): string | null {
  if (!value) return null // Phone is optional
  // Allow various phone number formats: +1234567890, 1234567890, 01234567890, etc.
  // Remove all non-digit characters except + at the beginning
  const cleaned = value.replace(/[^\d+]/g, '')
  if (cleaned.startsWith('+')) {
    // International format: +1234567890 (7-15 digits after +)
    if (!/^\+\d{7,15}$/.test(cleaned)) return 'Please enter a valid phone number'
  } else {
    // Local format: 1234567890 or 01234567890 (7-15 digits)
    if (!/^\d{7,15}$/.test(cleaned)) return 'Please enter a valid phone number'
  }
  return null
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      // Initial state
      editState: initialEditState,
      formState: initialFormState,
      imageState: initialImageState,
      preferences: initialPreferences,
      
      // Computed values
      get canSave() {
        const { formState, editState } = get()
        return editState.mode === 'edit' && formState.isValid && formState.isDirty
      },
      
      get hasChanges() {
        const { formState, imageState } = get()
        return formState.isDirty || !!imageState.selectedFile
      },
      
      // Edit Actions
      startEdit: () => set((state) => ({
        editState: {
          ...state.editState,
          isOpen: true,
          mode: 'edit',
        }
      })),
      
      cancelEdit: () => {
        const { formState } = get()
        set((state) => ({
          editState: {
            ...state.editState,
            mode: 'view',
            hasUnsavedChanges: false,
          },
          formState: {
            ...state.formState,
            formData: formState.originalData || initialFormData,
            errors: {},
            touched: {},
            isDirty: false,
          },
          imageState: initialImageState,
        }))
      },
      
      saveEdit: () => set((state) => ({
        editState: {
          ...state.editState,
          hasUnsavedChanges: false,
        },
        formState: {
          ...state.formState,
          originalData: state.formState.formData,
          isDirty: false,
        },
      })),
      
      setEditMode: (mode) => set((state) => ({
        editState: {
          ...state.editState,
          mode,
        }
      })),
      
      // Form Actions
      setFormData: (data) => set((state) => ({
        formState: {
          ...state.formState,
          formData: { ...state.formState.formData, ...data },
          isDirty: true,
        }
      })),
      
      setFieldValue: (field, value) => {
        set((state) => {
          // Update the field value
          const newFormData = { ...state.formState.formData, [field]: value }
          
          // Validate all fields with the new data
          const errors: Record<string, string> = {}
          
          // Validate username
          const usernameError = validateUsername(newFormData.username)
          if (usernameError) errors.username = usernameError
          
          // Validate full_name
          const fullNameError = validateFullName(newFormData.full_name)
          if (fullNameError) errors.full_name = fullNameError
          
          // Validate phone
          const phoneError = validatePhone(newFormData.phone)
          if (phoneError) errors.phone = phoneError
          
          const isValid = Object.keys(errors).length === 0
          
          return {
            formState: {
              ...state.formState,
              formData: newFormData,
              errors,
              isValid,
              isDirty: true,
            }
          }
        })
      },
      
      setFieldError: (field, error) => set((state) => ({
        formState: {
          ...state.formState,
          errors: { ...state.formState.errors, [field]: error },
        }
      })),
      
      clearFieldError: (field) => set((state) => ({
        formState: {
          ...state.formState,
          errors: { ...state.formState.errors, [field]: undefined },
        }
      })),
      
      setFieldTouched: (field, touched) => set((state) => ({
        formState: {
          ...state.formState,
          touched: { ...state.formState.touched, [field]: touched },
        }
      })),
      
      validateField: (field, value) => {
        switch (field) {
          case 'username':
            return validateUsername(value)
          case 'full_name':
            return validateFullName(value)
          case 'phone':
            return validatePhone(value)
          default:
            return null
        }
      },
      
      validateForm: () => {
        const { formState } = get()
        const { formData } = formState
        const errors: Record<string, string> = {}
        
        // Validate all fields
        const usernameError = validateUsername(formData.username)
        if (usernameError) errors.username = usernameError
        
        const fullNameError = validateFullName(formData.full_name)
        if (fullNameError) errors.full_name = fullNameError
        
        const phoneError = validatePhone(formData.phone)
        if (phoneError) errors.phone = phoneError
        
        return {
          isValid: Object.keys(errors).length === 0,
          errors,
        }
      },
      
      resetForm: () => set((state) => ({
        formState: {
          ...initialFormState,
          originalData: state.formState.originalData,
        }
      })),
      
      initializeForm: (data) => set(() => {
        // Validate the initial data
        const errors: Record<string, string> = {}
        
        // Validate username
        const usernameError = validateUsername(data.username)
        if (usernameError) errors.username = usernameError
        
        // Validate full_name
        const fullNameError = validateFullName(data.full_name)
        if (fullNameError) errors.full_name = fullNameError
        
        // Validate phone
        const phoneError = validatePhone(data.phone)
        if (phoneError) errors.phone = phoneError
        
        const isValid = Object.keys(errors).length === 0
        
        return {
          formState: {
            formData: data,
            originalData: data,
            errors,
            touched: {},
            isValid,
            isDirty: false,
          }
        }
      }),
      
      // Image Actions
      setSelectedFile: (file) => set((state) => ({
        imageState: {
          ...state.imageState,
          selectedFile: file,
          previewUrl: file ? URL.createObjectURL(file) : null,
        }
      })),
      
      setPreviewUrl: (url) => set((state) => ({
        imageState: {
          ...state.imageState,
          previewUrl: url,
        }
      })),
      
      setUploadProgress: (progress) => set((state) => ({
        imageState: {
          ...state.imageState,
          uploadProgress: progress,
        }
      })),
      
      setIsUploading: (uploading) => set((state) => ({
        imageState: {
          ...state.imageState,
          isUploading: uploading,
          uploadProgress: uploading ? 0 : 100,
        }
      })),
      
      clearImage: () => {
        const { imageState } = get()
        // Clean up preview URL
        if (imageState.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(imageState.previewUrl)
        }
        
        set(() => ({
          imageState: initialImageState,
        }))
      },
      
      // Preference Actions
      setPreferences: (prefs) => set((state) => ({
        preferences: { ...state.preferences, ...prefs }
      })),
      
      toggleAdvancedSettings: () => set((state) => ({
        preferences: {
          ...state.preferences,
          showAdvancedSettings: !state.preferences.showAdvancedSettings,
        }
      })),
      
      toggleCompactView: () => set((state) => ({
        preferences: {
          ...state.preferences,
          compactView: !state.preferences.compactView,
        }
      })),
      
      toggleAutoSave: () => set((state) => ({
        preferences: {
          ...state.preferences,
          autoSave: !state.preferences.autoSave,
        }
      })),
      
      // Utility Actions
      resetState: () => set(() => ({
        editState: initialEditState,
        formState: initialFormState,
        imageState: initialImageState,
      })),
      
      markAsClean: () => set((state) => ({
        formState: {
          ...state.formState,
          isDirty: false,
          originalData: state.formState.formData, // Update original data to current
        },
        editState: {
          ...state.editState,
          hasUnsavedChanges: false,
        },
        imageState: {
          ...state.imageState,
          selectedFile: null, // Clear any selected file
        },
      })),
    }),
    {
      name: 'profile-store',
      // Only persist UI preferences, not form state or edit state
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
)

// Selectors for specific state slices to prevent unnecessary re-renders
export const useProfileEditState = () => useProfileStore(state => state.editState)
export const useProfileFormState = () => useProfileStore(state => state.formState)
export const useProfileImageState = () => useProfileStore(state => state.imageState)
export const useProfilePreferences = () => useProfileStore(state => state.preferences)

// Individual action selectors to prevent object recreation
export const useSetFormData = () => useProfileStore(state => state.setFormData)
export const useSetFieldValue = () => useProfileStore(state => state.setFieldValue)
export const useSetFieldError = () => useProfileStore(state => state.setFieldError)
export const useClearFieldError = () => useProfileStore(state => state.clearFieldError)
export const useSetFieldTouched = () => useProfileStore(state => state.setFieldTouched)
export const useValidateField = () => useProfileStore(state => state.validateField)
export const useValidateForm = () => useProfileStore(state => state.validateForm)
export const useResetForm = () => useProfileStore(state => state.resetForm)
export const useInitializeForm = () => useProfileStore(state => state.initializeForm)

export const useStartEdit = () => useProfileStore(state => state.startEdit)
export const useCancelEdit = () => useProfileStore(state => state.cancelEdit)
export const useSaveEdit = () => useProfileStore(state => state.saveEdit)
export const useSetEditMode = () => useProfileStore(state => state.setEditMode)

export const useSetSelectedFile = () => useProfileStore(state => state.setSelectedFile)
export const useSetPreviewUrl = () => useProfileStore(state => state.setPreviewUrl)
export const useSetUploadProgress = () => useProfileStore(state => state.setUploadProgress)
export const useSetIsUploading = () => useProfileStore(state => state.setIsUploading)
export const useClearImage = () => useProfileStore(state => state.clearImage)
export const useMarkAsClean = () => useProfileStore(state => state.markAsClean)
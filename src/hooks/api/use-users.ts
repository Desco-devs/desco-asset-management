'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { 
  User, 
  CreateUserSchema, 
  UpdateUserSchema, 
  UserFiltersSchema, 
  UsersApiResponse 
} from '@/types/users'

// Custom error class for validation errors that shouldn't log to console
class UserValidationError extends Error {
  constructor(message: string, public isValidationError: boolean = true) {
    super(message)
    this.name = 'UserValidationError'
    // Completely prevent this error from showing in console
    Object.defineProperty(this, 'stack', {
      get() {
        return ''
      },
      set() {
        // Do nothing
      }
    })
    // Override toString to prevent console logging
    this.toString = () => ''
    // Hide from console.log/error
    Object.defineProperty(this, Symbol.toStringTag, {
      value: '',
      writable: false
    })
  }
}

const API_BASE = '/api/users'

async function fetchAllUsers(): Promise<UsersApiResponse> {
  const response = await fetch(API_BASE)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }
  
  return response.json()
}

function filterUsersClientSide(users: User[], filters: UserFiltersSchema, currentUserId?: string): User[] {
  let filteredUsers = [...users]
  
  // Filter out current user
  if (currentUserId) {
    filteredUsers = filteredUsers.filter(user => user.id !== currentUserId)
  }
  
  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    filteredUsers = filteredUsers.filter(user =>
      user.username.toLowerCase().includes(searchLower) ||
      user.full_name.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower))
    )
  }
  
  // Role filter
  if (filters.role) {
    filteredUsers = filteredUsers.filter(user => user.role === filters.role)
  }
  
  // Status filter
  if (filters.status) {
    filteredUsers = filteredUsers.filter(user => user.user_status === filters.status)
  }
  
  // Pagination
  const offset = filters.offset || 0
  const limit = filters.limit || 50
  
  return filteredUsers.slice(offset, offset + limit)
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(`${API_BASE}/${id}`)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch user: ${response.statusText}`)
  }
  
  return response.json()
}

async function createUser(data: CreateUserSchema): Promise<User> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const result = await response.json()
    const errorMessage = result.error || 'Failed to create user'
    
    // Check if it's a validation error (400 status) that shouldn't show in console
    const isValidationError = response.status === 400 && (
      errorMessage.includes('email address has already been registered') ||
      errorMessage.includes('Username already exists') ||
      errorMessage.includes('Missing required fields') ||
      errorMessage.includes('Invalid')
    )
    
    if (isValidationError) {
      throw new UserValidationError(errorMessage)
    } else {
      // For actual server errors, use regular Error
      const error = new Error(errorMessage)
      error.name = 'CreateUserError'
      throw error
    }
  }
  
  return response.json()
}

async function updateUser(id: string, data: UpdateUserSchema): Promise<User> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  if (!response.ok) {
    const result = await response.json()
    const errorMessage = result.error || 'Failed to update user'
    
    // Check if it's a validation error (400 status)
    const isValidationError = response.status === 400 && (
      errorMessage.includes('Username already exists') ||
      errorMessage.includes('Invalid user ID format') ||
      errorMessage.includes('Invalid')
    )
    
    if (isValidationError) {
      throw new UserValidationError(errorMessage)
    } else {
      throw new Error(errorMessage)
    }
  }
  
  return response.json()
}

async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const result = await response.json()
    const errorMessage = result.error || 'Failed to delete user'
    
    // Check if it's a validation error (400/403 status)
    const isValidationError = (response.status === 400 || response.status === 403) && (
      errorMessage.includes('Invalid user ID format') ||
      errorMessage.includes('cannot delete your own account') ||
      errorMessage.includes('Only Super Admin can delete')
    )
    
    if (isValidationError) {
      throw new UserValidationError(errorMessage)
    } else {
      throw new Error(errorMessage)
    }
  }
}

export function useUsers(filters?: UserFiltersSchema, currentUserId?: string) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['users'],
    queryFn: fetchAllUsers,
    staleTime: 1000 * 30, // 30 seconds for real-time updates
    select: (data: UsersApiResponse) => {
      const filteredUsers = filterUsersClientSide(data.data, filters || {}, currentUserId)
      return {
        ...data,
        data: filteredUsers,
        total: filteredUsers.length,
        originalTotal: data.total,
        originalData: data.data, // Keep original unfiltered data for stats
      }
    },
  })

  // Supabase realtime subscription for users table
  useEffect(() => {
    const supabase = createClient()
    
    const subscription = supabase
      .channel('users-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'users',
        },
        (payload: RealtimePostgresChangesPayload<User>) => {
          const newUser = payload.new as User
          if (newUser?.id) {
            // Update TanStack Query cache - add to full dataset
            queryClient.setQueryData(['users'], (oldData: UsersApiResponse | undefined) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                data: [newUser, ...oldData.data],
                total: oldData.total + 1,
              }
            })
            // Don't show toast here - let the mutation handle it to avoid duplicates
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
        },
        (payload: RealtimePostgresChangesPayload<User>) => {
          const updatedUser = payload.new as User
          if (updatedUser?.id) {
            // Update TanStack Query cache
            queryClient.setQueryData(['users'], (oldData: UsersApiResponse | undefined) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                data: oldData.data.map(user => 
                  user.id === updatedUser.id ? updatedUser : user
                ),
              }
            })
            
            // Update individual user cache - No toast needed for real-time updates
            queryClient.setQueryData(['users', updatedUser.id], updatedUser)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'users',
        },
        (payload: RealtimePostgresChangesPayload<User>) => {
          const deletedUser = payload.old as User
          if (deletedUser?.id) {
            // Update TanStack Query cache
            queryClient.setQueryData(['users'], (oldData: UsersApiResponse | undefined) => {
              if (!oldData) return oldData
              return {
                ...oldData,
                data: oldData.data.filter(user => user.id !== deletedUser.id),
                total: oldData.total - 1,
              }
            })
            
            // Remove from individual user cache
            queryClient.removeQueries({ queryKey: ['users', deletedUser.id] })
            // Don't show toast here - let the mutation handle it
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  return query
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: () => fetchUser(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created successfully')
    },
    onError: (error: Error) => {
      // Completely suppress console logging for validation errors
      if (error instanceof UserValidationError) {
        // Prevent any logging by overriding console temporarily
        const originalConsoleError = console.error
        const originalConsoleLog = console.log
        const originalConsoleWarn = console.warn
        
        console.error = () => {}
        console.log = () => {}
        console.warn = () => {}
        
        // Show validation errors as warning toasts, not error toasts
        if (error.message.includes('email address has already been registered')) {
          toast.warning('This email address is already registered. Please use a different email.')
        } else if (error.message.includes('Username already exists')) {
          toast.warning('This username is already taken. Please choose a different username.')
        } else if (error.message.includes('Missing required fields')) {
          toast.warning('Please fill in all required fields.')
        } else {
          toast.warning(error.message)
        }
        
        // Restore console after a brief delay
        setTimeout(() => {
          console.error = originalConsoleError
          console.log = originalConsoleLog
          console.warn = originalConsoleWarn
        }, 100)
      } else {
        // Show actual server errors as error toasts
        toast.error(error.message || 'Failed to create user. Please try again.')
      }
    },
    // Prevent React from logging mutation errors
    throwOnError: false,
    // Additional meta to prevent logging
    meta: {
      suppressErrorLogging: true
    }
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserSchema }) => updateUser(id, data),
    onSuccess: (updatedUser) => {
      // Invalidate users list and specific user
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['users', updatedUser.id] })
      toast.success('User updated successfully')
    },
    onError: (error: Error) => {
      // Completely suppress console logging for validation errors
      if (error instanceof UserValidationError) {
        // Prevent any logging by overriding console temporarily
        const originalConsoleError = console.error
        const originalConsoleLog = console.log
        const originalConsoleWarn = console.warn
        
        console.error = () => {}
        console.log = () => {}
        console.warn = () => {}
        
        // Show validation errors as warning toasts, not error toasts
        if (error.message.includes('Username already exists')) {
          toast.warning('This username is already taken. Please choose a different username.')
        } else if (error.message.includes('Invalid user ID format')) {
          toast.warning('Invalid user selected. Please refresh and try again.')
        } else {
          toast.warning(error.message)
        }
        
        // Restore console after a brief delay
        setTimeout(() => {
          console.error = originalConsoleError
          console.log = originalConsoleLog
          console.warn = originalConsoleWarn
        }, 100)
      } else {
        // Show actual server errors as error toasts
        toast.error(error.message || 'Failed to update user. Please try again.')
      }
    },
    // Prevent React from logging mutation errors
    throwOnError: false,
    // Additional meta to prevent logging
    meta: {
      suppressErrorLogging: true
    }
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted successfully')
    },
    onError: (error: Error) => {
      // Completely suppress console logging for validation errors
      if (error instanceof UserValidationError) {
        // Prevent any logging by overriding console temporarily
        const originalConsoleError = console.error
        const originalConsoleLog = console.log
        const originalConsoleWarn = console.warn
        
        console.error = () => {}
        console.log = () => {}
        console.warn = () => {}
        
        // Show validation errors as warning toasts, not error toasts
        if (error.message.includes('cannot delete your own account')) {
          toast.warning('You cannot delete your own account.')
        } else if (error.message.includes('Only Super Admin can delete')) {
          toast.warning('Only Super Admins can delete Admin accounts.')
        } else if (error.message.includes('Invalid user ID format')) {
          toast.warning('Invalid user selected. Please refresh and try again.')
        } else {
          toast.warning(error.message)
        }
        
        // Restore console after a brief delay
        setTimeout(() => {
          console.error = originalConsoleError
          console.log = originalConsoleLog
          console.warn = originalConsoleWarn
        }, 100)
      } else {
        // Show actual server errors as error toasts
        toast.error(error.message || 'Failed to delete user. Please try again.')
      }
    },
    // Prevent React from logging mutation errors
    throwOnError: false,
    // Additional meta to prevent logging
    meta: {
      suppressErrorLogging: true
    }
  })
}
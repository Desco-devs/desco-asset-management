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

const API_BASE = '/api/users'

async function fetchAllUsers(): Promise<UsersApiResponse> {
  const response = await fetch(API_BASE)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }
  
  return response.json()
}

function filterUsersClientSide(users: User[], filters: UserFiltersSchema): User[] {
  let filteredUsers = [...users]
  
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
    const error = new Error(result.error || 'Failed to create user')
    error.name = 'CreateUserError'
    throw error
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
    const error = await response.json()
    throw new Error(error.error || 'Failed to update user')
  }
  
  return response.json()
}

async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete user')
  }
}

export function useUsers(filters?: UserFiltersSchema) {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['users'],
    queryFn: fetchAllUsers,
    staleTime: 1000 * 60 * 5, // 5 minutes
    select: (data: UsersApiResponse) => {
      const filteredUsers = filterUsersClientSide(data.data, filters || {})
      return {
        ...data,
        data: filteredUsers,
        total: filteredUsers.length,
        originalTotal: data.total,
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
            toast.success(`New user "${newUser.full_name}" was created`)
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
            
            // Update individual user cache
            queryClient.setQueryData(['users', updatedUser.id], updatedUser)
            toast.success(`User "${updatedUser.full_name}" was updated`)
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
            toast.success(`User "${deletedUser.full_name}" was deleted`)
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
      toast.error(error.message || 'Failed to create user')
    },
    // Prevent React from logging mutation errors
    throwOnError: false,
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
      toast.error(error.message || 'Failed to update user')
    },
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
      toast.error(error.message || 'Failed to delete user')
    },
  })
}
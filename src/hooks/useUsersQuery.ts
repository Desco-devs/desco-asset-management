'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  User, 
  CreateUserSchema, 
  UpdateUserSchema, 
  UsersApiResponse 
} from '@/types/users'

const API_BASE = '/api/users'

async function fetchUsers(): Promise<UsersApiResponse> {
  const response = await fetch(API_BASE)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`)
  }
  
  return response.json()
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
    throw new Error(result.error || 'Failed to create user')
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
    throw new Error(result.error || 'Failed to update user')
  }
  
  return response.json()
}

async function deleteUser(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const result = await response.json()
    throw new Error(result.error || 'Failed to delete user')
  }
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 0, // Always fresh for realtime
  })
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
    onMutate: async (formData) => {
      await queryClient.cancelQueries({ queryKey: ['users'] })
      const previous = queryClient.getQueryData(['users'])

      // Simple optimistic update
      queryClient.setQueryData(['users'], (old: UsersApiResponse | undefined) => {
        if (!old) return old
        const optimisticUser: User = {
          id: `temp-${Date.now()}`,
          username: formData.username,
          email: formData.email,
          full_name: formData.full_name,
          phone: formData.phone || null,
          user_profile: null,
          role: formData.role || 'VIEWER',
          user_status: 'ACTIVE',
          is_online: false,
          last_seen: null,
          created_at: new Date(),
          updated_at: new Date(),
        }
        return {
          ...old,
          data: [optimisticUser, ...old.data],
          total: old.total + 1,
        }
      })

      return { previous }
    },
    onError: (error, formData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['users'], context.previous)
      }
      toast.error(`Failed to create user: ${error.message}`)
    },
    onSuccess: () => {
      toast.success('User created successfully!')
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserSchema }) => updateUser(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] })
      const previous = queryClient.getQueryData(['users'])

      // Simple optimistic update
      queryClient.setQueryData(['users'], (old: UsersApiResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map(user => 
            user.id === id ? { ...user, ...data, updated_at: new Date() } : user
          ),
        }
      })

      return { previous }
    },
    onError: (error, { id }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['users'], context.previous)
      }
      toast.error(`Failed to update user: ${error.message}`)
    },
    onSuccess: () => {
      toast.success('User updated successfully!')
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteUser,
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['users'] })
      const previous = queryClient.getQueryData(['users'])

      // Simple optimistic update
      queryClient.setQueryData(['users'], (old: UsersApiResponse | undefined) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.filter(user => user.id !== userId),
          total: old.total - 1,
        }
      })

      return { previous }
    },
    onError: (error, userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['users'], context.previous)
      }
      toast.error(`Failed to delete user: ${error.message}`)
    },
    onSuccess: () => {
      toast.success('User deleted successfully!')
    },
  })
}
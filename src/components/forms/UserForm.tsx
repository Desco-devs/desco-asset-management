'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, UserRole, UserStatus, CreateUserSchema, UpdateUserSchema, USER_ROLES, USER_STATUSES, ROLE_COLORS, STATUS_COLORS } from '@/types/users'
import { createUserSchema, updateUserSchema } from '@/lib/validations/users'

interface UserFormProps {
  user?: User
  onSubmit: (data: CreateUserSchema | UpdateUserSchema) => Promise<void>
  onCancel: () => void
  loading?: boolean
  mode: 'create' | 'edit' | 'view'
}

export function UserForm({ user, onSubmit, onCancel, loading = false, mode }: UserFormProps) {
  const isEdit = mode === 'edit'
  const isView = mode === 'view'
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema),
    defaultValues: isEdit || isView ? {
      username: user?.username || '',
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      role: user?.role || 'VIEWER',
      user_status: user?.user_status || 'ACTIVE',
    } : {
      email: '',
      password: '',
      username: '',
      full_name: '',
      phone: '',
      role: 'VIEWER' as const,
    }
  })

  const selectedRole = watch('role')
  const selectedStatus = watch('user_status')

  const handleFormSubmit = async (data: CreateUserSchema | UpdateUserSchema) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  if (isView) {
    return (
      <div className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Username</Label>
            <p className="text-sm bg-gray-50 p-3 rounded-md border w-full">{user?.username}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Full Name</Label>
            <p className="text-sm bg-gray-50 p-3 rounded-md border w-full">{user?.full_name}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Phone</Label>
            <p className="text-sm bg-gray-50 p-3 rounded-md border w-full">{user?.phone || '—'}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Role</Label>
            <div>
              <Badge className={ROLE_COLORS[user?.role || 'VIEWER']}>
                {USER_ROLES[user?.role || 'VIEWER']}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Status</Label>
            <div>
              <Badge className={STATUS_COLORS[user?.user_status || 'ACTIVE']}>
                {USER_STATUSES[user?.user_status || 'ACTIVE']}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Online Status</Label>
            <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-md border w-full">
              <span 
                className={`w-3 h-3 rounded-full ${
                  user?.is_online ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm">{user?.is_online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">Created At</Label>
          <p className="text-sm bg-gray-50 p-3 rounded-md border w-full">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {!isEdit && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="user@company.com"
              disabled={loading}
              className="w-full"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              {...register('password')}
              placeholder="Minimum 8 characters"
              disabled={loading}
              className="w-full"
            />
            {errors.password && (
              <p className="text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <Input
            id="username"
            {...register('username')}
            placeholder="johndoe"
            disabled={loading}
            className="w-full"
          />
          {errors.username && (
            <p className="text-sm text-red-500">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            {...register('full_name')}
            placeholder="John Doe"
            disabled={loading}
            className="w-full"
          />
          {errors.full_name && (
            <p className="text-sm text-red-500">{errors.full_name.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            {...register('phone')}
            placeholder="+1 (555) 000-0000"
            disabled={loading}
            className="w-full"
          />
          {errors.phone && (
            <p className="text-sm text-red-500">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select
            value={selectedRole || 'VIEWER'}
            onValueChange={(value) => setValue('role', value as UserRole)}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(USER_ROLES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-red-500">{errors.role.message}</p>
          )}
        </div>
      </div>

      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor="user_status">Account Status</Label>
          <Select
            value={selectedStatus || 'ACTIVE'}
            onValueChange={(value) => setValue('user_status', value as UserStatus)}
            disabled={loading}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(USER_STATUSES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.user_status && (
            <p className="text-sm text-red-500">{errors.user_status.message}</p>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel} 
          disabled={loading} 
          className="flex-1"
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          disabled={loading}
          className="flex-1"
        >
          {loading && (
            <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {loading ? 'Creating...' : isEdit ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}
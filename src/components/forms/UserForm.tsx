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
import { Loader2 } from 'lucide-react'

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
    // resolver: zodResolver(isEdit ? updateUserSchema : createUserSchema) as any,
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
      <div className="space-y-4 dark:!bg-gray-900 dark:!text-white">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium dark:!text-white">Username</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600">{user?.username}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium dark:!text-white">Full Name</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600">{user?.full_name}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium dark:!text-white">Phone</Label>
            <p className="text-sm bg-muted p-3 rounded-md border w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600">{user?.phone || '—'}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium dark:!text-white">Role</Label>
            <div>
              <Badge className={ROLE_COLORS[user?.role || 'VIEWER']}>
                {USER_ROLES[user?.role || 'VIEWER']}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium dark:!text-white">Status</Label>
            <div>
              <Badge className={STATUS_COLORS[user?.user_status || 'ACTIVE']}>
                {USER_STATUSES[user?.user_status || 'ACTIVE']}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium dark:!text-white">Online Status</Label>
            <div className="flex items-center gap-2 bg-muted p-3 rounded-md border w-full dark:!bg-gray-800 dark:!border-gray-600">
              <span 
                className={`w-3 h-3 rounded-full ${
                  user?.is_online ? 'bg-green-500' : 'bg-gray-400'
                }`}
              />
              <span className="text-sm dark:!text-white">{user?.is_online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium dark:!text-white">Created At</Label>
          <p className="text-sm bg-muted p-3 rounded-md border w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600">
            {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 dark:!bg-gray-900 dark:!text-white">
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
              className="w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
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
              className="w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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
            className="w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600"
          />
          {errors.username && (
            <p className="text-sm text-destructive">{errors.username.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name *</Label>
          <Input
            id="full_name"
            {...register('full_name')}
            placeholder="John Doe"
            disabled={loading}
            className="w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600"
          />
          {errors.full_name && (
            <p className="text-sm text-destructive">{errors.full_name.message}</p>
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
            className="w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600"
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Role *</Label>
          <Select
            value={selectedRole || 'VIEWER'}
            onValueChange={(value) => setValue('role', value as UserRole)}
            disabled={loading}
          >
            <SelectTrigger className="w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600">
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
            <p className="text-sm text-destructive">{errors.role.message}</p>
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
            <SelectTrigger className="w-full dark:!bg-gray-800 dark:!text-white dark:!border-gray-600">
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
            <p className="text-sm text-destructive">{errors.user_status.message}</p>
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {loading 
            ? (isEdit ? 'Updating...' : 'Creating...') 
            : (isEdit ? 'Update User' : 'Create User')
          }
        </Button>
      </div>
    </form>
    </div>
  )
}
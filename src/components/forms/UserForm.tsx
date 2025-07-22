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
import { User, CreateUserSchema, UpdateUserSchema, createUserSchema, updateUserSchema, USER_ROLES, USER_STATUSES, ROLE_COLORS, STATUS_COLORS } from '@/types/users'

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

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error('Error submitting form:', error)
    }
  }

  if (isView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Username</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{user?.username}</p>
              </div>
              <div>
                <Label>Full Name</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{user?.full_name}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">{user?.phone || '—'}</p>
              </div>
              <div>
                <Label>Role</Label>
                <Badge className={ROLE_COLORS[user?.role || 'VIEWER']}>
                  {USER_ROLES[user?.role || 'VIEWER']}
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Badge className={STATUS_COLORS[user?.user_status || 'ACTIVE']}>
                  {USER_STATUSES[user?.user_status || 'ACTIVE']}
                </Badge>
              </div>
              <div>
                <Label>Online Status</Label>
                <div className="flex items-center gap-2">
                  <span 
                    className={`w-2 h-2 rounded-full ${
                      user?.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                  <span className="text-sm">{user?.is_online ? 'Online' : 'Offline'}</span>
                </div>
              </div>
            </div>
            
            <div>
              <Label>Created At</Label>
              <p className="text-sm bg-gray-50 p-2 rounded">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 pt-6">
            <Button 
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit User' : 'Create New User'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {!isEdit && (
            <>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="Enter email address"
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register('password')}
                  placeholder="Enter password (min 8 characters)"
                  disabled={loading}
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              {...register('username')}
              placeholder="Enter username"
              disabled={loading}
            />
            {errors.username && (
              <p className="text-sm text-red-500 mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              {...register('full_name')}
              placeholder="Enter full name"
              disabled={loading}
            />
            {errors.full_name && (
              <p className="text-sm text-red-500 mt-1">{errors.full_name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              {...register('phone')}
              placeholder="Enter phone number (optional)"
              disabled={loading}
            />
            {errors.phone && (
              <p className="text-sm text-red-500 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => setValue('role', value as any)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(USER_ROLES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{label}</span>
                      <Badge variant="outline" className="text-xs">
                        {key}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500 mt-1">{errors.role.message}</p>
            )}
          </div>

          {isEdit && (
            <div>
              <Label htmlFor="user_status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setValue('user_status', value as any)}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(USER_STATUSES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{label}</span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${key === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {key}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.user_status && (
                <p className="text-sm text-red-500 mt-1">{errors.user_status.message}</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
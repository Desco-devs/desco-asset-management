'use client'

import { useState } from 'react'
import { Search, Filter, ChevronDown } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserFiltersSchema } from '@/lib/validations/users'

interface UserFiltersProps {
  filters: UserFiltersSchema
  hasActiveFilters: boolean
  onSearchChange: (search: string) => void
  onRoleFilter: (role: string) => void
  onStatusFilter: (status: string) => void
  onClearFilters: () => void
}

export function UserFilters({
  filters,
  hasActiveFilters,
  onSearchChange,
  onRoleFilter,
  onStatusFilter,
  onClearFilters,
}: UserFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  // Helper to parse grouped filter value
  const handleGroupedFilterChange = (value: string) => {
    if (value === 'all') {
      onRoleFilter('all')
      onStatusFilter('all')
    } else if (value.startsWith('role-')) {
      onRoleFilter(value.replace('role-', ''))
    } else if (value.startsWith('status-')) {
      onStatusFilter(value.replace('status-', ''))
    }
  }

  // Get current grouped filter value
  const getGroupedFilterValue = () => {
    if (filters.role && filters.role !== 'all') return `role-${filters.role}`
    if (filters.status && filters.status !== 'all') return `status-${filters.status}`
    return 'all'
  }

  // Get display text for current filter
  const getFilterDisplayText = () => {
    if (filters.role && filters.role !== 'all') {
      const roleMap = {
        'SUPERADMIN': 'Super Admin',
        'ADMIN': 'Admin', 
        'VIEWER': 'Viewer'
      }
      return roleMap[filters.role as keyof typeof roleMap] || filters.role
    }
    if (filters.status && filters.status !== 'all') {
      return filters.status === 'ACTIVE' ? 'Active' : 'Inactive'
    }
    return 'All Users'
  }

  return (
    <Card>
      <CardHeader className="pb-1 px-3 pt-2">
        <CardTitle className="text-sm md:text-base flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search & Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-2">
        <div className="space-y-3">
          {/* Search bar - always visible */}
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search users..."
              className="pl-10 text-sm"
              value={filters.search || ''}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          
          {/* Mobile: Single grouped filter */}
          <div className="md:hidden">
            <Select 
              value={getGroupedFilterValue()} 
              onValueChange={handleGroupedFilterChange}
            >
              <SelectTrigger className="w-full text-sm">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder={getFilterDisplayText()} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-sm">All Users</SelectItem>
                
                {/* Role Section */}
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1">
                  Role
                </div>
                <SelectItem value="role-SUPERADMIN" className="text-sm">Super Admin</SelectItem>
                <SelectItem value="role-ADMIN" className="text-sm">Admin</SelectItem>
                <SelectItem value="role-VIEWER" className="text-sm">Viewer</SelectItem>
                
                {/* Status Section */}
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-t mt-1">
                  Status
                </div>
                <SelectItem value="status-ACTIVE" className="text-sm">Active</SelectItem>
                <SelectItem value="status-INACTIVE" className="text-sm">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop: Separate filters */}
          <div className="hidden md:flex gap-3">
            <Select 
              value={filters.role || 'all'} 
              onValueChange={onRoleFilter}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="VIEWER">Viewer</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.status || 'all'} 
              onValueChange={onStatusFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={onClearFilters}
              disabled={!hasActiveFilters}
              size="sm"
            >
              Clear Filters
              {hasActiveFilters && <Badge variant="secondary" className="ml-2">Active</Badge>}
            </Button>
          </div>

          {/* Mobile: Clear filters button */}
          {hasActiveFilters && (
            <div className="md:hidden">
              <Button 
                variant="outline" 
                onClick={onClearFilters}
                size="sm"
                className="w-full text-sm"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import React from 'react'
import { Search, Plus, Filter, List, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
interface UserSearchAndActionsProps {
  searchQuery: string
  filterRole: string
  filterStatus: string
  hasActiveFilters: boolean
  onSearchChange: (search: string) => void
  onRoleFilter: (role: string) => void
  onStatusFilter: (status: string) => void
  onClearFilters: () => void
  onCreateNew: () => void
}

export function UserSearchAndActions({
  searchQuery,
  filterRole,
  filterStatus,
  hasActiveFilters,
  onSearchChange,
  onRoleFilter,
  onStatusFilter,
  onClearFilters,
  onCreateNew,
}: UserSearchAndActionsProps) {
  
  const handleSearch = (value: string) => {
    onSearchChange(value || '')
  }

  // Helper to get the current grouped filter value
  const getFilterValue = () => {
    if (filterRole && filterRole !== 'all') return `role-${filterRole}`
    if (filterStatus && filterStatus !== 'all') return `status-${filterStatus}`
    return ""
  }

  // Helper to handle filter changes
  const handleFilterChange = (value: string) => {
    if (value === "clear-all") {
      onRoleFilter('')
      onStatusFilter('')
    }
    // Role filters
    else if (value.startsWith("role-")) {
      const role = value.replace("role-", "")
      onRoleFilter(role)
      onStatusFilter('') // Reset status filter
    }
    // Status filters
    else if (value.startsWith("status-")) {
      const status = value.replace("status-", "")
      onStatusFilter(status)
      onRoleFilter('') // Reset role filter
    }
  }

  // Helper to get the current sort value (we'll add sorting later if needed)
  const getSortValue = () => {
    // For now, return default value
    return "created_at"
  }

  const handleSortChange = (value: string) => {
    // We'll implement sorting later if needed
    console.log('Sort changed to:', value)
  }

  return (
    <div className="space-y-4">
      {/* Add Button - Mobile: above search, Desktop: side by side */}
      <div className="sm:hidden">
        <Button 
          onClick={onCreateNew}
          className="gap-2 font-semibold w-full"
        >
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Search and Add Button */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name, username, email..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <div className="hidden sm:block">
          <Button 
            onClick={onCreateNew}
            className="gap-2 font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filter and Sort Buttons - side by side on mobile like projects */}
      <div className="flex gap-3">
        <Select
          value={getFilterValue()}
          onValueChange={handleFilterChange}
        >
          <SelectTrigger className="h-11 flex-1">
            <Filter className="h-4 w-4 mr-2" />
            <span>Filter</span>
          </SelectTrigger>
          <SelectContent className="w-80">
            <div className="p-3 max-h-96 overflow-y-auto">
              {/* Clear Filters */}
              {(filterRole || filterStatus) && (
                <div className="mb-4">
                  <SelectItem value="clear-all" className="text-red-600 font-medium">
                    Clear All Filters
                  </SelectItem>
                </div>
              )}

              {/* Role Filter */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Roles
                </div>
                <div className="space-y-1">
                  <SelectItem value="role-SUPERADMIN">Super Admin</SelectItem>
                  <SelectItem value="role-ADMIN">Admin</SelectItem>
                  <SelectItem value="role-VIEWER">Viewer</SelectItem>
                </div>
              </div>

              {/* Status Filter */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Status
                </div>
                <div className="space-y-1">
                  <SelectItem value="status-ACTIVE">Active</SelectItem>
                  <SelectItem value="status-INACTIVE">Inactive</SelectItem>
                </div>
              </div>
            </div>
          </SelectContent>
        </Select>

        {/* Sort Button */}
        <Select
          value={getSortValue()}
          onValueChange={handleSortChange}
        >
          <SelectTrigger className="h-11 flex-1">
            <List className="h-4 w-4 mr-2" />
            <span>Sort</span>
          </SelectTrigger>
          <SelectContent>
            <div className="p-1">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                Most Recent
              </div>
              <SelectItem value="created_at">Newest Added</SelectItem>
              <SelectItem value="created_at_old">Oldest Added</SelectItem>

              <div className="border-t my-2"></div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                Alphabetical
              </div>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>

              <div className="border-t my-2"></div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                Role & Status
              </div>
              <SelectItem value="role">By Role</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
            </div>
          </SelectContent>
        </Select>
      </div>

      {/* Active Filter Badges */}
      {(filterRole || filterStatus || searchQuery) && (
        <div className="flex flex-wrap gap-2">
          {/* Search Badge */}
          {searchQuery && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: "{searchQuery}"
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                onClick={() => handleSearch('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Role Filter Badge */}
          {filterRole && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Role: {(() => {
                const roleMap = {
                  'SUPERADMIN': 'Super Admin',
                  'ADMIN': 'Admin', 
                  'VIEWER': 'Viewer'
                }
                return roleMap[filterRole as keyof typeof roleMap] || filterRole
              })()}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                onClick={() => onRoleFilter('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Status Filter Badge */}
          {filterStatus && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Status: {filterStatus === 'ACTIVE' ? 'Active' : 'Inactive'}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                onClick={() => onStatusFilter('')}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Clear All Badge */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onRoleFilter('')
              onStatusFilter('')
              handleSearch('')
            }}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  )
}
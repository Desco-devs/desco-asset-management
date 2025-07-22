'use client'

import { Search, Filter } from 'lucide-react'
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
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by username, name, or phone..."
                className="pl-10"
                value={filters.search || ''}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          
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
          >
            Clear Filters
            {hasActiveFilters && <Badge variant="secondary" className="ml-2">Active</Badge>}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
'use client'

import React from 'react'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, Plus, Edit, Trash2 } from "lucide-react"
import { useLocations, useDeleteLocation } from '@/hooks/api/use-projects'
import { useProjectsStore, useLocationModal, useLocationTable } from '@/stores/projects-store'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Location } from '@/types/projects'

interface LocationsTableProps {
  onSelectLocation?: (location: Location) => void
  selectedLocationId?: string | null
}

export function LocationsTable({ onSelectLocation, selectedLocationId }: LocationsTableProps) {
  const { data: locations, isLoading, error } = useLocations()
  const { mutate: deleteLocation, isPending: isDeleting } = useDeleteLocation()
  const setModal = useProjectsStore(state => state.setLocationModal)
  
  const locationTable = useLocationTable()
  const setLocationTable = useProjectsStore(state => state.setLocationTable)
  const setCurrentView = useProjectsStore(state => state.setCurrentView) 
  const setSelectedLocation = useProjectsStore(state => state.setSelectedLocation)

  const handleEdit = (location: Location) => {
    setModal(true, location.id)
  }

  const handleDelete = (location: Location) => {
    if (confirm(`Are you sure you want to delete "${location.address}"?`)) {
      deleteLocation(location.id, {
        onSuccess: () => {
          toast.success('Location deleted successfully')
          // Clear selection if deleted location was selected
          if (selectedLocationId === location.id) {
            setSelectedLocation(null)
          }
        },
        onError: (error) => {
          toast.error('Failed to delete location: ' + error.message)
        }
      })
    }
  }

  const handleRowClick = (location: Location) => {
    setSelectedLocation(location.id)
    setCurrentView('clients')
    onSelectLocation?.(location)
  }

  const handleSearch = (value: string) => {
    setLocationTable({ search: value, page: 1 })
  }

  const handleSort = (sortBy: typeof locationTable.sortBy) => {
    const sortOrder = locationTable.sortBy === sortBy && locationTable.sortOrder === 'asc' ? 'desc' : 'asc'
    setLocationTable({ sortBy, sortOrder })
  }

  // Filter locations based on search
  const filteredLocations = React.useMemo(() => {
    if (!locations) return []
    
    if (!locationTable.search) return locations
    
    return locations.filter(location =>
      location.address.toLowerCase().includes(locationTable.search.toLowerCase())
    )
  }, [locations, locationTable.search])

  // Sort locations
  const sortedLocations = React.useMemo(() => {
    if (!filteredLocations.length) return []
    
    return [...filteredLocations].sort((a, b) => {
      const aValue = a[locationTable.sortBy]
      const bValue = b[locationTable.sortBy]
      
      if (locationTable.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      }
      return aValue < bValue ? 1 : -1
    })
  }, [filteredLocations, locationTable.sortBy, locationTable.sortOrder])

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading locations: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Locations</h2>
          <p className="text-muted-foreground">
            Manage your locations and view associated clients
          </p>
        </div>
        <Button onClick={() => setModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search locations..."
          value={locationTable.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('address')}
              >
                Address
                {locationTable.sortBy === 'address' && (
                  <span className="ml-1">
                    {locationTable.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('created_at')}
              >
                Created
                {locationTable.sortBy === 'created_at' && (
                  <span className="ml-1">
                    {locationTable.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading locations...
                </TableCell>
              </TableRow>
            ) : sortedLocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  {locationTable.search ? 'No locations found' : 'No locations yet'}
                </TableCell>
              </TableRow>
            ) : (
              sortedLocations.map((location) => (
                <TableRow 
                  key={location.id}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedLocationId === location.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleRowClick(location)}
                >
                  <TableCell className="font-medium">
                    {location.address}
                    {selectedLocationId === location.id && (
                      <Badge variant="secondary" className="ml-2">
                        Selected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(location.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          handleEdit(location)
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(location)
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      {locations && (
        <div className="text-sm text-muted-foreground">
          Showing {sortedLocations.length} of {locations.length} locations
        </div>
      )}
    </div>
  )
}
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
import { Card, CardContent } from "@/components/ui/card"
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
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal'

interface LocationsTableProps {
  onSelectLocation?: (location: Location) => void
  selectedLocationId?: string | null
}

export function LocationsTable({ onSelectLocation, selectedLocationId }: LocationsTableProps) {
  const { data: locations, isLoading, error } = useLocations()
  const { mutate: deleteLocation, isPending: isDeleting } = useDeleteLocation()
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [locationToDelete, setLocationToDelete] = React.useState<Location | null>(null)

  const setModal = useProjectsStore(state => state.setLocationModal)
  const locationTable = useLocationTable()
  const setLocationTable = useProjectsStore(state => state.setLocationTable)
  const setCurrentView = useProjectsStore(state => state.setCurrentView) 
  const setSelectedLocation = useProjectsStore(state => state.setSelectedLocation)

  const handleEdit = (location: Location) => {
    setModal(true, location.id)
  }

  const handleDelete = (location: Location) => {
    setLocationToDelete(location)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!locationToDelete) return
    
    deleteLocation(locationToDelete.id, {
      onSuccess: () => {
        toast.success('Location deleted successfully')
        // Clear selection if deleted location was selected
        if (selectedLocationId === locationToDelete.id) {
          setSelectedLocation(null)
        }
        setDeleteModalOpen(false)
        setLocationToDelete(null)
      },
      onError: (error) => {
        toast.error('Failed to delete location: ' + error.message)
      }
    })
  }

  const handleRowClick = (location: Location) => {
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
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Locations</h2>
          <p className="text-muted-foreground">
            Manage your locations and view associated clients
          </p>
        </div>
        
        {/* Action Button Section - Mobile First */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => setModal(true)}
            className="gap-2 flex-1 sm:flex-none font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
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

      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg">
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
              sortedLocations.map((location, index) => (
                <TableRow 
                  key={location.id || `location-${index}`}
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
                    {location.created_at ? (
                      (() => {
                        try {
                          const date = new Date(location.created_at)
                          return isNaN(date.getTime()) ? 'Just now' : formatDistanceToNow(date, { addSuffix: true })
                        } catch {
                          return 'Just now'
                        }
                      })()
                    ) : 'Just now'}
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
                            e.preventDefault()
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

      {/* Mobile Card View - User Pattern */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : sortedLocations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              {locationTable.search ? 'No locations found' : 'No locations yet'}
            </CardContent>
          </Card>
        ) : (
          sortedLocations.map((location, index) => (
            <Card 
              key={location.id || `location-${index}`} 
              className={`cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] ${
                selectedLocationId === location.id ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
              onClick={() => handleRowClick(location)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  {/* Location Icon */}
                  <div className="relative">
                    <div className="h-12 w-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-semibold">
                      📍
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{location.address}</h3>
                        {selectedLocationId === location.id && (
                          <Badge variant="secondary" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                      {/* Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
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
                              e.preventDefault()
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
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span>
                        {location.created_at ? (
                          (() => {
                            try {
                              const date = new Date(location.created_at)
                              return isNaN(date.getTime()) ? 'Just now' : `Created ${formatDistanceToNow(date, { addSuffix: true })}`
                            } catch {
                              return 'Just now'
                            }
                          })()
                        ) : 'Just now'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Results count */}
      {locations && (
        <div className="text-sm text-muted-foreground">
          Showing {sortedLocations.length} of {locations.length} locations
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Location"
        description="Are you sure you want to delete this location? This action cannot be undone and will remove all associated clients, projects, and data."
        itemName={locationToDelete?.address}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmText="Delete Location"
      />
    </div>
  )
}
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Search, Plus, Edit, Trash2, Eye, Filter, X, List, ChevronLeft, ChevronRight } from "lucide-react"
import { useClients, useDeleteClient, useLocations } from '@/hooks/api/use-projects'
import { useProjectsStore, useClientModal, useClientTable } from '@/stores/projects-store'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Client } from '@/types/projects'
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal'

interface ClientsTableProps {
  onSelectClient?: (client: Client) => void
}

export function ClientsTable({ onSelectClient }: ClientsTableProps) {
  const setClientTable = useProjectsStore(state => state.setClientTable)
  const setClientModal = useProjectsStore(state => state.setClientModal)
  const isMobile = useProjectsStore(state => state.isMobile)
  const setIsMobile = useProjectsStore(state => state.setIsMobile)
  const getEffectiveClientItemsPerPage = useProjectsStore(state => state.getEffectiveClientItemsPerPage)

  // Mobile detection
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [setIsMobile])
  
  const { data: locations } = useLocations()
  const { data: clients, isLoading, error } = useClients()
  const { mutate: deleteClient, isPending: isDeleting } = useDeleteClient()

  // Local filtering state
  const [locationFilter, setLocationFilter] = React.useState<string>('all')
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [clientToDelete, setClientToDelete] = React.useState<Client | null>(null)
  
  const setModal = useProjectsStore(state => state.setClientModal)
  const clientTable = useClientTable()

  // No longer need selectedLocation since we show all clients

  const handleEdit = (client: Client) => {
    setClientModal(true, client.id)
  }

  const handleDelete = (client: Client) => {
    setClientToDelete(client)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!clientToDelete) return
    
    deleteClient(clientToDelete.id, {
      onSuccess: () => {
        toast.success('Client deleted successfully')
        setDeleteModalOpen(false)
        setClientToDelete(null)
      },
      onError: (error) => {
        toast.error('Failed to delete client: ' + error.message)
      }
    })
  }

  const handleRowClick = (client: Client) => {
    onSelectClient?.(client)
  }

  const handleSearch = (value: string) => {
    setClientTable({ search: value, page: 1 })
  }

  const handleSort = (sortBy: typeof clientTable.sortBy) => {
    const sortOrder = clientTable.sortBy === sortBy && clientTable.sortOrder === 'asc' ? 'desc' : 'asc'
    setClientTable({ sortBy, sortOrder })
  }

  // Removed handleBack since no hierarchical navigation

  // Filter clients based on search and location
  const filteredClients = React.useMemo(() => {
    if (!clients) return []
    
    let filtered = clients

    // Apply search filter
    if (clientTable.search) {
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(clientTable.search.toLowerCase())
      )
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(client => 
        client.location_id === locationFilter
      )
    }

    return filtered
  }, [clients, clientTable.search, locationFilter])

  // Sort clients
  const sortedClients = React.useMemo(() => {
    if (!filteredClients.length) return []
    
    return [...filteredClients].sort((a, b) => {
      const aValue = a[clientTable.sortBy]
      const bValue = b[clientTable.sortBy]
      
      if (clientTable.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      }
      return aValue < bValue ? 1 : -1
    })
  }, [filteredClients, clientTable.sortBy, clientTable.sortOrder])

  // Pagination logic
  const paginationData = React.useMemo(() => {
    const itemsPerPage = getEffectiveClientItemsPerPage()
    const startIndex = (clientTable.page - 1) * itemsPerPage
    const paginatedClients = sortedClients.slice(startIndex, startIndex + itemsPerPage)
    const totalPages = Math.ceil(sortedClients.length / itemsPerPage)
    
    return {
      paginatedClients,
      totalPages,
      itemsPerPage,
      currentPage: clientTable.page
    }
  }, [sortedClients, clientTable.page, getEffectiveClientItemsPerPage])

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setClientTable({ page: newPage })
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading clients: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Search, Filter & Sort Section */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients by name..."
            value={clientTable.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {/* Filter and Sort Buttons */}
        <div className="flex gap-3">
          <Select
            value={locationFilter !== 'all' ? `location-${locationFilter}` : ""}
            onValueChange={(value) => {
              if (value === "clear-all") {
                setLocationFilter('all');
              }
              // Location filters
              else if (value.startsWith("location-")) {
                const locationId = value.replace("location-", "");
                setLocationFilter(locationId);
              }
            }}
          >
            <SelectTrigger className="h-11 flex-1">
              <Filter className="h-4 w-4 mr-2" />
              <span>Filter</span>
            </SelectTrigger>
            <SelectContent className="w-80">
              <div className="p-3 max-h-96 overflow-y-auto">
                {/* Clear Filters */}
                {locationFilter !== 'all' && (
                  <div className="mb-4">
                    <SelectItem value="clear-all" className="text-red-600 font-medium">
                      Clear All Filters
                    </SelectItem>
                  </div>
                )}

                {/* Location Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Locations
                  </div>
                  <div className="space-y-1">
                    {locations?.map((location) => (
                      <SelectItem
                        key={location.id}
                        value={`location-${location.id}`}
                      >
                        {location.address}
                      </SelectItem>
                    ))}
                  </div>
                </div>
              </div>
            </SelectContent>
          </Select>

          {/* Sort Button */}
          <Select
            value={(() => {
              if (!clientTable.sortBy) return "clear-sort";
              
              if (clientTable.sortBy === "created_at") {
                return clientTable.sortOrder === "desc" ? "created_at" : "created_at_old";
              }
              if (clientTable.sortBy === "name") {
                return clientTable.sortOrder === "asc" ? "name" : "name_desc";
              }
              
              return clientTable.sortBy;
            })()}
            onValueChange={(value) => {
              if (value === "clear-sort") {
                handleSort('name'); // Reset to default
                return;
              }
              
              if (value === "created_at") {
                setClientTable({ sortBy: "created_at", sortOrder: "desc" });
              } else if (value === "created_at_old") {
                setClientTable({ sortBy: "created_at", sortOrder: "asc" });
              } else if (value === "name") {
                setClientTable({ sortBy: "name", sortOrder: "asc" });
              } else if (value === "name_desc") {
                setClientTable({ sortBy: "name", sortOrder: "desc" });
              }
            }}
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
                <SelectItem value="name">Client A-Z</SelectItem>
                <SelectItem value="name_desc">Client Z-A</SelectItem>

                <div className="border-t my-2"></div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-2">
                  Quick Actions
                </div>
                <SelectItem value="clear-sort">Clear Sort</SelectItem>
              </div>
            </SelectContent>
          </Select>
        </div>

        {/* Active Filter Badges */}
        {(locationFilter !== 'all' || clientTable.search || clientTable.sortBy) && (
          <div className="flex flex-wrap gap-2">
            {/* Sort Badge */}
            {clientTable.sortBy && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Sort: {(() => {
                  if (clientTable.sortBy === "created_at")
                    return clientTable.sortOrder === "desc" ? "Newest Added" : "Oldest Added";
                  if (clientTable.sortBy === "name")
                    return clientTable.sortOrder === "asc" ? "Client A-Z" : "Client Z-A";
                  return clientTable.sortBy;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setClientTable({ sortBy: "", sortOrder: "asc" })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {/* Search Badge */}
            {clientTable.search && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Search: "{clientTable.search}"
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

            {/* Location Filter Badge */}
            {locationFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Location: {locations?.find(l => l.id === locationFilter)?.address || locationFilter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setLocationFilter('all')}
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
                setLocationFilter('all');
                handleSearch('');
                setClientTable({ sortBy: "", sortOrder: "asc" });
              }}
              className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('name')}
              >
                Client Name
                {clientTable.sortBy === 'name' && (
                  <span className="ml-1">
                    {clientTable.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('created_at')}
              >
                Created
                {clientTable.sortBy === 'created_at' && (
                  <span className="ml-1">
                    {clientTable.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Loading clients...
                </TableCell>
              </TableRow>
            ) : paginationData.paginatedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {clientTable.search ? 'No clients found' : 'No clients yet'}
                </TableCell>
              </TableRow>
            ) : (
              paginationData.paginatedClients.map((client, index) => (
                <TableRow 
                  key={client.id || `client-${index}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleRowClick(client)}
                >
                  <TableCell className="font-medium">
                    {client.name}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {client.location?.address || 'No location'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {client.projects?.length || 0} projects
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.created_at ? (
                      (() => {
                        try {
                          const date = new Date(client.created_at)
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
                          handleEdit(client)
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDelete(client)
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
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : paginationData.paginatedClients.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              {clientTable.search ? 'No clients found' : 'No clients yet'}
            </CardContent>
          </Card>
        ) : (
          paginationData.paginatedClients.map((client, index) => (
            <Card 
              key={client.id || `client-${index}`} 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
              onClick={() => handleRowClick(client)}
            >
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  {/* Header with title and actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight">{client.name}</h3>
                    </div>
                    {/* Actions dropdown */}
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
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEdit(client)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDelete(client)
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Projects badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {client.projects?.length || 0} projects
                    </Badge>
                  </div>
                  
                  {/* Location */}
                  <p className="text-sm text-gray-600 font-medium">{client.location?.address}</p>
                  
                  {/* Created time */}
                  <div className="text-xs text-gray-400">
                    {client.created_at ? (
                      (() => {
                        try {
                          const date = new Date(client.created_at)
                          return isNaN(date.getTime()) ? 'Just now' : `Created ${formatDistanceToNow(date, { addSuffix: true })}`
                        } catch {
                          return 'Just now'
                        }
                      })()
                    ) : 'Just now'}
                  </div>

                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Mobile-Optimized Pagination */}
      {paginationData.totalPages > 1 && (
        <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(paginationData.currentPage - 1)}
            disabled={paginationData.currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </Button>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              {paginationData.currentPage}/{paginationData.totalPages}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:block">
              of {sortedClients.length} clients
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(paginationData.currentPage + 1)}
            disabled={paginationData.currentPage === paginationData.totalPages}
            className="gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sm:hidden">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Results count */}
      {clients && (
        <div className="text-sm text-muted-foreground">
          Showing {paginationData.paginatedClients.length} of {sortedClients.length} clients
          {sortedClients.length < clients.length && (
            <span className="ml-2">
              (filtered from {clients.length} total)
            </span>
          )}
          {paginationData.totalPages > 1 && (
            <span className="ml-2">
              • Page {paginationData.currentPage} of {paginationData.totalPages}
            </span>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Client"
        description="Are you sure you want to delete this client? This action cannot be undone and will remove all associated projects and data."
        itemName={clientToDelete?.name}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmText="Delete Client"
      />
    </div>
  )
}
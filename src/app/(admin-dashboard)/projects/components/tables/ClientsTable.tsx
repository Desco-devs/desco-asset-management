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
import { MoreHorizontal, Search, Plus, Edit, Trash2 } from "lucide-react"
import { useClients, useDeleteClient, useLocations } from '@/hooks/api/use-projects'
import { useProjectsStore, useClientModal, useClientTable } from '@/stores/projects-store'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Client } from '@/types/projects'

interface ClientsTableProps {
  onSelectClient?: (client: Client) => void
}

export function ClientsTable({ onSelectClient }: ClientsTableProps) {
  const setClientTable = useProjectsStore(state => state.setClientTable)
  const setClientModal = useProjectsStore(state => state.setClientModal)
  
  const { data: locations } = useLocations()
  const { data: clients, isLoading, error } = useClients()
  const { mutate: deleteClient, isPending: isDeleting } = useDeleteClient()

  // Local filtering state
  const [locationFilter, setLocationFilter] = React.useState<string>('all')
  const setModal = useProjectsStore(state => state.setClientModal)
  
  const clientTable = useClientTable()

  // No longer need selectedLocation since we show all clients

  const handleEdit = (client: Client) => {
    setClientModal(true, client.id)
  }

  const handleDelete = (client: Client) => {
    if (confirm(`Are you sure you want to delete "${client.name}"?`)) {
      deleteClient(client.id, {
        onSuccess: () => {
          toast.success('Client deleted successfully')
        },
        onError: (error) => {
          toast.error('Failed to delete client: ' + error.message)
        }
      })
    }
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

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading clients: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">All Clients</h2>
          <p className="text-muted-foreground">
            Manage all clients across all locations
          </p>
        </div>
        <Button onClick={() => setClientModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center flex-wrap">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={clientTable.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Location Filter */}
        <div className="min-w-[180px]">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filter */}
        {locationFilter !== 'all' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocationFilter('all')}
          >
            Clear Filter
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border rounded-lg">
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
            ) : sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {clientTable.search ? 'No clients found' : 'No clients yet'}
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => (
                <TableRow 
                  key={client.id}
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
                    {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
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

      {/* Results count */}
      {clients && (
        <div className="text-sm text-muted-foreground">
          Showing {sortedClients.length} of {clients.length} clients
          {(locationFilter !== 'all' || clientTable.search) && (
            <span className="ml-2">
              (filtered)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
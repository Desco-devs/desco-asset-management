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
import { MoreHorizontal, Search, Plus, Edit, Trash2, ArrowLeft } from "lucide-react"
import { useClients, useDeleteClient, useLocations } from '@/hooks/api/use-projects'
import { useProjectsStore, useClientModal, useClientTable } from '@/stores/projects-store'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Client } from '@/types/projects'

interface ClientsTableProps {
  onSelectClient?: (client: Client) => void
}

export function ClientsTable({ onSelectClient }: ClientsTableProps) {
  const selectedLocationId = useProjectsStore(state => state.selectedLocationId)
  const selectedClientId = useProjectsStore(state => state.selectedClientId)
  const setSelectedClient = useProjectsStore(state => state.setSelectedClient)
  const setCurrentView = useProjectsStore(state => state.setCurrentView)
  const setClientTable = useProjectsStore(state => state.setClientTable)
  
  const { data: locations } = useLocations()
  const { data: clients, isLoading, error } = useClients(selectedLocationId || undefined)
  const { mutate: deleteClient, isPending: isDeleting } = useDeleteClient()
  const setModal = useProjectsStore(state => state.setClientModal)
  
  const clientTable = useClientTable()

  const selectedLocation = selectedLocationId ? locations?.find(loc => loc.id === selectedLocationId) : null

  const handleEdit = (client: Client) => {
    setModal(true, client.id)
  }

  const handleDelete = (client: Client) => {
    if (confirm(`Are you sure you want to delete "${client.name}"?`)) {
      deleteClient(client.id, {
        onSuccess: () => {
          toast.success('Client deleted successfully')
          // Clear selection if deleted client was selected
          if (selectedClientId === client.id) {
            setSelectedClient(null)
          }
        },
        onError: (error) => {
          toast.error('Failed to delete client: ' + error.message)
        }
      })
    }
  }

  const handleRowClick = (client: Client) => {
    setSelectedClient(client.id)
    setCurrentView('projects')
    onSelectClient?.(client)
  }

  const handleSearch = (value: string) => {
    setClientTable({ search: value, page: 1 })
  }

  const handleSort = (sortBy: typeof clientTable.sortBy) => {
    const sortOrder = clientTable.sortBy === sortBy && clientTable.sortOrder === 'asc' ? 'desc' : 'asc'
    setClientTable({ sortBy, sortOrder })
  }

  const handleBack = () => {
    setCurrentView('locations')
  }

  // Filter clients based on search
  const filteredClients = React.useMemo(() => {
    if (!clients) return []
    
    if (!clientTable.search) return clients
    
    return clients.filter(client =>
      client.name.toLowerCase().includes(clientTable.search.toLowerCase())
    )
  }, [clients, clientTable.search])

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
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              Clients
              {selectedLocation && (
                <span className="text-lg font-normal text-muted-foreground ml-2">
                  in {selectedLocation.address}
                </span>
              )}
            </h2>
            <p className="text-muted-foreground">
              Manage clients and view their projects
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setModal(true)}
          disabled={!selectedLocationId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Location context */}
      {selectedLocation && (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm">
            <span className="font-medium">Location:</span> {selectedLocation.address}
          </div>
        </div>
      )}

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
                <TableCell colSpan={4} className="text-center py-8">
                  Loading clients...
                </TableCell>
              </TableRow>
            ) : !selectedLocationId ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  Please select a location to view clients
                </TableCell>
              </TableRow>
            ) : sortedClients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  {clientTable.search ? 'No clients found' : 'No clients yet'}
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => (
                <TableRow 
                  key={client.id}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedClientId === client.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => handleRowClick(client)}
                >
                  <TableCell className="font-medium">
                    {client.name}
                    {selectedClientId === client.id && (
                      <Badge variant="secondary" className="ml-2">
                        Selected
                      </Badge>
                    )}
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
        </div>
      )}
    </div>
  )
}
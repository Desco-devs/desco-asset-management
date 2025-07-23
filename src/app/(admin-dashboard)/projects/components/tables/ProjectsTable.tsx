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
import { MoreHorizontal, Search, Plus, Edit, Trash2, Filter } from "lucide-react"
import { useProjects, useDeleteProject, useClients, useLocations } from '@/hooks/api/use-projects'
import { useProjectsStore, useProjectModal, useProjectTable } from '@/stores/projects-store'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Project } from '@/types/projects'
import { DeleteConfirmationModal } from '@/components/modals/DeleteConfirmationModal'

export function ProjectsTable() {
  const setProjectTable = useProjectsStore(state => state.setProjectTable)
  const setProjectModal = useProjectsStore(state => state.setProjectModal)
  const setLocationModal = useProjectsStore(state => state.setLocationModal)
  const setClientModal = useProjectsStore(state => state.setClientModal)
  
  const { data: clients } = useClients()
  const { data: locations } = useLocations()
  const { data: projects, isLoading, error } = useProjects()
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject()

  // Local filtering state
  const [locationFilter, setLocationFilter] = React.useState<string>('all')
  const [clientFilter, setClientFilter] = React.useState<string>('all')
  
  // Delete confirmation modal state
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false)
  const [projectToDelete, setProjectToDelete] = React.useState<Project | null>(null)
  
  const projectTable = useProjectTable()

  // No longer need selectedClient since we show all projects

  const handleEdit = (project: Project) => {
    setProjectModal(true, project.id)
  }

  const handleDelete = (project: Project) => {
    setProjectToDelete(project)
    setDeleteModalOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!projectToDelete) return
    
    deleteProject(projectToDelete.id, {
      onSuccess: () => {
        toast.success('Project deleted successfully')
        setDeleteModalOpen(false)
        setProjectToDelete(null)
      },
      onError: (error) => {
        toast.error('Failed to delete project: ' + error.message)
      }
    })
  }

  const handleSearch = (value: string) => {
    setProjectTable({ search: value, page: 1 })
  }

  const handleSort = (sortBy: typeof projectTable.sortBy) => {
    const sortOrder = projectTable.sortBy === sortBy && projectTable.sortOrder === 'asc' ? 'desc' : 'asc'
    setProjectTable({ sortBy, sortOrder })
  }

  // Removed handleBack since no hierarchical navigation

  // Filter clients by selected location for client dropdown
  const filteredClientsForDropdown = React.useMemo(() => {
    if (!clients || locationFilter === 'all') return clients || []
    return clients.filter(client => client.location_id === locationFilter)
  }, [clients, locationFilter])

  // Filter projects based on search and filters
  const filteredProjects = React.useMemo(() => {
    if (!projects) return []
    
    let filtered = projects

    // Apply search filter
    if (projectTable.search) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(projectTable.search.toLowerCase())
      )
    }

    // Apply location filter
    if (locationFilter !== 'all') {
      filtered = filtered.filter(project => 
        project.client?.location_id === locationFilter
      )
    }

    // Apply client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(project => 
        project.client_id === clientFilter
      )
    }

    return filtered
  }, [projects, projectTable.search, locationFilter, clientFilter])

  // Sort projects
  const sortedProjects = React.useMemo(() => {
    if (!filteredProjects.length) return []
    
    return [...filteredProjects].sort((a, b) => {
      const aValue = a[projectTable.sortBy]
      const bValue = b[projectTable.sortBy]
      
      if (projectTable.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      }
      return aValue < bValue ? 1 : -1
    })
  }, [filteredProjects, projectTable.sortBy, projectTable.sortOrder])

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading projects: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div>
          <h2 className="text-2xl font-bold">All Projects</h2>
          <p className="text-muted-foreground">
            Manage all projects with their clients, locations, equipment & vehicles
          </p>
        </div>
        
        {/* Action Buttons Section - Mobile First */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={() => setProjectModal(true)}
            className="gap-2 flex-1 sm:flex-none font-semibold"
          >
            <Plus className="h-4 w-4" />
            Add Project
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setClientModal(true)}
            className="gap-2 flex-1 sm:flex-none font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Client
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setLocationModal(true)}
            className="gap-2 flex-1 sm:flex-none font-medium"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex gap-4 items-center flex-wrap">
        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={projectTable.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Location Filter */}
        <div className="min-w-[180px]">
          <Select value={locationFilter} onValueChange={(value) => {
            setLocationFilter(value)
            if (value !== 'all') {
              setClientFilter('all') // Reset client filter when location changes
            }
          }}>
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

        {/* Client Filter */}
        <div className="min-w-[180px]">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {(locationFilter === 'all' ? clients : filteredClientsForDropdown)?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                  {locationFilter === 'all' && client.location && (
                    <span className="text-muted-foreground ml-2">
                      ({client.location.address})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {(locationFilter !== 'all' || clientFilter !== 'all') && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setLocationFilter('all')
              setClientFilter('all')
            }}
          >
            Clear Filters
          </Button>
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
                Project Name
                {projectTable.sortBy === 'name' && (
                  <span className="ml-1">
                    {projectTable.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Vehicles</TableHead>
              <TableHead 
                className="cursor-pointer select-none"
                onClick={() => handleSort('created_at')}
              >
                Created
                {projectTable.sortBy === 'created_at' && (
                  <span className="ml-1">
                    {projectTable.sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading projects...
                </TableCell>
              </TableRow>
            ) : sortedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {projectTable.search ? 'No projects found' : 'No projects yet'}
                </TableCell>
              </TableRow>
            ) : (
              sortedProjects.map((project, index) => (
                <TableRow key={project.id || `project-${index}`}>
                  <TableCell className="font-medium">
                    {project.name}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{project.client?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{project.client?.location?.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {project.equipments?.length || 0} equipment
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {project.vehicles?.length || 0} vehicles
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.created_at ? (
                      (() => {
                        try {
                          const date = new Date(project.created_at)
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
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleEdit(project)
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
                            handleDelete(project)
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                      </div>
                      <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    </div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : sortedProjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              {projectTable.search ? 'No projects found' : 'No projects yet'}
            </CardContent>
          </Card>
        ) : (
          sortedProjects.map((project, index) => (
            <Card 
              key={project.id || `project-${index}`} 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{project.name}</h3>
                        <Badge 
                          variant="outline"
                          className="text-xs"
                        >
                          {project.equipments?.length || 0} equipment
                        </Badge>
                        <Badge 
                          variant="outline"
                          className="text-xs"
                        >
                          {project.vehicles?.length || 0} vehicles
                        </Badge>
                      </div>
                      {/* Action Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              handleEdit(project)
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
                              handleDelete(project)
                            }}
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-1">{project.client?.name}</p>
                    {project.client?.location?.address && (
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        📍 {project.client.location.address}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      <span>
                        {project.created_at ? (
                          (() => {
                            try {
                              const date = new Date(project.created_at)
                              return isNaN(date.getTime()) ? 'Just now' : formatDistanceToNow(date, { addSuffix: true })
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
      {projects && (
        <div className="text-sm text-muted-foreground">
          Showing {sortedProjects.length} of {projects.length} projects
          {(locationFilter !== 'all' || clientFilter !== 'all' || projectTable.search) && (
            <span className="ml-2">
              (filtered)
            </span>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project? This action cannot be undone and will remove all associated data."
        itemName={projectToDelete?.name}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmText="Delete Project"
      />
    </div>
  )
}
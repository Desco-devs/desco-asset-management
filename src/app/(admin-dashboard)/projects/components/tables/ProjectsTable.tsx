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
import { MoreHorizontal, Search, Plus, Edit, Trash2, Filter, Eye, X, ChevronLeft, ChevronRight, List } from "lucide-react"
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
  const isMobile = useProjectsStore(state => state.isMobile)
  const setIsMobile = useProjectsStore(state => state.setIsMobile)
  const getEffectiveProjectItemsPerPage = useProjectsStore(state => state.getEffectiveProjectItemsPerPage)
  
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

  // Mobile detection
  React.useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [setIsMobile])

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

  // Pagination logic
  const paginationData = React.useMemo(() => {
    const itemsPerPage = getEffectiveProjectItemsPerPage()
    const startIndex = (projectTable.page - 1) * itemsPerPage
    const paginatedProjects = sortedProjects.slice(startIndex, startIndex + itemsPerPage)
    const totalPages = Math.ceil(sortedProjects.length / itemsPerPage)
    
    return {
      paginatedProjects,
      totalPages,
      itemsPerPage,
      currentPage: projectTable.page
    }
  }, [sortedProjects, projectTable.page, getEffectiveProjectItemsPerPage])

  // Pagination handlers
  const handlePageChange = (newPage: number) => {
    setProjectTable({ page: newPage })
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error loading projects: {error.message}
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
            placeholder="Search projects by name, client, location..."
            value={projectTable.search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 h-11"
          />
        </div>

        {/* Filter and Sort Buttons */}
        <div className="flex gap-3">
          <Select
            value={(() => {
              if (locationFilter !== 'all') return `location-${locationFilter}`;
              if (clientFilter !== 'all') return `client-${clientFilter}`;
              return "";
            })()}
            onValueChange={(value) => {
              if (value === "clear-all") {
                setLocationFilter('all');
                setClientFilter('all');
              }
              // Location filters
              else if (value.startsWith("location-")) {
                const locationId = value.replace("location-", "");
                setLocationFilter(locationId);
                setClientFilter('all'); // Reset client filter
              }
              // Client filters
              else if (value.startsWith("client-")) {
                const clientId = value.replace("client-", "");
                setClientFilter(clientId);
                setLocationFilter('all'); // Reset location filter
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
                {(locationFilter !== 'all' || clientFilter !== 'all') && (
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

                {/* Client Filter */}
                <div className="mb-4">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Clients
                  </div>
                  <div className="space-y-1">
                    {(locationFilter === 'all' ? clients : filteredClientsForDropdown)?.map((client) => (
                      <SelectItem
                        key={client.id}
                        value={`client-${client.id}`}
                      >
                        {client.name}
                        {locationFilter === 'all' && client.location && (
                          <span className="text-muted-foreground ml-2">
                            ({client.location.address})
                          </span>
                        )}
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
              if (!projectTable.sortBy) return "clear-sort";
              
              if (projectTable.sortBy === "created_at") {
                return projectTable.sortOrder === "desc" ? "created_at" : "created_at_old";
              }
              if (projectTable.sortBy === "name") {
                return projectTable.sortOrder === "asc" ? "name" : "name_desc";
              }
              
              return projectTable.sortBy;
            })()}
            onValueChange={(value) => {
              if (value === "clear-sort") {
                handleSort('name'); // Reset to default
                return;
              }
              
              if (value === "created_at") {
                setProjectTable({ sortBy: "created_at", sortOrder: "desc" });
              } else if (value === "created_at_old") {
                setProjectTable({ sortBy: "created_at", sortOrder: "asc" });
              } else if (value === "name") {
                setProjectTable({ sortBy: "name", sortOrder: "asc" });
              } else if (value === "name_desc") {
                setProjectTable({ sortBy: "name", sortOrder: "desc" });
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
                <SelectItem value="name">Project A-Z</SelectItem>
                <SelectItem value="name_desc">Project Z-A</SelectItem>

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
        {(locationFilter !== 'all' || clientFilter !== 'all' || projectTable.search || projectTable.sortBy) && (
          <div className="flex flex-wrap gap-2">
            {/* Sort Badge */}
            {projectTable.sortBy && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Sort: {(() => {
                  if (projectTable.sortBy === "created_at")
                    return projectTable.sortOrder === "desc" ? "Newest Added" : "Oldest Added";
                  if (projectTable.sortBy === "name")
                    return projectTable.sortOrder === "asc" ? "Project A-Z" : "Project Z-A";
                  return projectTable.sortBy;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setProjectTable({ sortBy: "", sortOrder: "asc" })}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            )}
            {/* Search Badge */}
            {projectTable.search && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Search: "{projectTable.search}"
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

            {/* Client Filter Badge */}
            {clientFilter !== 'all' && (
              <Badge variant="secondary" className="gap-1 pr-1">
                Client: {clients?.find(c => c.id === clientFilter)?.name || clientFilter}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => setClientFilter('all')}
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
                setClientFilter('all');
                handleSearch('');
                setProjectTable({ sortBy: "", sortOrder: "asc" });
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
            ) : paginationData.paginatedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  {projectTable.search ? 'No projects found' : 'No projects yet'}
                </TableCell>
              </TableRow>
            ) : (
              paginationData.paginatedProjects.map((project, index) => (
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
        ) : paginationData.paginatedProjects.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              {projectTable.search ? 'No projects found' : 'No projects yet'}
            </CardContent>
          </Card>
        ) : (
          paginationData.paginatedProjects.map((project, index) => (
            <Card 
              key={project.id || `project-${index}`} 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
            >
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  {/* Header with title and actions */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base leading-tight">{project.name}</h3>
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

                  {/* Equipment and Vehicle badges */}
                  <div className="flex items-center gap-2 flex-wrap">
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
                  
                  {/* Client name */}
                  <p className="text-sm text-gray-600 font-medium">{project.client?.name}</p>
                  
                  {/* Location */}
                  {project.client?.location?.address && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      📍 {project.client.location.address}
                    </p>
                  )}
                  
                  {/* Created time */}
                  <div className="text-xs text-gray-400">
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
              of {sortedProjects.length} projects
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
      {projects && (
        <div className="text-sm text-muted-foreground">
          Showing {paginationData.paginatedProjects.length} of {sortedProjects.length} projects
          {sortedProjects.length < projects.length && (
            <span className="ml-2">
              (filtered from {projects.length} total)
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
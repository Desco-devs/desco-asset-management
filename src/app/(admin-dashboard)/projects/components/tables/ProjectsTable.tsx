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
import { useProjects, useDeleteProject, useClients } from '@/hooks/api/use-projects'
import { useProjectsStore, useProjectModal, useProjectTable } from '@/stores/projects-store'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import type { Project } from '@/types/projects'

export function ProjectsTable() {
  const selectedClientId = useProjectsStore(state => state.selectedClientId)
  const setCurrentView = useProjectsStore(state => state.setCurrentView)
  const setProjectTable = useProjectsStore(state => state.setProjectTable)
  
  const { data: clients } = useClients()
  const { data: projects, isLoading, error } = useProjects(selectedClientId || undefined)
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject()
  const setModal = useProjectsStore(state => state.setProjectModal)
  
  const projectTable = useProjectTable()

  const selectedClient = selectedClientId ? clients?.find(c => c.id === selectedClientId) : null

  const handleEdit = (project: Project) => {
    setModal(true, project.id)
  }

  const handleDelete = (project: Project) => {
    if (confirm(`Are you sure you want to delete "${project.name}"?`)) {
      deleteProject(project.id, {
        onSuccess: () => {
          toast.success('Project deleted successfully')
        },
        onError: (error) => {
          toast.error('Failed to delete project: ' + error.message)
        }
      })
    }
  }

  const handleSearch = (value: string) => {
    setProjectTable({ search: value, page: 1 })
  }

  const handleSort = (sortBy: typeof projectTable.sortBy) => {
    const sortOrder = projectTable.sortBy === sortBy && projectTable.sortOrder === 'asc' ? 'desc' : 'asc'
    setProjectTable({ sortBy, sortOrder })
  }

  const handleBack = () => {
    setCurrentView('clients')
  }

  // Filter projects based on search
  const filteredProjects = React.useMemo(() => {
    if (!projects) return []
    
    if (!projectTable.search) return projects
    
    return projects.filter(project =>
      project.name.toLowerCase().includes(projectTable.search.toLowerCase())
    )
  }, [projects, projectTable.search])

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
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              Projects
              {selectedClient && (
                <span className="text-lg font-normal text-muted-foreground ml-2">
                  for {selectedClient.name}
                </span>
              )}
            </h2>
            <p className="text-muted-foreground">
              Manage projects and their associated equipment & vehicles
            </p>
          </div>
        </div>
        <Button 
          onClick={() => setModal(true)}
          disabled={!selectedClientId}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      {/* Client context */}
      {selectedClient && (
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="text-sm">
            <span className="font-medium">Client:</span> {selectedClient.name}
            {selectedClient.location && (
              <>
                {' • '}
                <span className="font-medium">Location:</span> {selectedClient.location.address}
              </>
            )}
          </div>
        </div>
      )}

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

      {/* Table */}
      <div className="border rounded-lg">
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
                <TableCell colSpan={5} className="text-center py-8">
                  Loading projects...
                </TableCell>
              </TableRow>
            ) : !selectedClientId ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Please select a client to view projects
                </TableCell>
              </TableRow>
            ) : sortedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {projectTable.search ? 'No projects found' : 'No projects yet'}
                </TableCell>
              </TableRow>
            ) : (
              sortedProjects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">
                    {project.name}
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
                    {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(project)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDelete(project)}
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
      {projects && (
        <div className="text-sm text-muted-foreground">
          Showing {sortedProjects.length} of {projects.length} projects
        </div>
      )}
    </div>
  )
}
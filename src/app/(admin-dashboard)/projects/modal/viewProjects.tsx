// app/components/ProjectsModal.tsx
"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Calendar, RefreshCw } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"

import { Project } from "@/app/service/types"
import {
  fetchProjectsByClient,
  createProject,
  deleteProject,
  updateProject,
} from "@/app/service/client/project"
import AlertModal from "@/app/components/custom-reusable/modal/AlertModal"
import EquipmentModal from "./tools/viewEquipments"
import VehiclesModal from "./tools/viewVehicle"

interface ProjectsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  clientName: string
  onProjectsChange?: () => void
}

export default function ProjectsModal({
  isOpen,
  onOpenChange,
  clientId,
  clientName,
  onProjectsChange,
}: ProjectsModalProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  // edit/update/delete state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toDelete, setToDelete] = useState<Project | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // equipment/vehicle modal state
  const [equipmentOpen, setEquipmentOpen] = useState(false)
  const [vehiclesOpen, setVehiclesOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  // 1) reloadProjects function
  async function reloadProjects() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProjectsByClient(clientId)
      setProjects(data)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    reloadProjects()
  }, [isOpen, clientId])

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error("Project name is required.")
      return
    }
    setCreating(true)
    try {
      const project = await createProject(newName.trim(), clientId)
      setProjects(prev => [project, ...prev])
      setNewName("")
      toast.success("Project created.")
      onProjectsChange?.()
    } catch (err: any) {
      toast.error(err.message || "Failed to create project.")
    } finally {
      setCreating(false)
    }
  }

  function startEditing(p: Project) {
    setEditingId(p.uid)
    setEditingName(p.name)
  }
  function cancelEditing() {
    setEditingId(null)
    setEditingName("")
  }

  async function handleUpdate(uid: string) {
    if (!editingName.trim()) {
      toast.error("Project name is required.")
      return
    }
    setUpdatingId(uid)
    const old = projects.find(p => p.uid === uid)
    try {
      const updated = await updateProject(uid, { name: editingName.trim() })
      setProjects(prev =>
        prev.map(p =>
          p.uid === uid
            ? {
                ...updated,
                equipments: old?.equipments ?? [],
                vehicles:  old?.vehicles  ?? [],
              }
            : p
        )
      )
      toast.success("Project updated.")
      onProjectsChange?.()
      cancelEditing()
    } catch (err: any) {
      toast.error(err.message || "Failed to update project.")
    } finally {
      setUpdatingId(null)
    }
  }

  function confirmDelete(p: Project) {
    setToDelete(p)
    setConfirmOpen(true)
  }
  async function onConfirmDelete() {
    if (!toDelete) return
    setDeletingId(toDelete.uid)
    try {
      await deleteProject(toDelete.uid)
      setProjects(prev => prev.filter(p => p.uid !== toDelete.uid))
      toast.success("Project deleted.")
      onProjectsChange?.()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project.")
    } finally {
      setDeletingId(null)
      setToDelete(null)
    }
  }

  function openEquipment(p: Project) {
    setSelectedProject(p)
    setEquipmentOpen(true)
  }
  function openVehicles(p: Project) {
    setSelectedProject(p)
    setVehiclesOpen(true)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Projects for {clientName}</DialogTitle>
            {!loading && !error && (
              <DialogDescription>
                Overall Projects: {projects.length}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Create form */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="New project name"
              className="flex-1 border p-2 rounded"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              disabled={creating}
            />
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Creating…" : "Create"}
            </Button>
          </div>

          {loading && <p>Loading…</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && projects.length === 0 && (
            <p>No projects found for this client.</p>
          )}

          {/* List / edit */}
          {!loading && !error && projects.length > 0 && (
            <div>
              <h1 className="font-bold mb-2">PROJECTS:</h1>
              {projects.map(p => (
                <div key={p.uid} className="py-2 border-b last:border-b-0">
                  {editingId === p.uid ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        className="flex-1 border p-2 rounded"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        disabled={updatingId === p.uid}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdate(p.uid)}
                        disabled={updatingId === p.uid}
                      >
                        {updatingId === p.uid ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        disabled={updatingId === p.uid}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1 flex flex-col">
                        <span className="font-medium">{p.name}</span>
                        <div className="flex text-xs text-gray-500 space-x-4 mt-1">
                          <div className="flex items-start space-x-1">
                            <Calendar className="w-3 h-3 mt-[2px]" />
                            <div className="flex flex-col">
                              <span>
                                {new Date(p.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day:   "numeric",
                                  year:  "numeric",
                                })}
                              </span>
                              <span className="mt-0.5">
                                {new Date(p.createdAt).toLocaleTimeString(undefined, {
                                  hour:   "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start space-x-1">
                            <RefreshCw className="w-3 h-3 mt-[2px]" />
                            <div className="flex flex-col">
                              <span>
                                {new Date(p.updatedAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day:   "numeric",
                                  year:  "numeric",
                                })}
                              </span>
                              <span className="mt-0.5">
                                {new Date(p.updatedAt).toLocaleTimeString(undefined, {
                                  hour:   "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEditing(p)}>
                          Edit
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">View</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => openEquipment(p)}>
                              Equipments{" "}
                              <span className="ml-auto font-semibold">
                                {p.equipments?.length ?? 0}
                              </span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openVehicles(p)}>
                              Vehicles{" "}
                              <span className="ml-auto font-semibold">
                                {p.vehicles?.length ?? 0}
                              </span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmDelete(p)}
                          disabled={deletingId === p.uid}
                        >
                          {deletingId === p.uid ? "Deleting…" : "Delete"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <EquipmentModal
        isOpen={equipmentOpen}
        onOpenChange={setEquipmentOpen}
        projectId={selectedProject?.uid ?? ""}
        projectName={selectedProject?.name ?? ""}
        onEquipmentsChange={reloadProjects}
      />

      <VehiclesModal
        isOpen={vehiclesOpen}
        onOpenChange={setVehiclesOpen}
        projectId={selectedProject?.uid ?? ""}
        projectName={selectedProject?.name ?? ""}
      />

      <AlertModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Project"
        description={`Are you sure you want to delete "${toDelete?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={onConfirmDelete}
      />
    </>
  )
}

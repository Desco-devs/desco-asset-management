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

import { Client } from "@/app/service/types"
import {
  fetchClients,
  createClient,
  updateClient,
  deleteClient,
} from "@/app/service/client/clientService"
import AlertModal from "@/app/components/custom-reuseable/modal/alertModal"
import ProjectsModal from "./viewProjects"

interface ViewClientsModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  locationId: string | null
  locationAddress?: string | null
}

export default function ViewClientsModal({
  isOpen,
  onOpenChange,
  locationId,
  locationAddress,
}: ViewClientsModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState("")
  const [creating, setCreating] = useState(false)

  const [editingUid, setEditingUid] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [savingUid, setSavingUid] = useState<string | null>(null) // ← loader state

  const [alertOpen, setAlertOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null)

  const [projectsOpen, setProjectsOpen] = useState(false)
  const [clientForProjects, setClientForProjects] = useState<Client | null>(null)

  async function refreshClients() {
    try {
      const data = await fetchClients()
      setClients(
        locationId ? data.filter(c => c.locationId === locationId) : data
      )
    } catch (err: any) {
      toast.error(err.message || "Failed to refresh clients")
    }
  }

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    fetchClients()
      .then(data => {
        setClients(
          locationId ? data.filter(c => c.locationId === locationId) : data
        )
      })
      .catch(err => {
        setError(err.message)
        toast.error(err.message || "Failed to load clients")
      })
      .finally(() => setLoading(false))
  }, [isOpen, locationId])

  async function handleCreate() {
    if (!newName.trim() || !locationId) {
      toast.error("Client name and location are required.")
      return
    }
    setCreating(true)
    try {
      const client = await createClient(newName.trim(), locationId)
      setClients(prev => [client, ...prev])
      setNewName("")
      toast.success("Client added successfully.")
    } catch (err: any) {
      toast.error(err.message || "Failed to add client.")
    } finally {
      setCreating(false)
    }
  }

async function handleSaveEdit(uid: string) {
  if (!editName.trim() || !locationId) return
  setSavingUid(uid)

  // capture the old projects
  const old = clients.find(c => c.uid === uid)

  try {
    const updated = await updateClient(uid, editName.trim(), locationId)
    setClients(prev =>
      prev.map(c =>
        c.uid === uid
          ? {
              ...updated,
              projects: old?.projects || [],  // ← re-attach the previous projects so when editing the client, the projects are not lost
            }
          : c
      )
    )
    setEditingUid(null)
    setEditName("")
    toast.success("Client updated successfully.")
  } catch (err: any) {
    toast.error(err.message || "Failed to update client.")
  } finally {
    setSavingUid(null)
  }
}


  function confirmDelete(client: Client) {
    setClientToDelete(client)
    setAlertOpen(true)
  }

  async function handleDelete() {
    if (!clientToDelete) return
    try {
      await deleteClient(clientToDelete.uid)
      setClients(prev => prev.filter(c => c.uid !== clientToDelete.uid))
      toast.success("Client deleted successfully.")
    } catch (err: any) {
      toast.error(err.message || "Failed to delete client.")
    }
  }

  function openProjects(client: Client) {
    setClientForProjects(client)
    setProjectsOpen(true)
  }

  function closeProjects(open: boolean) {
    setProjectsOpen(open)
    if (!open) setClientForProjects(null)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clients for location: {locationAddress || "—"}</DialogTitle>
            {!loading && !error && (
              <DialogDescription>
                Overall Clients: {clients?.length ?? "0"}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* New client input */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Client name"
              className="flex-1 border p-2 rounded"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              disabled={creating}
            />
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Adding…" : "Add Client"}
            </Button>
          </div>

          {!loading && !error && clients.length > 0 && (
            <h1 className="font-bold mb-2">CLIENTS:</h1>
          )}

          {/* Clients list */}
          <div className="py-2">
            {loading && <p>Loading…</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!loading && !error && clients.length === 0 && (
              <p>No clients for this location.</p>
            )}

            {!loading && !error &&
              clients.map(c => (
                <div
                  key={c.uid}
                  className="py-2 border-b last:border-b-0 flex items-start justify-between"
                >
                  {editingUid === c.uid ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        className="flex-1 border p-1 rounded"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(c.uid)}
                        disabled={savingUid === c.uid}
                      >
                        {savingUid === c.uid ? "Saving…" : "Save"}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setEditingUid(null)}
                        disabled={savingUid === c.uid}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex flex-col">
                        <span className="font-medium">{c.name}</span>
                        <div className="flex text-xs text-gray-500 space-x-4 mt-1">
                          <div className="flex items-start space-x-1">
                            <Calendar className="w-3 h-3 mt-[2px]" />
                            <div className="flex flex-col">
                              <span>
                                {new Date(c.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="mt-0.5">
                                {new Date(c.createdAt).toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-start space-x-1">
                            <RefreshCw className="w-3 h-3 mt-[2px]" />
                            <div className="flex flex-col">
                              <span>
                                {new Date(c.updatedAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="mt-0.5">
                                {new Date(c.updatedAt).toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openProjects(c)}
                        >
                          Projects{" "}
                          <span className="ml-1 font-semibold">
                            {c.projects?.length ?? "0"}
                          </span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUid(c.uid)
                            setEditName(c.name)
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => confirmDelete(c)}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ProjectsModal
        isOpen={projectsOpen}
        onOpenChange={closeProjects}
        clientId={clientForProjects?.uid ?? ""}
        clientName={clientForProjects?.name ?? ""}
        onProjectsChange={refreshClients}
      />

      <AlertModal
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete Client"
        description={`Are you sure you want to delete "${clientToDelete?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
      />
    </>
  )
}

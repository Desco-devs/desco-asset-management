// /viewEquipments.tsx
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
import { Calendar, RefreshCw, Trash2 } from "lucide-react"

import { Equipment } from "@/app/service/types"

import AddEquipmentModal from "./modal/addEquipment"
import { deleteEquipment } from "@/app/service/equipments/equipment"
import AlertModal from "@/app/components/custom-reuseable/modal/alertModal"


interface EquipmentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
  onEquipmentsChange?: () => void
}

export default function EquipmentModal({
  isOpen,
  onOpenChange,
  projectId,
  projectName,
  onEquipmentsChange,
}: EquipmentModalProps) {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // AlertModal state
  const [alertOpen, setAlertOpen] = useState(false)
  const [toDeleteUid, setToDeleteUid] = useState<string | null>(null)

  const loadEquipments = () => {
    setLoading(true)
    setError(null)
    fetch(`/api/projects/${projectId}`)
      .then(res => res.json())
      .then(proj => setEquipments(proj.equipments ?? []))
      .catch(err => {
        console.error(err)
        setError("Failed to load equipments.")
        toast.error(err.message || "Failed to load equipments.")
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!isOpen) return
    loadEquipments()
  }, [isOpen, projectId])

  const handleDelete = async (uid: string) => {
    try {
      await deleteEquipment(uid)
      toast.success("Deleted successfully")
      loadEquipments()
      onEquipmentsChange?.()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || "Failed to delete equipment")
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Equipments for “{projectName}”</DialogTitle>
            {!loading && !error && (
              <DialogDescription>
                Overall Equipments: {equipments.length}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="mb-4 flex justify-end">
            <Button onClick={() => setAddOpen(true)}>+ Equipments</Button>
          </div>

          {loading && <p>Loading…</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && equipments.length === 0 && <p>No equipments found.</p>}

          {!loading && !error && equipments.length > 0 && (
            <ul className="space-y-2">
              {equipments.map(e => (
                <li
                  key={e.uid}
                  className="border p-2 rounded flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium">
                      {e.brand} {e.model}
                    </div>
                    <div className="flex text-xs text-gray-500 space-x-4 mt-1">
                      <div className="flex items-start space-x-1">
                        <Calendar className="w-3 h-3 mt-[2px]" />
                        <div>
                          {new Date(e.expirationDate).toLocaleDateString(undefined, {
                            month: "short",
                            day:   "numeric",
                            year:  "numeric",
                          })}
                        </div>
                      </div>
                      <div className="flex items-start space-x-1">
                        <RefreshCw className="w-3 h-3 mt-[2px]" />
                        <span>{e.status}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => {
                      setToDeleteUid(e.uid)
                      setAlertOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddEquipmentModal
        isOpen={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onCreated={() => {
          loadEquipments()
          onEquipmentsChange?.()
        }}
      />

      <AlertModal
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete Equipment"
        description="Are you sure you want to delete this equipment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          if (toDeleteUid) {
            handleDelete(toDeleteUid)
            setToDeleteUid(null)
          }
        }}
      />
    </>
  )
}

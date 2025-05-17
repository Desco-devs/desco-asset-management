// app/components/viewEquipments.tsx
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

import { Equipment } from "@/app/service/types"

interface EquipmentModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
}

export default function EquipmentModal({
  isOpen,
  onOpenChange,
  projectId,
  projectName,
}: EquipmentModalProps) {
  const [equipments, setEquipments] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((proj) => setEquipments(proj.equipments ?? []))
      .catch((err) => {
        console.error(err)
        setError("Failed to load equipments.")
        toast.error(err.message || "Failed to load equipments.")
      })
      .finally(() => setLoading(false))
  }, [isOpen, projectId])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Equipments for “{projectName}”</DialogTitle>
          {!loading && !error && (
            <DialogDescription>
              Overall Equipments: {equipments?.length ?? "0"}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && equipments.length === 0 && <p>No equipments found.</p>}

        {!loading && !error && equipments.length > 0 && (
          <ul className="space-y-2">
            {equipments.map((e) => (
              <li key={e.uid} className="border p-2 rounded">
                <div className="font-medium">
                  {e.brand} {e.model}
                </div>
                <div className="flex text-xs text-gray-500 space-x-4 mt-1">
                  <div className="flex items-start space-x-1">
                    <Calendar className="w-3 h-3 mt-[2px]" />
                    <div className="flex flex-col">
                      <span>
                        {new Date(e.expirationDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-1">
                    <RefreshCw className="w-3 h-3 mt-[2px]" />
                    <div className="flex flex-col">
                      <span>{e.status}</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

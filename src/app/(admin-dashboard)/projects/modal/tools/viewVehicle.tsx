// app/components/viewVehicles.tsx
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
import { Calendar, Truck } from "lucide-react"

import { Vehicle } from "@/app/service/types"

interface VehiclesModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  projectName: string
}

export default function VehiclesModal({
  isOpen,
  onOpenChange,
  projectId,
  projectName,
}: VehiclesModalProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setLoading(true)
    setError(null)
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((proj) => setVehicles(proj.vehicles ?? []))
      .catch((err) => {
        console.error(err)
        setError("Failed to load vehicles.")
        toast.error(err.message || "Failed to load vehicles.")
      })
      .finally(() => setLoading(false))
  }, [isOpen, projectId])

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vehicles for “{projectName}”</DialogTitle>
          {!loading && !error && (
            <DialogDescription>
              Overall Equipments: {vehicles?.length ?? "0"}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && <p>Loading…</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && vehicles.length === 0 && <p>No vehicles found.</p>}

        {!loading && !error && vehicles.length > 0 && (
          <ul className="space-y-2">
            {vehicles.map((v) => (
              <li key={v.uid} className="border p-2 rounded">
                <div className="font-medium">
                  {v.brand} {v.model}
                </div>
                <div className="flex text-xs text-gray-500 space-x-4 mt-1">
                  <div className="flex items-start space-x-1">
                    <Calendar className="w-3 h-3 mt-[2px]" />
                    <div className="flex flex-col">
                      <span>
                        {new Date(v.inspectionDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="mt-0.5">
                        {new Date(v.expiryDate).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start space-x-1">
                    <Truck className="w-3 h-3 mt-[2px]" />
                    <div className="flex flex-col">
                      <span>{v.plateNumber}</span>
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

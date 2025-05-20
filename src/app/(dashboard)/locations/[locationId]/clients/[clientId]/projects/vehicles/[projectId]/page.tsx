"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

import AlertModal from "@/app/components/custom-reuseable/modal/alertModal"
import AddVehicleModal from "@/app/(dashboard)/projects/modal/tools/modal/addVehicle"
import EditVehicleModal from "@/app/(dashboard)/projects/modal/tools/modal/editVehicle"

import DataTable, { Column } from "@/app/components/custom-reuseable/table/ReusableTable"
import type { Vehicle } from "@/app/service/types"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"

import ViewVehicleModal from "@/app/(dashboard)/projects/modal/tools/modal/viewVehicle"
import { useAuth } from "@/app/context/AuthContext"

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { deleteVehicle, getVehiclesByProject } from "@/app/service/vehicles/vehicles"

function formatCountdown(ms: number) {
  if (ms <= 0) return "0d 0h 0m 0s"
  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / (3600 * 24))
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}d ${hours}h ${minutes}m ${seconds}s`
}

function getColorByDaysLeft(daysLeft: number, warningThreshold = 5) {
  if (daysLeft < 0) return "text-red-600"
  if (daysLeft <= warningThreshold) return "text-yellow-600"
  return "text-gray-700"
}

export default function VehiclesPage() {
  const { projectId: rawProjectId } = useParams()
  const projectId = Array.isArray(rawProjectId) ? rawProjectId[0] : rawProjectId ?? ""

  const { user } = useAuth()
  const canCreate = user?.permissions.includes("CREATE") ?? false
  const canUpdate = user?.permissions.includes("UPDATE") ?? false
  const canDelete = user?.permissions.includes("DELETE") ?? false
  const canView = user?.permissions.includes("VIEW") ?? false

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)

  const [alertOpen, setAlertOpen] = useState(false)
  const [toDeleteUid, setToDeleteUid] = useState<string | null>(null)

  const [viewDetailsOpen, setViewDetailsOpen] = useState(false)
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null)

  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function loadVehicles() {
    setLoading(true)
    try {
      if (!projectId) return
      const data = await getVehiclesByProject(projectId)
      setVehicles(data)
    } catch {
      toast.error("Failed to fetch vehicles.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVehicles()
  }, [projectId])

  async function handleDelete() {
    if (!toDeleteUid) return
    try {
      await deleteVehicle(toDeleteUid)
      toast.success("Vehicle deleted")
      setToDeleteUid(null)
      setAlertOpen(false)
      loadVehicles()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete vehicle")
    }
  }

  const columns: Column<Vehicle>[] = [
    {
      key: "brand",
      title: "Brand",
      render: (_value, vehicle) => <span>{vehicle.brand}</span>,
    },
    {
      key: "model",
      title: "Model",
      render: (_value, vehicle) => <span>{vehicle.model}</span>,
    },
    {
      key: "type",
      title: "Type",
      render: (_value, vehicle) => <span>{vehicle.type}</span>,
    },
    {
      key: "plateNumber",
      title: "Plate Number",
    },
    {
      key: "inspectionDate",
      title: "Inspection Date",
      render: (_value, vehicle) => {
        if (!vehicle.inspectionDate) return "-"
        const inspDate = new Date(vehicle.inspectionDate)
        const diffMs = inspDate.getTime() - now.getTime()
        const daysLeft = diffMs / (1000 * 60 * 60 * 24)
        const colorClass = getColorByDaysLeft(daysLeft, 5)
        const formattedDate = inspDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`${colorClass} font-semibold cursor-default`}>
                  {diffMs <= 0
                    ? `Overdue ${Math.abs(Math.floor(daysLeft))}d`
                    : formatCountdown(diffMs)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span>{formattedDate}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      sortable: true,
    },
    {
      key: "expiryDate",
      title: "Expiry Date",
      render: (_value, vehicle) => {
        if (!vehicle.expiryDate) return "-"
        const expDate = new Date(vehicle.expiryDate)
        const diffMs = expDate.getTime() - now.getTime()
        const daysLeft = diffMs / (1000 * 60 * 60 * 24)
        const colorClass = getColorByDaysLeft(daysLeft, 5)
        const formattedDate = expDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`${colorClass} font-semibold cursor-default`}>
                  {diffMs <= 0
                    ? `Expired ${Math.abs(Math.floor(daysLeft))}d ago`
                    : formatCountdown(diffMs)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <span>{formattedDate}</span>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )
      },
      sortable: true,
    },
    {
      key: "status",
      title: "Status",
    },
    {
      key: "owner",
      title: "Owner",
    },
    {
      key: "remarks",
      title: "Remarks",
      render: (value) => value ?? "-",
    },
    {
      key: "actions",
      title: "Actions",
      className: "text-center",
      render: (_value, vehicle) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {canView && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setViewingVehicle(vehicle)
                  setViewDetailsOpen(true)
                }}
              >
                View details
              </DropdownMenuItem>
            )}

            {canUpdate && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setEditingVehicle(vehicle)
                  setEditOpen(true)
                }}
              >
                Edit
              </DropdownMenuItem>
            )}

            {canDelete && (
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => {
                  setToDeleteUid(vehicle.uid)
                  setAlertOpen(true)
                }}
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="py-4">
      <DataTable<Vehicle>
        data={vehicles}
        columns={columns}
        loading={loading}
        pagination
        searchable
        sortable
        onRefresh={loadVehicles}
        actions={canCreate ? <Button onClick={() => setAddOpen(true)}>Add Vehicle</Button> : null}
      />

      {canCreate && (
        <AddVehicleModal
          isOpen={addOpen}
          onOpenChange={setAddOpen}
          projectId={projectId}
          onCreated={() => {
            loadVehicles()
            setAddOpen(false)
          }}
        />
      )}

      {editingVehicle && canUpdate && (
        <EditVehicleModal
          isOpen={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open)
            if (!open) setEditingVehicle(null)
          }}
          vehicle={editingVehicle}
          onUpdated={() => {
            loadVehicles()
            setEditOpen(false)
          }}
        />
      )}

      <ViewVehicleModal
        isOpen={viewDetailsOpen && canView}
        onOpenChange={setViewDetailsOpen}
        vehicle={viewingVehicle}
      />

      <AlertModal
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete Vehicle"
        description="Are you sure you want to delete this vehicle? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
      />
    </div>
  )
}

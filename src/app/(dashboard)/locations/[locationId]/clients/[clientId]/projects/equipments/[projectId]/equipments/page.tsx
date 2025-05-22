"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getEquipmentsByProject } from "@/app/service/client/dynamicClients";
import { deleteEquipment } from "@/app/service/equipments/equipment";

import AlertModal from "@/app/components/custom-reuseable/modal/alertModal";
import AddEquipmentModal from "@/app/(dashboard)/projects/modal/tools/modal/addEquipment";
import EditEquipmentModal from "@/app/(dashboard)/projects/modal/tools/modal/editEquipment";

import DataTable, {
  Column,
} from "@/app/components/custom-reuseable/table/ReusableTable";
import type { Equipment } from "@/app/service/types";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import ViewDetailsModal from "@/app/(dashboard)/projects/modal/tools/modal/viewEquipment";

import { useAuth } from "@/app/context/AuthContext";
import { color } from "@/lib/color";

function formatCountdown(ms: number) {
  if (ms <= 0) return "0d 0h 0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (3600 * 24));
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  // const seconds = totalSeconds % 60;
  return `${days}d ${hours}h ${minutes}m `;
}

function getColorByDaysLeft(daysLeft: number, warningThreshold = 5) {
  if (daysLeft < 0) return "text-red-600";
  if (daysLeft <= warningThreshold) return "text-yellow-600";
  return "text-green-600";
}

export default function EquipmentsPage() {
  const { projectId: rawProjectId } = useParams();
  const projectId = Array.isArray(rawProjectId)
    ? rawProjectId[0]
    : rawProjectId ?? "";

  const { user } = useAuth();
  const [projectName, setProjectName] = useState<string | null>(null);

  const canCreate = user?.permissions.includes("CREATE") ?? false;
  const canUpdate = user?.permissions.includes("UPDATE") ?? false;
  const canDelete = user?.permissions.includes("DELETE") ?? false;
  const canView = user?.permissions.includes("VIEW") ?? false;

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  );

  const [alertOpen, setAlertOpen] = useState(false);
  const [toDeleteUid, setToDeleteUid] = useState<string | null>(null);

  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [viewingEquipment, setViewingEquipment] = useState<Equipment | null>(
    null
  );

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Get project name from URL search params
    const searchParams = new URLSearchParams(window.location.search);
    const name = searchParams.get("projectName");
    setProjectName(name ? decodeURIComponent(name) : null);
  }, []);

  async function loadEquipments() {
    setLoading(true);
    try {
      if (!projectId) return;
      const data = await getEquipmentsByProject(projectId);
      setEquipments(data);
    } catch {
      toast.error("Failed to fetch equipments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEquipments();
  }, [projectId]);

  async function handleDelete() {
    if (!toDeleteUid) return;
    try {
      await deleteEquipment(toDeleteUid);
      toast.success("Equipment deleted");
      setToDeleteUid(null);
      setAlertOpen(false);
      loadEquipments();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete equipment");
    }
  }

  const columns: Column<Equipment>[] = [
    {
      key: "id",
      title: "ID",
      sortable: false,
      render: (_value, equipment, index) => (
        <span className="font-semibold">{(index || 0) + 1}</span>
      ),
    },
    {
      key: "brand",
      title: "Brand",
      render: (_value, equipment) => <span>{equipment.brand}</span>,
    },
    {
      key: "model",
      title: "Model",
      render: (_value, equipment) => (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-pointer underline">{equipment.model}</span>
          </TooltipTrigger>
          {equipment.image_url ? (
            <TooltipContent className="p-0">
              <img
                src={equipment.image_url}
                alt={`${equipment.model} image`}
                className="max-w-xs max-h-48 rounded-md"
                draggable={false}
              />
            </TooltipContent>
          ) : (
            <TooltipContent>No image available</TooltipContent>
          )}
        </Tooltip>
      ),
    },
    {
      key: "type",
      title: "Type",
      render: (_value, equipment) => <span>{equipment.type}</span>,
    },
    {
      key: "expirationDate",
      title: "Expiration",
      render: (_value, equipment) => {
        if (!equipment.expirationDate) return "-";
        const expDate = new Date(equipment.expirationDate);
        const diffMs = expDate.getTime() - now.getTime();
        const daysLeft = diffMs / (1000 * 60 * 60 * 24);
        const colorClass = getColorByDaysLeft(daysLeft, 5);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`${colorClass} font-semibold cursor-default`}>
                {diffMs <= 0
                  ? `Expired ${Math.abs(Math.floor(daysLeft))}d ago`
                  : formatCountdown(diffMs)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {expDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TooltipContent>
          </Tooltip>
        );
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
      key: "inspectionDate",
      title: "Inspection Date",
      render: (_value, equipment) => {
        if (!equipment.inspectionDate) return "-";
        const inspDate = new Date(equipment.inspectionDate);
        const diffMs = inspDate.getTime() - now.getTime();
        const daysLeft = diffMs / (1000 * 60 * 60 * 24);
        const colorClass = getColorByDaysLeft(daysLeft, 5);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={`${colorClass} font-semibold cursor-default`}>
                {diffMs <= 0
                  ? `Overdue ${Math.abs(Math.floor(daysLeft))}d`
                  : formatCountdown(diffMs)}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {inspDate.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </TooltipContent>
          </Tooltip>
        );
      },
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
      sortable: false,
      render: (_value, equipment) => (
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
                  setViewingEquipment(equipment);
                  setViewDetailsOpen(true);
                }}
              >
                View details
              </DropdownMenuItem>
            )}

            {canUpdate && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setEditingEquipment(equipment);
                  setEditOpen(true);
                }}
              >
                Edit
              </DropdownMenuItem>
            )}

            {canDelete && (
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={() => {
                  setToDeleteUid(equipment.uid);
                  setAlertOpen(true);
                }}
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="py-4">
      <DataTable<Equipment>
        data={equipments}
        columns={columns}
        loading={loading}
        badgeText={`All Equipments from ${projectName ?? "Equipments"}`}
        pagination
        searchable
        sortable
        onRefresh={loadEquipments}
        actions={
          canCreate ? (
            <Button
              onClick={() => setAddOpen(true)}
              className={`${color} w-fit text-sm bg-chart-1 `}
            >
              Add Equipment
            </Button>
          ) : null
        }
      />

      {canCreate && (
        <AddEquipmentModal
          isOpen={addOpen}
          onOpenChange={setAddOpen}
          projectId={projectId}
          onCreated={() => {
            loadEquipments();
            setAddOpen(false);
          }}
        />
      )}

      {editingEquipment && canUpdate && (
        <EditEquipmentModal
          isOpen={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingEquipment(null);
          }}
          equipment={editingEquipment}
          onUpdated={() => {
            loadEquipments();
            setEditOpen(false);
          }}
        />
      )}

      <ViewDetailsModal
        isOpen={viewDetailsOpen && canView}
        onOpenChange={setViewDetailsOpen}
        equipment={viewingEquipment}
      />

      <AlertModal
        isOpen={alertOpen}
        onOpenChange={setAlertOpen}
        title="Delete Equipment"
        description="Are you sure you want to delete this equipment? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
      />
    </div>
  );
}

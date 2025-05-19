"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getEquipmentsByProject } from "@/app/service/client/dynamicClients";
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

export default function EquipmentsPage() {
  const { projectId: rawProjectId } = useParams();
  const projectId = Array.isArray(rawProjectId)
    ? rawProjectId[0]
    : rawProjectId ?? "";

  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  );

  const [alertOpen, setAlertOpen] = useState(false);
  const [toDeleteUid, setToDeleteUid] = useState<string | null>(null);

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
      const res = await fetch(`/api/equipments/${toDeleteUid}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("Equipment deleted");
      setToDeleteUid(null);
      setAlertOpen(false);
      loadEquipments();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete equipment");
    }
  }

  // Columns definition for reusable DataTable
  const columns: Column<Equipment>[] = [
    { key: "brand", title: "Brand" },
    { key: "model", title: "Model" },
    { key: "type", title: "Type" },
    {
      key: "expirationDate",
      title: "Expiration",
      render: (value) => new Date(value).toLocaleDateString(),
      sortable: true,
    },
    { key: "status", title: "Status" },
    { key: "owner", title: "Owner" },
    {
      key: "inspectionDate",
      title: "Inspection Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : "-"),
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
            <DropdownMenuItem
              onClick={() => {
                setEditingEquipment(equipment);
                setEditOpen(true);
              }}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                setToDeleteUid(equipment.uid);
                setAlertOpen(true);
              }}
            >
              Delete
            </DropdownMenuItem>
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
        pagination
        searchable
        sortable
        onRefresh={loadEquipments}
        actions={
          <Button onClick={() => setAddOpen(true)}>Add Equipment</Button>
        }
      />

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        isOpen={addOpen}
        onOpenChange={setAddOpen}
        projectId={projectId}
        onCreated={() => {
          loadEquipments();
          setAddOpen(false);
        }}
      />

      {/* Edit Equipment Modal */}
      {editingEquipment && (
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

      {/* Delete confirmation modal */}
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

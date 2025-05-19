// File: app/(dashboard)/locations/[locationId]/clients/[clientId]/projects/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteProject, updateProject } from "@/app/service/client/project";
import { getProjectsByClient } from "@/app/service/client/dynamicClients";
import DataTable, { Column } from "@/app/components/custom-reuseable/table/ReusableTable";
import CreateProjectModal from "@/app/(dashboard)/projects/modal/addProjects";
import AlertModal from "@/app/components/custom-reuseable/modal/alertModal";
import { Project } from "@/app/service/types";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export default function ProjectsPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.locationId as string;
  const clientId = params.clientId as string;

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      if (!clientId) return;
      const data = await getProjectsByClient(clientId);
      setProjects(data);
    } catch {
      toast.error("Failed to fetch projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (clientId) loadProjects();
  }, [clientId]);

  async function handleUpdate(uid: string) {
    if (!editingName.trim()) {
      toast.error("Project name required");
      return;
    }
    setUpdatingId(uid);
    try {
      const updated = await updateProject(uid, { name: editingName.trim() });
      setProjects((prev) =>
        prev.map((p) => (p.uid === uid ? { ...p, name: updated.name } : p))
      );
      toast.success("Updated successfully");
      setEditingId(null);
      setEditingName("");
    } catch {
      toast.error("Failed to update");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await deleteProject(deleteId);
      setProjects((prev) => prev.filter((p) => p.uid !== deleteId));
      toast.success("Deleted successfully");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setConfirmOpen(false);
      setDeleteId(null);
    }
  }

  const columns: Column<Project>[] = [
    {
      key: "name",
      title: "Project Name",
      render: (_value, project) =>
        editingId === project.uid ? (
          <input
            type="text"
            className="w-full border rounded px-2 py-1"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            disabled={updatingId === project.uid}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleUpdate(project.uid);
              if (e.key === "Escape") {
                setEditingId(null);
                setEditingName("");
              }
            }}
            autoFocus
          />
        ) : (
          project.name
        ),
    },
    {
      key: "createdAt",
      title: "Created",
      render: (value) => new Date(value).toLocaleString(),
      sortable: true,
    },
    {
      key: "actions",
      title: "Actions",
      className: "text-right",
      render: (_value, project) => {
        if (editingId === project.uid) {
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={updatingId === project.uid}
                onClick={() => {
                  setEditingId(null);
                  setEditingName("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleUpdate(project.uid)}
                disabled={updatingId === project.uid}
              >
                {updatingId === project.uid ? "Saving..." : "Save"}
              </Button>
            </div>
          );
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/locations/${locationId}/clients/${clientId}/projects/equipments/${project.uid}/equipments`
                  )
                }
              >
                Equipments {project.equipments?.length ?? "0"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  router.push(
                    `/locations/${locationId}/clients/${clientId}/projects/vehicles/${project.uid}`
                  )
                }
              >
                Vehicles {project.vehicles?.length ?? "0"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditingId(project.uid);
                  setEditingName(project.name);
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => {
                  setDeleteId(project.uid);
                  setConfirmOpen(true);
                }}
              >
                Delete
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setCreateModalOpen(true);
                }}
              >
                New Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="py-4">
      <DataTable<Project>
        data={projects}
        columns={columns}
        loading={loading}
        pagination
        searchable
        sortable
        onRefresh={loadProjects}
        refreshing={false}
        actions={<Button onClick={() => setCreateModalOpen(true)}>New Project</Button>}
      />

      <CreateProjectModal
        isOpen={createModalOpen}
        onOpenChange={setCreateModalOpen}
        clientId={clientId}
        onCreated={loadProjects}
      />

      <AlertModal
        isOpen={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete Project"
        description="Are you sure you want to delete this project?"
        onConfirm={handleDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}

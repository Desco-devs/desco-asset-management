"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getClientsByLocation } from "@/app/service/client/dynamicClients";
import { toast } from "sonner";
import {
  createClient,
  updateClient,
  deleteClient,
} from "@/app/service/client/clientService";
import DataTable, {
  Column,
} from "@/app/components/custom-reusable/table/ReusableTable";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

import AlertModal from "@/app/components/custom-reusable/modal/AlertModal";
import ProjectsModal from "@/app/(dashboard)/projects/modal/viewProjects";
import { useAuth } from "@/app/context/AuthContext";
import { AddClientModal } from "@/app/(dashboard)/projects/modal/addClient";
import { color } from "@/lib/color";

interface Client {
  uid: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  projects?: any[];
}

export default function ClientsPage() {
  const { locationId } = useParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [locationName, setLocationName] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [creating, setCreating] = useState(false);

  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [savingUid, setSavingUid] = useState<string | null>(null);

  const [alertOpen, setAlertOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const [projectsOpen, setProjectsOpen] = useState(false);
  const [clientForProjects, setClientForProjects] = useState<Client | null>(
    null
  );

  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal open state
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    if (!locationId) return;
    setLoadingData(true);
    getClientsByLocation(locationId as string)
      .then(setClients)
      .catch(() => toast.error("Failed to fetch clients"))
      .finally(() => setLoadingData(false));
  }, [locationId]);

  useEffect(() => {
    // Get location name from URL search params
    const searchParams = new URLSearchParams(window.location.search);
    const name = searchParams.get("locationName");
    setLocationName(name ? decodeURIComponent(name) : null);
  }, []);

  // Permissions checks
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const canUpdate = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';
  const canDelete = user?.role === 'SUPERADMIN';
  const canView = user?.role === 'VIEWER' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  async function handleSaveEdit(uid: string) {
    if (!editName.trim() || !locationId) return;
    setSavingUid(uid);
    try {
      const updated = await updateClient(
        uid,
        editName.trim(),
        locationId as string
      );
      setClients((prev) =>
        prev.map((c) =>
          c.uid === uid ? { ...updated, projects: c.projects } : c
        )
      );
      setEditingUid(null);
      setEditName("");
      toast.success("Client updated successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to update client.");
    } finally {
      setSavingUid(null);
    }
  }

  function confirmDelete(client: Client) {
    setClientToDelete(client);
    setAlertOpen(true);
  }

  async function handleDelete() {
    if (!clientToDelete) return;
    try {
      await deleteClient(clientToDelete.uid);
      setClients((prev) => prev.filter((c) => c.uid !== clientToDelete.uid));
      toast.success("Client deleted successfully.");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete client.");
    } finally {
      setAlertOpen(false);
      setClientToDelete(null);
    }
  }

  function openProjects(client: Client) {
    setClientForProjects(client);
    setProjectsOpen(true);
  }

  function closeProjects(open: boolean) {
    setProjectsOpen(open);
    if (!open) setClientForProjects(null);
  }

  const columns: Column<Client>[] = [
    {
      key: "id",
      title: "ID",
      sortable: false,
      render: (_value, client, index) => (
        <span className="font-semibold">{(index || 0) + 1}</span>
      ),
    },
    {
      key: "name",
      title: "Client Name",
      render: (_value, client) =>
        editingUid === client.uid ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full border rounded px-2 py-1"
            disabled={savingUid === client.uid}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit(client.uid);
              if (e.key === "Escape") {
                setEditingUid(null);
                setEditName("");
              }
            }}
            autoFocus
          />
        ) : (
          client.name
        ),
    },
    {
      key: "actions",
      title: "Actions",
      className: "text-right",
      sortable: false,
      render: (_value, client) => {
        if (editingUid === client.uid) {
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={savingUid === client.uid}
                onClick={() => {
                  setEditingUid(null);
                  setEditName("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveEdit(client.uid)}
                disabled={savingUid === client.uid}
              >
                {savingUid === client.uid ? "Saving..." : "Save"}
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
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {canView && (
                <DropdownMenuItem
                  onClick={() =>
                    router.push(
                      `/locations/${locationId}/clients/${
                        client.uid
                      }/projects?clientName=${encodeURIComponent(client.name)}`
                    )
                  }
                >
                  View Projects
                </DropdownMenuItem>
              )}

              {canUpdate && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditingUid(client.uid);
                    setEditName(client.name);
                  }}
                >
                  Edit
                </DropdownMenuItem>
              )}

              {canDelete && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => confirmDelete(client)}
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <div className="py-4">
        <DataTable<Client>
          data={clients}
          columns={columns}
          loading={loadingData}
          refreshing={refreshing}
          badgeText={`All clients from ${locationName ?? ""}`}
          searchable
          sortable
          pagination
          onRefresh={async () => {
            setRefreshing(true);
            try {
              const freshClients = await getClientsByLocation(
                locationId as string
              );
              setClients(freshClients);
            } catch {
              toast.error("Failed to refresh clients.");
            } finally {
              setRefreshing(false);
            }
          }}
          actions={
            canCreate ? (
              <Button
                onClick={() => setAddModalOpen(true)}
                className={`${color} w-fit text-sm bg-chart-1 `}
              >
                Add Client
              </Button>
            ) : null
          }
        />
      </div>

      <AddClientModal
        locationId={locationId as string}
        isOpen={addModalOpen}
        onOpenChange={setAddModalOpen}
        onClientAdded={(client) =>
          setClients((prev) => [
            {
              ...client,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              projects: [],
            },
            ...prev,
          ])
        }
        creating={creating}
        createClient={createClient}
      />

      <ProjectsModal
        isOpen={projectsOpen}
        onOpenChange={closeProjects}
        clientId={clientForProjects?.uid ?? ""}
        clientName={clientForProjects?.name ?? ""}
        onProjectsChange={async () => {
          if (!locationId) return;
          const freshClients = await getClientsByLocation(locationId as string);
          setClients(freshClients);
        }}
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
  );
}

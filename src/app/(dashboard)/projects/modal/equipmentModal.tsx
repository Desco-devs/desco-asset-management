"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, RefreshCw, Trash2, Edit2 } from "lucide-react";
import { Equipment } from "@/app/service/types";

import { deleteEquipment } from "@/app/service/equipments/equipment";
import AlertModal from "@/app/components/custom-reuseable/modal/alertModal";

import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import AddEquipmentModal from "./tools/modal/addEquipment";
import EditEquipmentModal from "./tools/modal/editEquipment";

interface EquipmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  onEquipmentsChange?: () => void;
}

export default function EquipmentModal({
  isOpen,
  onOpenChange,
  projectId,
  projectName,
  onEquipmentsChange,
}: EquipmentModalProps) {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  );
  const [alertOpen, setAlertOpen] = useState(false);
  const [toDeleteUid, setToDeleteUid] = useState<string | null>(null);

  const today = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;

  // Load equipments for the current project
  const loadEquipments = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}`)
      .then((res) => res.json())
      .then((proj) => setEquipments(proj.equipments ?? []))
      .catch((err) => {
        console.error(err);
        setError("Failed to load equipments.");
        toast.error(err.message || "Failed to load equipments.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isOpen) return;
    loadEquipments();
  }, [isOpen, projectId]);

  // Handle delete equipment
  const handleDelete = async (uid: string) => {
    try {
      await deleteEquipment(uid);
      toast.success("Deleted successfully");
      loadEquipments();
      onEquipmentsChange?.();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to delete equipment");
    }
  };

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
          {!loading && !error && equipments.length === 0 && (
            <p>No equipments found.</p>
          )}

          {!loading && !error && equipments.length > 0 && (
            <ul className="space-y-2">
              {equipments.map((e) => {
                const expDate = new Date(e.expirationDate);
                const daysToExpiry = Math.ceil(
                  (expDate.getTime() - today.getTime()) / msPerDay
                );
                let expLabel: string;
                let expClass: string;
                if (daysToExpiry < 0) {
                  expLabel = `Expired ${Math.abs(daysToExpiry)}d ago`;
                  expClass = "text-red-500";
                } else if (daysToExpiry <= 10) {
                  expLabel = `${daysToExpiry}d left`;
                  expClass = "text-yellow-500";
                } else {
                  expLabel = `${daysToExpiry}d left`;
                  expClass = "text-gray-500";
                }

                const hasInspection = !!e.inspectionDate;
                const inspDate = hasInspection
                  ? new Date(e.inspectionDate!)
                  : null;
                let inspLabel = "";
                let inspClass = "text-gray-500";
                if (hasInspection && inspDate) {
                  const daysToInspect = Math.ceil(
                    (inspDate.getTime() - today.getTime()) / msPerDay
                  );
                  if (daysToInspect < 0) {
                    inspLabel = `Overdue ${Math.abs(daysToInspect)}d`;
                    inspClass = "text-red-500";
                  } else {
                    inspLabel = `${daysToInspect}d to inspect`;
                  }
                }

                return (
                  <li
                    key={e.uid}
                    className="border p-2 rounded flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {e.brand} {e.model}
                      </div>
                      <div className="flex text-xs space-x-4 mt-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-1 cursor-pointer hover:font-bold">
                              <span className="font-semibold">Expiration:</span>
                              <Calendar className="w-3 h-3" />
                              <span className={expClass}>{expLabel}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {expDate.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TooltipContent>
                        </Tooltip>

                        {hasInspection && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center space-x-1 cursor-pointer hover:font-bold">
                                <span className="font-semibold">
                                  Inspection:
                                </span>
                                <Calendar className="w-3 h-3" />
                                <span className={inspClass}>{inspLabel}</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {inspDate!.toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </TooltipContent>
                          </Tooltip>
                        )}

                        <div className="flex items-center space-x-1">
                          <RefreshCw className="w-3 h-3" />
                          <span>{e.status}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => {
                          setEditingEquipment(e);
                          setEditOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => {
                          setToDeleteUid(e.uid);
                          setAlertOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
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
          loadEquipments();
          onEquipmentsChange?.();
        }}
      />

      <EditEquipmentModal
        isOpen={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditingEquipment(null);
        }}
        equipment={editingEquipment!}
        onUpdated={() => {
          loadEquipments();
          onEquipmentsChange?.();
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
            handleDelete(toDeleteUid);
            setToDeleteUid(null);
          }
        }}
      />
    </>
  );
}

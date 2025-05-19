"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createVehicle } from "@/app/service/vehicles/vehicle";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface AddVehicleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onCreated: () => void;
}

export default function AddVehicleModal({
  isOpen,
  onOpenChange,
  projectId,
  onCreated,
}: AddVehicleModalProps) {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [owner, setOwner] = useState("");
  const [saving, setSaving] = useState(false);

  const statusOptions = ["OPERATIONAL", "NON_OPERATIONAL"] as const;
  const [status, setStatus] = useState<(typeof statusOptions)[number] | "">("");
  async function handleSubmit() {
    if (!brand.trim() || !model.trim() || !plateNumber.trim()) {
      toast.error("Brand, Model, and Plate Number are required");
      return;
    }

    setSaving(true);
    try {
      await createVehicle(projectId, {
        brand,
        model,
        type,
        plateNumber,
        owner,
        status,
        inspectionDate: "",
        before: 0,
        expiryDate: "",
      });
      toast.success("Vehicle added");
      onCreated();
      // Reset form
      setBrand("");
      setModel("");
      setType("");
      setPlateNumber("");
      setOwner("");
      setStatus("");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to add vehicle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>Add a vehicle to this project.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col space-y-4 mt-4"
        >
          <div>
            <Label htmlFor="brand">Brand *</Label>
            <Input
              id="brand"
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div>
            <Label htmlFor="model">Model *</Label>
            <Input
              id="model"
              placeholder="Model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Input
              id="type"
              placeholder="Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="plateNumber">Plate Number *</Label>
            <Input
              id="plateNumber"
              placeholder="Plate Number"
              value={plateNumber}
              onChange={(e) => setPlateNumber(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div>
            <Label htmlFor="owner">Owner</Label>
            <Input
              id="owner"
              placeholder="Owner"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as (typeof statusOptions)[number])
              }
              disabled={saving}
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

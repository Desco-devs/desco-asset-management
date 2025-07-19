"use client";

import * as React from "react";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLocation } from "@/app/actions/location-actions";

interface LocationFormDialogProps {
  trigger?: React.ReactNode;
  onLocationAdded?: () => void;
}

export function LocationFormDialog({ trigger, onLocationAdded }: LocationFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [address, setAddress] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      toast.error("Address is required");
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await createLocation(address.trim());
      
      toast.success("Location created successfully");
      setAddress("");
      setOpen(false);
      
      if (onLocationAdded) {
        onLocationAdded();
      }
    } catch (error) {
      console.error("Error creating location:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create location");
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Add Location
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Location</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new location for organizing clients and projects.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="address" className="text-foreground">Address</Label>
              <Input
                id="address"
                placeholder="Enter location address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isLoading}
                required
                className="text-foreground bg-background"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
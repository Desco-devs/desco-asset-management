"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Users } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Location {
  id: string;
  address: string;
  created_at: Date;
}

interface ClientFormDialogProps {
  trigger?: React.ReactNode;
  onClientAdded?: () => void;
}

export function ClientFormDialog({ trigger, onClientAdded }: ClientFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<Location[]>([]);

  // Load locations when dialog opens
  useEffect(() => {
    if (open && locations.length === 0) {
      loadLocations();
    }
  }, [open, locations.length]);

  const loadLocations = async () => {
    setIsLoadingLocations(true);
    try {
      const response = await fetch('/api/locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const fetchedLocations = await response.json();
      setLocations(fetchedLocations);
    } catch (error) {
      console.error("Error loading locations:", error);
      toast.error("Failed to load locations");
    } finally {
      setIsLoadingLocations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Client name is required");
      return;
    }

    if (!locationId) {
      toast.error("Please select a location");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          locationId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create client');
      }
      
      toast.success("Client created successfully");
      setName("");
      setLocationId("");
      setOpen(false);
      
      if (onClientAdded) {
        onClientAdded();
      }
    } catch (error) {
      console.error("Error creating client:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create client");
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Users className="h-4 w-4 mr-2" />
      Add Client
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Client</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new client and assign them to a location.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-foreground">Client Name</Label>
              <Input
                id="name"
                placeholder="Enter client name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                className="text-foreground bg-background"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="location" className="text-foreground">Location</Label>
              <Select
                value={locationId}
                onValueChange={setLocationId}
                disabled={isLoading || isLoadingLocations}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    isLoadingLocations ? "Loading locations..." : "Select a location"
                  } />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {locations.length === 0 && !isLoadingLocations && (
                <p className="text-xs text-muted-foreground">
                  No locations available. Please create a location first.
                </p>
              )}
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
            <Button 
              type="submit" 
              disabled={isLoading || !locationId || !name.trim()}
            >
              {isLoading ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
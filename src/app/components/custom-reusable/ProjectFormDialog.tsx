"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { FolderOpen } from "lucide-react";
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

interface Client {
  id: string;
  name: string;
  location: {
    id: string;
    address: string;
  };
}

interface ProjectFormDialogProps {
  trigger?: React.ReactNode;
  onProjectAdded?: () => void;
}

export function ProjectFormDialog({ trigger, onProjectAdded }: ProjectFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [clients, setClients] = useState<Client[]>([]);

  // Load clients when dialog opens
  useEffect(() => {
    if (open && clients.length === 0) {
      loadClients();
    }
  }, [open, clients.length]);

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const fetchedClients = await response.json();
      setClients(fetchedClients);
    } catch (error) {
      console.error("Error loading clients:", error);
      toast.error("Failed to load clients");
    } finally {
      setIsLoadingClients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          clientId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create project');
      }
      
      toast.success("Project created successfully");
      setName("");
      setClientId("");
      setOpen(false);
      
      if (onProjectAdded) {
        onProjectAdded();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <FolderOpen className="h-4 w-4 mr-2" />
      New Project
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Project</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a new project and assign it to a client.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-foreground">Project Name</Label>
              <Input
                id="name"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
                className="text-foreground bg-background"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="client" className="text-foreground">Client</Label>
              <Select
                value={clientId}
                onValueChange={setClientId}
                disabled={isLoading || isLoadingClients}
                required
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={
                    isLoadingClients ? "Loading clients..." : "Select a client"
                  } />
                </SelectTrigger>
                <SelectContent className="w-full">
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {client.location.address}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clients.length === 0 && !isLoadingClients && (
                <p className="text-xs text-muted-foreground">
                  No clients available. Please create a client first.
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
              disabled={isLoading || !clientId || !name.trim()}
            >
              {isLoading ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
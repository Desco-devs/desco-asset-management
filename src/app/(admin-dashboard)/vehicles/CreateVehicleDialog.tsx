"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import CreateVehicleForm from "./CreateVehicleForm";

interface CreateVehicleDialogProps {
  projects: Array<{
    id: string;
    name: string;
  }>;
}

export default function CreateVehicleDialog({ projects }: CreateVehicleDialogProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    // Invalidate React Query cache to refresh vehicle data
    queryClient.invalidateQueries({ queryKey: ['vehicles-optimized'] });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Vehicle
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Vehicle</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <CreateVehicleForm 
            projects={projects} 
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
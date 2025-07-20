"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import EditVehicleForm from "./EditVehicleForm";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  inspection_date: string;
  before: number;
  expiry_date: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  remarks?: string;
  owner: string;
  project: {
    id: string;
    name: string;
  };
}

interface EditVehicleDialogProps {
  vehicle: Vehicle;
  projects: Array<{
    id: string;
    name: string;
  }>;
  trigger?: React.ReactNode;
}

export default function EditVehicleDialog({ vehicle, projects, trigger }: EditVehicleDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className="max-w-[95%] max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: "800px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Vehicle: {vehicle.brand} {vehicle.model}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <EditVehicleForm
            vehicle={vehicle}
            projects={projects}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
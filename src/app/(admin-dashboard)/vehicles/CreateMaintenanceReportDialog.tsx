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
import { Plus, Wrench } from "lucide-react";
import VehicleMaintenanceReportForm from "./VehicleMaintenanceReportForm";

interface CreateMaintenanceReportDialogProps {
  vehicleId: string;
  locations: Array<{
    id: string;
    address: string;
  }>;
  users?: Array<{
    id: string;
    full_name: string;
  }>;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export default function CreateMaintenanceReportDialog({ 
  vehicleId, 
  locations, 
  users = [], 
  trigger,
  onSuccess 
}: CreateMaintenanceReportDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSuccess = () => {
    setOpen(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Report Issue
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent 
        className="max-w-[95%] max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: "800px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Create Maintenance Report
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <VehicleMaintenanceReportForm
            vehicleId={vehicleId}
            locations={locations}
            users={users}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
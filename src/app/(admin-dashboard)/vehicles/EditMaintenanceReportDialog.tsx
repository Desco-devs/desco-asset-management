"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wrench } from "lucide-react";
import VehicleMaintenanceReportForm from "./VehicleMaintenanceReportForm";

interface MaintenanceReport {
  id: string;
  issue_description: string;
  remarks?: string;
  inspection_details?: string;
  action_taken?: string;
  parts_replaced: string[];
  priority?: string;
  status?: string;
  downtime_hours?: string;
  date_reported: string;
  date_repaired?: string;
  location_id: string;
  repaired_by?: string;
}

interface EditMaintenanceReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  report: MaintenanceReport | null;
  locations: Array<{
    id: string;
    address: string;
  }>;
  users?: Array<{
    id: string;
    full_name: string;
  }>;
  onSuccess?: () => void;
}

export default function EditMaintenanceReportDialog({ 
  isOpen,
  onOpenChange,
  vehicleId, 
  report,
  locations, 
  users = [], 
  onSuccess 
}: EditMaintenanceReportDialogProps) {

  const handleSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!report) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[95%] max-h-[90vh] overflow-y-auto"
        style={{ maxWidth: "800px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Edit Maintenance Report
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <VehicleMaintenanceReportForm
            vehicleId={vehicleId}
            locations={locations}
            users={users}
            existingReport={report}
            onSuccess={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
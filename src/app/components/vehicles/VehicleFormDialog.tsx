"use client";

import * as React from "react";
import { Truck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VehicleForm } from "./VehicleForm";
import type { VehicleFormDialogProps } from "./types";

export function VehicleFormDialog({ 
  trigger, 
  onVehicleAdded,
  mode = 'create',
  title = "Add New Vehicle",
  description = "Register new vehicle with images and documents.",
  initialData,
  showFullFeatures = true
}: VehicleFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleVehicleAdded = () => {
    setOpen(false);
    if (onVehicleAdded) {
      onVehicleAdded();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Truck className="h-4 w-4 mr-2" />
      {mode === 'edit' ? 'Edit Vehicle' : 'Add Vehicle'}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent 
        className="max-w-[95%] max-h-[90vh] flex flex-col p-4" 
        style={{ maxWidth: "1024px" }}
      >
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <VehicleForm
            onVehicleAdded={handleVehicleAdded}
            mode={mode}
            title={title}
            description={description}
            initialData={initialData}
            showFullFeatures={showFullFeatures}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import * as React from "react";
import { Wrench } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { EquipmentForm } from "./EquipmentForm";
import type { EquipmentFormDialogProps } from "./types";

export function EquipmentFormDialog({ 
  trigger, 
  onEquipmentAdded,
  mode = 'create',
  title = "Add New Equipment",
  description = "Register new equipment with documents and parts management.",
  initialData,
  showFullFeatures = true
}: EquipmentFormDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleEquipmentAdded = () => {
    setOpen(false);
    if (onEquipmentAdded) {
      onEquipmentAdded();
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Wrench className="h-4 w-4 mr-2" />
      {mode === 'edit' ? 'Edit Equipment' : 'Add Equipment'}
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
          <EquipmentForm
            onEquipmentAdded={handleEquipmentAdded}
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
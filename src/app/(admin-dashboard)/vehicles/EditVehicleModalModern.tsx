"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useVehiclesStore, selectSelectedVehicle, selectIsEditMode } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData } from "@/hooks/useVehiclesQuery";
import EditVehicleForm from "./EditVehicleForm";

export default function EditVehicleModalModern() {
  const selectedVehicle = useVehiclesStore(selectSelectedVehicle);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  const { setIsEditMode } = useVehiclesStore();
  
  // Get reference data
  const { projects } = useVehiclesWithReferenceData();

  const handleSuccess = () => {
    setIsEditMode(false);
    // React Query cache will be invalidated by the mutation and realtime updates
  };

  const handleCancel = () => {
    setIsEditMode(false);
  };

  if (!selectedVehicle) return null;

  // Transform vehicle data to match form interface
  const vehicleForForm = {
    id: selectedVehicle.id,
    brand: selectedVehicle.brand,
    model: selectedVehicle.model,
    type: selectedVehicle.type,
    plate_number: selectedVehicle.plate_number,
    inspection_date: selectedVehicle.inspection_date,
    before: selectedVehicle.before,
    expiry_date: selectedVehicle.expiry_date,
    status: selectedVehicle.status,
    remarks: selectedVehicle.remarks,
    owner: selectedVehicle.owner,
    project: {
      id: selectedVehicle.project?.id || '',
      name: selectedVehicle.project?.name || '',
    }
  };

  return (
    <Dialog open={isEditMode} onOpenChange={setIsEditMode}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle: {selectedVehicle.brand} {selectedVehicle.model}</DialogTitle>
          <DialogDescription>
            Update the vehicle information below. Changes will be saved automatically.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <EditVehicleForm 
            vehicle={vehicleForForm}
            projects={projects.map(p => ({
              id: p.id,
              name: p.name
            }))} 
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
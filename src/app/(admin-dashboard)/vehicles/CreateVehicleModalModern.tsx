"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVehiclesStore, selectIsCreateModalOpen } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData } from "@/hooks/useVehiclesQuery";
import CreateVehicleForm from "./CreateVehicleForm";

export default function CreateVehicleModalModern() {
  const isCreateModalOpen = useVehiclesStore(selectIsCreateModalOpen);
  const { setIsCreateModalOpen } = useVehiclesStore();
  
  // Get reference data
  const { projects } = useVehiclesWithReferenceData();

  const handleSuccess = () => {
    setIsCreateModalOpen(false);
    // React Query cache will be invalidated by the mutation
  };

  return (
    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Vehicle</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <CreateVehicleForm 
            projects={projects.map(p => ({
              id: p.id,
              name: p.name
            }))} 
            onSuccess={handleSuccess}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
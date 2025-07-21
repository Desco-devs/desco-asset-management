"use client";

import { useFormStatus } from "react-dom";
import { updateVehicleAction } from "./actions";
import { useVehiclesStore } from "@/stores/vehiclesStore";
import { useQueryClient } from "@tanstack/react-query";
import { vehicleKeys } from "@/hooks/useVehiclesQuery";
import { Button } from "@/components/ui/button";
import { Loader2, Save, Check, X } from "lucide-react";

// Submit button component that uses useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button 
      type="submit" 
      disabled={pending}
      className="w-full"
    >
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Updating Vehicle...
        </>
      ) : (
        <>
          <Save className="h-4 w-4 mr-2" />
          Update Vehicle
        </>
      )}
    </Button>
  );
}

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

interface EditVehicleFormProps {
  vehicle: Vehicle;
  projects: Array<{
    id: string;
    name: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function EditVehicleForm({ vehicle, projects, onSuccess, onCancel }: EditVehicleFormProps) {
  const { setSelectedVehicle } = useVehiclesStore();
  const queryClient = useQueryClient();
  
  const handleAction = async (formData: FormData) => {
    try {
      const result = await updateVehicleAction(formData);
      
      // Update both Zustand store and TanStack Query cache when basic vehicle info is updated
      if (result && result.vehicle) {
        setSelectedVehicle(result.vehicle);
        
        // Also update TanStack Query cache to keep everything in sync
        queryClient.setQueryData(vehicleKeys.vehicles(), (oldData: any) => {
          if (!oldData) return [result.vehicle];
          
          // Find and update the vehicle in the array
          const updatedData = oldData.map((existingVehicle: any) => 
            existingVehicle.id === result.vehicle.id ? result.vehicle : existingVehicle
          );
          
          return updatedData;
        });
      }
      
      // Show single success toast
      const { toast } = await import("sonner");
      toast.success("Vehicle updated successfully!");
      
      if (onSuccess) {
        // Small delay to prevent focus issues when closing dialog
        setTimeout(() => {
          onSuccess();
        }, 100);
      }
    } catch (error) {
      console.error("Form submission error:", error);
      const { toast } = await import("sonner");
      toast.error("Error: " + (error instanceof Error ? error.message : "Failed to update vehicle"));
    }
  };

  // Helper to format date for input
  const formatDateForInput = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return (
    <form action={handleAction} className="space-y-4">
      {/* Hidden vehicle ID */}
      <input type="hidden" name="vehicleId" value={vehicle.id} />

      {/* Basic Vehicle Info */}
      <div>
        <label className="block text-sm font-medium mb-1">Brand *</label>
        <input
          type="text"
          name="brand"
          required
          defaultValue={vehicle.brand}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="e.g. Toyota, Caterpillar"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Model *</label>
        <input
          type="text"
          name="model"
          required
          defaultValue={vehicle.model}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="e.g. Hilux, 320D"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Type *</label>
        <select
          name="type"
          required
          defaultValue={vehicle.type}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select type</option>
          <option value="Truck">Truck</option>
          <option value="Car">Car</option>
          <option value="Motorcycle">Motorcycle</option>
          <option value="Heavy Equipment">Heavy Equipment</option>
          <option value="Van">Van</option>
          <option value="Bus">Bus</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Plate Number *</label>
        <input
          type="text"
          name="plateNumber"
          required
          defaultValue={vehicle.plate_number}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="e.g. ABC-1234"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Owner *</label>
        <input
          type="text"
          name="owner"
          required
          defaultValue={vehicle.owner}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Owner name"
        />
      </div>

      {/* Project Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Project *</label>
        <select
          name="projectId"
          required
          defaultValue={vehicle.project.id}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium mb-1">Status *</label>
        <select
          name="status"
          required
          defaultValue={vehicle.status}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="OPERATIONAL">Operational</option>
          <option value="NON_OPERATIONAL">Non-Operational</option>
        </select>
      </div>

      {/* Dates */}
      <div>
        <label className="block text-sm font-medium mb-1">Inspection Date *</label>
        <input
          type="date"
          name="inspectionDate"
          required
          defaultValue={formatDateForInput(vehicle.inspection_date)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Expiry Date *</label>
        <input
          type="date"
          name="expiryDate"
          required
          defaultValue={formatDateForInput(vehicle.expiry_date)}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Inspection Frequency (months) *</label>
        <input
          type="number"
          name="before"
          required
          min="1"
          max="12"
          defaultValue={vehicle.before}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="6"
        />
      </div>

      {/* Optional Remarks */}
      <div>
        <label className="block text-sm font-medium mb-1">Remarks</label>
        <textarea
          name="remarks"
          rows={3}
          defaultValue={vehicle.remarks || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Optional remarks or notes"
        />
      </div>



      {/* Action Buttons */}
      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        )}
        <div className="flex-1">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
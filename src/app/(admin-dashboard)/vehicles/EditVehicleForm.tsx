"use client";

import { useFormStatus } from "react-dom";
import { updateVehicleAction } from "./actions";

// Submit button component that uses useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? "Updating Vehicle..." : "Update Vehicle"}
    </button>
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
  
  const handleAction = async (formData: FormData) => {
    try {
      const result = await updateVehicleAction(formData);
      
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


      {/* 🔥 DOCUMENTS SECTION */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-3">Update Documents (Optional)</h3>
        <p className="text-sm text-gray-600 mb-3">Select new files only if you want to replace existing documents</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Original Receipt (OR)</label>
            <input
              type="file"
              name="originalReceipt"
              accept=".pdf,image/*"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">PDF or image files accepted</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Car Registration (CR)</label>
            <input
              type="file"
              name="carRegistration"
              accept=".pdf,image/*"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">PDF or image files accepted</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">PGPC Inspection</label>
            <input
              type="file"
              name="pgpcInspection"
              accept=".pdf,image/*"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">PDF or image files accepted</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        )}
        <div className="flex-1">
          <SubmitButton />
        </div>
      </div>
    </form>
  );
}
"use client";

import { useFormStatus } from "react-dom";
import { createVehicleAction } from "./actions";

// Submit button component that uses useFormStatus
function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? "Creating Vehicle..." : "Create Vehicle"}
    </button>
  );
}

interface CreateVehicleFormProps {
  projects: Array<{
    id: string;
    name: string;
  }>;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CreateVehicleForm({ projects, onSuccess, onCancel }: CreateVehicleFormProps) {
  
  const handleAction = async (formData: FormData) => {
    try {
      const result = await createVehicleAction(formData);
      
      // Show success message
      if (result.filesUploaded > 0) {
        alert(`✅ Vehicle created successfully with ${result.filesUploaded} files uploaded!`);
      } else {
        alert("✅ Vehicle created successfully!");
      }
      
      // Form will reset automatically after successful submission
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      alert("❌ Error: " + (error instanceof Error ? error.message : "Failed to create vehicle"));
    }
  };

  return (
    <form action={handleAction} className="space-y-4">
      {/* Basic Vehicle Info */}
      <div>
        <label className="block text-sm font-medium mb-1">Brand *</label>
        <input
          type="text"
          name="brand"
          required
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
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="e.g. Hilux, 320D"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Type *</label>
        <select
          name="type"
          required
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
          className="w-full border border-gray-300 rounded px-3 py-2"
          defaultValue="OPERATIONAL"
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
          className="w-full border border-gray-300 rounded px-3 py-2"
          defaultValue={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Expiry Date *</label>
        <input
          type="date"
          name="expiryDate"
          required
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
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="6"
          defaultValue="6"
        />
      </div>

      {/* Optional Remarks */}
      <div>
        <label className="block text-sm font-medium mb-1">Remarks</label>
        <textarea
          name="remarks"
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Optional remarks or notes"
        />
      </div>

      {/* 🔥 VEHICLE IMAGES SECTION */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-3">Vehicle Images (Optional)</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Front View</label>
            <input
              type="file"
              name="frontImg"
              accept="image/*"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Back View</label>
            <input
              type="file"
              name="backImg"
              accept="image/*"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Side View 1</label>
            <input
              type="file"
              name="side1Img"
              accept="image/*"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Side View 2</label>
            <input
              type="file"
              name="side2Img"
              accept="image/*"
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
      </div>

      {/* 🔥 DOCUMENTS SECTION */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-3">Documents (Optional)</h3>
        
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
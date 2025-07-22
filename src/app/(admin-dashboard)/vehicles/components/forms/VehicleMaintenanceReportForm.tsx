"use client";

import { useFormStatus } from "react-dom";
import { createVehicleMaintenanceReportAction, updateVehicleMaintenanceReportAction } from "@/app/actions/vehicle-maintenance-actions";
import { toast } from "sonner";

// Submit button component that uses useFormStatus
function SubmitButton({ isEdit }: { isEdit?: boolean }) {
  const { pending } = useFormStatus();
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {pending ? (isEdit ? "Updating Report..." : "Creating Report...") : (isEdit ? "Update Report" : "Create Report")}
    </button>
  );
}

interface VehicleMaintenanceReportFormProps {
  vehicleId: string;
  locations: Array<{
    id: string;
    address: string;
  }>;
  users?: Array<{
    id: string;
    full_name: string;
  }>;
  existingReport?: {
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
  };
  onSuccess?: () => void;
}

export default function VehicleMaintenanceReportForm({ 
  vehicleId, 
  locations, 
  users = [], 
  existingReport,
  onSuccess 
}: VehicleMaintenanceReportFormProps) {
  
  const isEdit = !!existingReport;
  
  const handleAction = async (formData: FormData) => {
    try {
      let result;
      
      if (isEdit) {
        formData.append("reportId", existingReport.id);
        result = await updateVehicleMaintenanceReportAction(formData);
      } else {
        result = await createVehicleMaintenanceReportAction(formData);
      }
      
      
      // Show success message
      const attachmentCount = ('attachmentsUploaded' in result) ? result.attachmentsUploaded : 
                             ('newAttachmentsUploaded' in result) ? result.newAttachmentsUploaded : 0;
      
      if (attachmentCount && attachmentCount > 0) {
        toast.success(`Report ${isEdit ? 'updated' : 'created'} successfully with ${attachmentCount} attachments!`);
      } else {
        toast.success(`Report ${isEdit ? 'updated' : 'created'} successfully!`);
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error("Error: " + (error instanceof Error ? error.message : `Failed to ${isEdit ? 'update' : 'create'} maintenance report`));
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
      <input type="hidden" name="vehicleId" value={vehicleId} />

      {/* Location Selection */}
      <div>
        <label className="block text-sm font-medium mb-1">Location *</label>
        <select
          name="locationId"
          required
          defaultValue={existingReport?.location_id || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select location</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.address}
            </option>
          ))}
        </select>
      </div>

      {/* Issue Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Issue Description *</label>
        <textarea
          name="issueDescription"
          rows={3}
          required
          defaultValue={existingReport?.issue_description || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Describe the issue or maintenance needed"
        />
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium mb-1">Priority</label>
        <select
          name="priority"
          defaultValue={existingReport?.priority || 'MEDIUM'}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Select priority</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium mb-1">Status</label>
        <select
          name="status"
          defaultValue={existingReport?.status || 'REPORTED'}
          className="w-full border border-gray-300 rounded px-3 py-2"
        >
          <option value="REPORTED">Reported</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {/* Date Reported */}
      <div>
        <label className="block text-sm font-medium mb-1">Date Reported *</label>
        <input
          type="date"
          name="dateReported"
          required
          defaultValue={existingReport ? formatDateForInput(existingReport.date_reported) : new Date().toISOString().split('T')[0]}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      {/* Date Repaired */}
      <div>
        <label className="block text-sm font-medium mb-1">Date Repaired</label>
        <input
          type="date"
          name="dateRepaired"
          defaultValue={existingReport?.date_repaired ? formatDateForInput(existingReport.date_repaired) : ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
        />
      </div>

      {/* Repaired By */}
      {users.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Repaired By</label>
          <select
            name="repairedBy"
            defaultValue={existingReport?.repaired_by || ''}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Downtime Hours */}
      <div>
        <label className="block text-sm font-medium mb-1">Downtime Hours</label>
        <input
          type="text"
          name="downtimeHours"
          defaultValue={existingReport?.downtime_hours || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="e.g. 2.5 hours"
        />
      </div>

      {/* Parts Replaced */}
      <div>
        <label className="block text-sm font-medium mb-1">Parts Replaced</label>
        <textarea
          name="partsReplaced"
          rows={2}
          defaultValue={existingReport?.parts_replaced.join(', ') || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="List parts separated by commas (e.g. brake pads, oil filter, spark plugs)"
        />
      </div>

      {/* Inspection Details */}
      <div>
        <label className="block text-sm font-medium mb-1">Inspection Details</label>
        <textarea
          name="inspectionDetails"
          rows={3}
          defaultValue={existingReport?.inspection_details || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Details from inspection"
        />
      </div>

      {/* Action Taken */}
      <div>
        <label className="block text-sm font-medium mb-1">Action Taken</label>
        <textarea
          name="actionTaken"
          rows={3}
          defaultValue={existingReport?.action_taken || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Describe what was done to resolve the issue"
        />
      </div>

      {/* Remarks */}
      <div>
        <label className="block text-sm font-medium mb-1">Remarks</label>
        <textarea
          name="remarks"
          rows={2}
          defaultValue={existingReport?.remarks || ''}
          className="w-full border border-gray-300 rounded px-3 py-2"
          placeholder="Additional notes or comments"
        />
      </div>

      {/* File Attachments */}
      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-3">Attachments (Optional)</h3>
        <p className="text-sm text-gray-600 mb-3">Upload photos, receipts, or documents related to this maintenance</p>
        
        <div>
          <label className="block text-sm font-medium mb-1">Upload Files</label>
          <input
            type="file"
            name="attachments"
            multiple
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <p className="text-xs text-gray-500 mt-1">Multiple files accepted: images, PDF, documents</p>
        </div>
      </div>

      {/* Submit Button */}
      <SubmitButton isEdit={isEdit} />
    </form>
  );
}
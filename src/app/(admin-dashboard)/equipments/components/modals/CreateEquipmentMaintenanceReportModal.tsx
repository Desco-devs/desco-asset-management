"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateEquipmentMaintenanceReport,
  useEquipmentsWithReferenceData,
} from "@/hooks/useEquipmentsQuery";
import { useEquipmentsStore } from "@/stores/equipmentsStore";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface CreateEquipmentMaintenanceReportModalProps {
  equipmentId: string;
}

export default function CreateEquipmentMaintenanceReportModal({
  equipmentId,
}: CreateEquipmentMaintenanceReportModalProps) {
  const isOpen = useEquipmentsStore((state) => state.isEquipmentMaintenanceModalOpen);
  const { setIsEquipmentMaintenanceModalOpen } = useEquipmentsStore();
  const { locations } = useEquipmentsWithReferenceData();
  const createMaintenanceReportMutation = useCreateEquipmentMaintenanceReport();

  // Form state
  const [formData, setFormData] = useState({
    issue_description: "",
    remarks: "",
    inspection_details: "",
    action_taken: "",
    priority: "MEDIUM",
    status: "REPORTED",
    downtime_hours: "",
    location_id: "",
    parts_replaced: [""] as string[],
    attachment_urls: [""] as string[],
  });

  const handleClose = () => {
    setIsEquipmentMaintenanceModalOpen(false);
    // Reset form
    setFormData({
      issue_description: "",
      remarks: "",
      inspection_details: "",
      action_taken: "",
      priority: "MEDIUM",
      status: "REPORTED",
      downtime_hours: "",
      location_id: "",
      parts_replaced: [""],
      attachment_urls: [""],
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (
    field: "parts_replaced" | "attachment_urls",
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  };

  const addArrayItem = (field: "parts_replaced" | "attachment_urls") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  };

  const removeArrayItem = (
    field: "parts_replaced" | "attachment_urls",
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.issue_description.trim()) {
      toast.error("Issue description is required");
      return;
    }

    // Filter out empty values from arrays
    const filteredPartsReplaced = formData.parts_replaced.filter(
      (part) => part.trim() !== ""
    );
    const filteredAttachmentUrls = formData.attachment_urls.filter(
      (url) => url.trim() !== ""
    );

    const reportData = {
      equipment_id: equipmentId,
      issue_description: formData.issue_description,
      remarks: formData.remarks || undefined,
      inspection_details: formData.inspection_details || undefined,
      action_taken: formData.action_taken || undefined,
      priority: formData.priority,
      status: formData.status,
      downtime_hours: formData.downtime_hours || undefined,
      location_id: formData.location_id || undefined,
      parts_replaced: filteredPartsReplaced,
      attachment_urls: filteredAttachmentUrls,
      date_reported: new Date().toISOString(),
    };

    try {
      await createMaintenanceReportMutation.mutateAsync(reportData);
      handleClose();
    } catch (error) {
      console.error("Error creating maintenance report:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Equipment Maintenance Report</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="issue_description">
              Issue Description *
            </Label>
            <Textarea
              id="issue_description"
              value={formData.issue_description}
              onChange={(e) =>
                handleInputChange("issue_description", e.target.value)
              }
              placeholder="Describe the issue or maintenance required..."
              required
              className="min-h-[80px]"
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPORTED">Reported</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Downtime Hours and Location */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="downtime_hours">Downtime Hours</Label>
              <Input
                id="downtime_hours"
                type="number"
                step="0.1"
                value={formData.downtime_hours}
                onChange={(e) =>
                  handleInputChange("downtime_hours", e.target.value)
                }
                placeholder="0.0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location_id">Location</Label>
              <Select
                value={formData.location_id}
                onValueChange={(value) => handleInputChange("location_id", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.uid} value={location.uid}>
                      {location.address}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Inspection Details */}
          <div className="space-y-2">
            <Label htmlFor="inspection_details">Inspection Details</Label>
            <Textarea
              id="inspection_details"
              value={formData.inspection_details}
              onChange={(e) =>
                handleInputChange("inspection_details", e.target.value)
              }
              placeholder="Describe the inspection findings..."
              className="min-h-[80px]"
            />
          </div>

          {/* Action Taken */}
          <div className="space-y-2">
            <Label htmlFor="action_taken">Action Taken</Label>
            <Textarea
              id="action_taken"
              value={formData.action_taken}
              onChange={(e) =>
                handleInputChange("action_taken", e.target.value)
              }
              placeholder="Describe the actions taken..."
              className="min-h-[80px]"
            />
          </div>

          {/* Parts Replaced */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Parts Replaced</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem("parts_replaced")}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Part
              </Button>
            </div>
            <div className="space-y-2">
              {formData.parts_replaced.map((part, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={part}
                    onChange={(e) =>
                      handleArrayChange("parts_replaced", index, e.target.value)
                    }
                    placeholder="Part name or description..."
                  />
                  {formData.parts_replaced.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem("parts_replaced", index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attachment URLs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Attachment URLs</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addArrayItem("attachment_urls")}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add URL
              </Button>
            </div>
            <div className="space-y-2">
              {formData.attachment_urls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) =>
                      handleArrayChange("attachment_urls", index, e.target.value)
                    }
                    placeholder="https://example.com/image.jpg"
                    type="url"
                  />
                  {formData.attachment_urls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeArrayItem("attachment_urls", index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              placeholder="Additional remarks or notes..."
              className="min-h-[80px]"
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMaintenanceReportMutation.isPending}
            >
              {createMaintenanceReportMutation.isPending
                ? "Creating..."
                : "Create Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import {
  useUpdateEquipmentMaintenanceReport,
  useEquipmentsWithReferenceData,
} from "@/hooks/useEquipmentsQuery";
import { useEquipmentsStore } from "@/stores/equipmentsStore";
import { Plus, Trash2, Settings, Clock, MapPin, Wrench, FileText, Camera, Upload } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function EditEquipmentMaintenanceReportModal() {
  const selectedReport = useEquipmentsStore((state) => state.selectedEquipmentMaintenanceReport);
  const { setSelectedEquipmentMaintenanceReport } = useEquipmentsStore();
  const { locations } = useEquipmentsWithReferenceData();
  const updateMaintenanceReportMutation = useUpdateEquipmentMaintenanceReport();

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
  const [partsFiles, setPartsFiles] = useState<File[]>([]);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  // Populate form when selectedReport changes
  useEffect(() => {
    if (selectedReport) {
      setFormData({
        issue_description: selectedReport.issue_description || "",
        remarks: selectedReport.remarks || "",
        inspection_details: selectedReport.inspection_details || "",
        action_taken: selectedReport.action_taken || "",
        priority: selectedReport.priority || "MEDIUM",
        status: selectedReport.status || "REPORTED",
        downtime_hours: selectedReport.downtime_hours || "",
        location_id: selectedReport.location_id || "",
        parts_replaced: selectedReport.parts_replaced?.length > 0 ? selectedReport.parts_replaced.filter(part => part.trim() !== "") : [],
        attachment_urls: selectedReport.attachment_urls?.length > 0 ? selectedReport.attachment_urls.filter(url => url.trim() !== "") : [],
      });
    }
  }, [selectedReport]);

  const handleClose = useCallback(() => {
    setSelectedEquipmentMaintenanceReport(null);
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
    setPartsFiles([]);
    setAttachmentFiles([]);
  }, [setSelectedEquipmentMaintenanceReport]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleArrayChange = useCallback((
    field: "parts_replaced" | "attachment_urls",
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].map((item, i) => (i === index ? value : item)),
    }));
  }, []);

  const addArrayItem = useCallback((field: "parts_replaced" | "attachment_urls") => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], ""],
    }));
  }, []);

  const removeArrayItem = useCallback((
    field: "parts_replaced" | "attachment_urls",
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReport) return;

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

    // Upload files first
    const uploadedPartUrls: string[] = [];
    const uploadedAttachmentUrls: string[] = [];

    try {
      // Upload part images
      for (let i = 0; i < partsFiles.length; i++) {
        const file = partsFiles[i];
        if (file) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          formDataUpload.append('folder', 'maintenance-parts');
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formDataUpload,
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            uploadedPartUrls[i] = result.url;
          }
        }
      }

      // Upload attachment files
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        if (file) {
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          formDataUpload.append('folder', 'maintenance-attachments');
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formDataUpload,
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            uploadedAttachmentUrls.push(result.url);
          }
        }
      }

      // Combine uploaded file URLs with manual URLs
      const allAttachmentUrls = [
        ...uploadedPartUrls.filter(url => url), // Part images first
        ...uploadedAttachmentUrls, // Then attachment files
        ...filteredAttachmentUrls // Then manual URLs
      ];

      const reportData = {
        id: selectedReport.id,
        issue_description: formData.issue_description,
        remarks: formData.remarks || undefined,
        inspection_details: formData.inspection_details || undefined,
        action_taken: formData.action_taken || undefined,
        priority: formData.priority,
        status: formData.status,
        downtime_hours: formData.downtime_hours || undefined,
        location_id: formData.location_id || undefined,
        parts_replaced: filteredPartsReplaced,
        attachment_urls: allAttachmentUrls,
        // Set repair date if status is completed and no repair date exists
        date_repaired: 
          formData.status === "COMPLETED" && !selectedReport.date_repaired
            ? new Date().toISOString()
            : selectedReport.date_repaired,
      };

      await updateMaintenanceReportMutation.mutateAsync(reportData);
      toast.success("Equipment maintenance report updated successfully");
      handleClose();
    } catch (error) {
      console.error("Error updating maintenance report:", error);
      toast.error("Failed to update maintenance report");
    }
  }, [formData, selectedReport, updateMaintenanceReportMutation, handleClose, partsFiles, attachmentFiles]);

  if (!selectedReport) return null;

  return (
    <Dialog open={!!selectedReport} onOpenChange={handleClose}>
      <DialogContent 
        className="!max-w-none !w-[70vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '70vw', width: '70vw' }}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl">Edit Equipment Maintenance Report</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update maintenance report details, parts replaced, and status information
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-full">
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-0">
              <div className="space-y-6">
                {/* Issue Information Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Issue Information
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Update the maintenance issue details and priority
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                        className="min-h-[100px]"
                      />
                    </div>

                    {/* Priority and Status */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="priority" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Priority
                        </Label>
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
                        <Label htmlFor="status" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          Status
                        </Label>
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
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="downtime_hours" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Downtime Hours
                        </Label>
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
                        <Label htmlFor="location_id" className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location
                        </Label>
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
                  </CardContent>
                </Card>

                {/* Technical Details Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Technical Details
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Update inspection findings and actions taken
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
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
                        className="min-h-[100px]"
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
                        className="min-h-[100px]"
                      />
                    </div>
                  </CardContent>
                </Card>

                    {/* Additional Remarks Card */}
                    <Card>
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Additional Remarks
                        </CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Add any additional notes or comments
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Label htmlFor="remarks">Remarks</Label>
                          <Textarea
                            id="remarks"
                            value={formData.remarks}
                            onChange={(e) => handleInputChange("remarks", e.target.value)}
                            placeholder="Additional remarks or notes..."
                            className="min-h-[100px]"
                          />
                        </div>
                      </CardContent>
                    </Card>
                </div>
              </div>
            </div>
            
            {/* Desktop Action Buttons in Footer */}
            <DialogFooter className="pt-4 border-t bg-background">
              <div className="flex gap-2 w-full justify-end">
                <Button type="button" variant="outline" onClick={handleClose} size="lg">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMaintenanceReportMutation.isPending}
                  size="lg"
                >
                  {updateMaintenanceReportMutation.isPending
                    ? "Updating..."
                    : "Update Report"}
                </Button>
              </div>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useEquipmentStore, selectActiveModal } from "@/stores/equipmentStore";
import { Plus, Trash2, Settings, Clock, MapPin, Wrench, FileText, Camera, Upload, X } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function EditEquipmentMaintenanceReportModal() {
  const selectedReport = useEquipmentsStore((state) => state.selectedEquipmentMaintenanceReport);
  const activeModal = useEquipmentStore(selectActiveModal);
  const { setSelectedEquipmentMaintenanceReport } = useEquipmentsStore();
  const { setActiveModal } = useEquipmentStore();
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
  const [deletedAttachments, setDeletedAttachments] = useState<string[]>([]);

  // Populate form when selectedReport changes
  useEffect(() => {
    if (selectedReport) {
      const partsReplaced = selectedReport.parts_replaced?.length > 0 
        ? selectedReport.parts_replaced.filter(part => part.trim() !== "") 
        : [];
      const attachmentUrls = selectedReport.attachment_urls?.length > 0 
        ? selectedReport.attachment_urls.filter(url => url.trim() !== "") 
        : [];

      setFormData({
        issue_description: selectedReport.issue_description || "",
        remarks: selectedReport.remarks || "",
        inspection_details: selectedReport.inspection_details || "",
        action_taken: selectedReport.action_taken || "",
        priority: selectedReport.priority || "MEDIUM",
        status: selectedReport.status || "REPORTED",
        downtime_hours: selectedReport.downtime_hours || "",
        location_id: selectedReport.location_id || "",
        parts_replaced: partsReplaced.length > 0 ? partsReplaced : [""],
        attachment_urls: attachmentUrls.length > 0 ? attachmentUrls : [""],
      });
    }
  }, [selectedReport]);

  const handleClose = useCallback(() => {
    setSelectedEquipmentMaintenanceReport(null);
    // Clear active modal coordination
    setActiveModal(null);
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
    setDeletedAttachments([]);
  }, [setSelectedEquipmentMaintenanceReport, setActiveModal]);

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
    setFormData((prev) => {
      // If removing an attachment URL, track it for deletion
      if (field === "attachment_urls" && prev[field][index]?.trim() !== "") {
        const urlToDelete = prev[field][index];
        setDeletedAttachments(prevDeleted => [...prevDeleted, urlToDelete]);
      }
      
      return {
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index),
      };
    });
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

    try {
      // Create FormData for file uploads and data
      const formDataToSend = new FormData();
      
      // Add basic form fields
      formDataToSend.append('equipment_id', selectedReport.equipment_id);
      formDataToSend.append('location_id', formData.location_id);
      formDataToSend.append('issue_description', formData.issue_description);
      formDataToSend.append('remarks', formData.remarks);
      formDataToSend.append('inspection_details', formData.inspection_details);
      formDataToSend.append('action_taken', formData.action_taken);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('downtime_hours', formData.downtime_hours);
      formDataToSend.append('reported_by', selectedReport.reported_by || '');
      formDataToSend.append('repaired_by', selectedReport.repaired_by || '');
      
      // Set repair date if status is completed and no repair date exists
      const repairDate = formData.status === "COMPLETED" && !selectedReport.date_repaired
        ? new Date().toISOString()
        : selectedReport.date_repaired;
      if (repairDate) {
        formDataToSend.append('date_repaired', repairDate);
      }
      
      // Add arrays as JSON strings
      formDataToSend.append('parts_replaced', JSON.stringify(filteredPartsReplaced));
      formDataToSend.append('attachment_urls', JSON.stringify(filteredAttachmentUrls));
      
      // Add files to delete
      if (deletedAttachments.length > 0) {
        formDataToSend.append('filesToDelete', JSON.stringify(deletedAttachments));
      }
      
      // Add new attachment files
      attachmentFiles.forEach((file, index) => {
        if (file) {
          formDataToSend.append(`attachment_${index}`, file);
        }
      });

      // Make direct API call with FormData
      const response = await fetch(`/api/equipments/maintenance-reports/${selectedReport.id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update maintenance report');
      }

      const updatedReport = await response.json();
      
      toast.success("Equipment maintenance report updated successfully");
      handleClose();
      
      // Trigger data refetch by calling the mutation with the result
      // This ensures the UI updates with the latest data
      updateMaintenanceReportMutation.mutate(updatedReport);
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update maintenance report");
    }
  }, [formData, selectedReport, updateMaintenanceReportMutation, handleClose, attachmentFiles, deletedAttachments]);

  // Only render when this is the active modal and we have a report to edit
  const shouldShow = activeModal === 'maintenance-edit' && !!selectedReport;
  
  if (!selectedReport || !shouldShow) return null;

  return (
    <Dialog open={shouldShow} onOpenChange={handleClose}>
      <DialogContent 
        className="!max-w-none !w-[70vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '70vw', width: '70vw' }}
        aria-describedby="edit-report-description"
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl">Edit Equipment Maintenance Report</DialogTitle>
          <DialogDescription id="edit-report-description" className="text-sm text-muted-foreground">
            Update maintenance report details, parts replaced, and status information
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-full">
          <div className="flex-1 overflow-y-auto min-h-0 pr-2">
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

                {/* Parts Replaced Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Parts Replaced
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      List all parts that were replaced during maintenance
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.parts_replaced.map((part, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={part}
                          onChange={(e) => handleArrayChange("parts_replaced", index, e.target.value)}
                          placeholder={`Part ${index + 1}...`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeArrayItem("parts_replaced", index)}
                          className="px-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayItem("parts_replaced")}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Part
                    </Button>
                  </CardContent>
                </Card>

                {/* Attachments Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Camera className="h-5 w-5" />
                      Attachments & Images
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Upload photos of work done, receipts, before/after images, and any related documents
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Existing Attachments */}
                    {formData.attachment_urls.filter(url => url.trim() !== "").length > 0 && (
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Current Attachments</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                          {formData.attachment_urls
                            .filter(url => url.trim() !== "")
                            .map((url, index) => (
                              <div key={index} className="relative group">
                                <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                  {url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                                    <img
                                      src={url}
                                      alt={`Attachment ${index + 1}`}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                          parent.innerHTML = `
                                            <div class="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                              <FileText size="32" />
                                              <span class="text-xs text-center mt-2">Failed to load</span>
                                            </div>
                                          `;
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                      <FileText size={32} />
                                      <span className="text-xs text-center mt-2">Document</span>
                                    </div>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeArrayItem("attachment_urls", index)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                                {/* Show filename as tooltip */}
                                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                  {url.split('/').pop()?.split('_').pop() || 'File'}
                                </div>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}

                    {/* File Upload Section */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Upload New Files</Label>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                        💡 <strong>Tip:</strong> Upload work photos, receipts, before/after images, or any documentation related to this maintenance
                      </div>
                      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                        <Input
                          type="file"
                          accept="image/*,application/pdf,.doc,.docx"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            setAttachmentFiles(files);
                          }}
                          className="w-full"
                        />
                        {attachmentFiles.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {attachmentFiles.map((file, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4" />
                                <span className="flex-1">{file.name}</span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  className="px-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
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
            
          {/* Fixed Footer Outside Scroll Area */}
          <DialogFooter className="flex-shrink-0 pt-4 border-t bg-background">
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
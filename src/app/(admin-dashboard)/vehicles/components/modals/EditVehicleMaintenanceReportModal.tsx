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
import {
  useUpdateMaintenanceReport,
  useVehiclesWithReferenceData,
} from "@/hooks/useVehiclesQuery";
import { useVehiclesStore } from "@/stores/vehiclesStore";
import { Plus, Trash2, Settings, Clock, MapPin, Wrench, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function EditVehicleMaintenanceReportModal() {
  const selectedReport = useVehiclesStore((state) => state.selectedMaintenanceReportForEdit);
  const { setSelectedMaintenanceReportForEdit } = useVehiclesStore();
  const { locations } = useVehiclesWithReferenceData();
  const updateMaintenanceReportMutation = useUpdateMaintenanceReport();

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

  const handleClose = () => {
    setSelectedMaintenanceReportForEdit(null);
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
      attachment_urls: filteredAttachmentUrls,
      // Set repair date if status is completed and no repair date exists
      date_repaired: 
        formData.status === "COMPLETED" && !selectedReport.date_repaired
          ? new Date().toISOString()
          : selectedReport.date_repaired,
    };

    try {
      await updateMaintenanceReportMutation.mutateAsync(reportData);
      handleClose();
    } catch (error) {
      console.error("Error updating maintenance report:", error);
    }
  };

  if (!selectedReport) return null;

  return (
    <Dialog open={!!selectedReport} onOpenChange={handleClose}>
      <DialogContent 
        className="!max-w-none !w-[70vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '70vw', width: '70vw' }}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl">Edit Vehicle Maintenance Report</DialogTitle>
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
                            {locations.filter(location => location.id).map((location) => (
                              <SelectItem key={location.id} value={location.id}>
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
                      Manage the list of parts that were replaced during maintenance
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Parts List</Label>
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
                    <div className="space-y-3">
                      {formData.parts_replaced.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed border-gray-300 rounded-lg">
                          No parts replaced. Click "Add Part" to add parts.
                        </div>
                      ) : (
                        formData.parts_replaced.map((part, index) => (
                          <div key={index} className="flex gap-2">
                            <Input
                              value={part}
                              onChange={(e) =>
                                handleArrayChange("parts_replaced", index, e.target.value)
                              }
                              placeholder="Part name or description..."
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeArrayItem("parts_replaced", index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Attachments & Additional Information Card */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Attachments & Additional Information
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add attachment URLs and any additional remarks
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Attachment URLs */}
                    <div className="space-y-4">
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
                      <div className="space-y-3">
                        {formData.attachment_urls.length === 0 ? (
                          <div className="text-center py-4 text-muted-foreground text-sm border-2 border-dashed border-gray-300 rounded-lg">
                            No attachment URLs. Click "Add URL" to add attachments.
                          </div>
                        ) : (
                          formData.attachment_urls.map((url, index) => (
                            <div key={index} className="flex gap-2">
                              <Input
                                value={url}
                                onChange={(e) =>
                                  handleArrayChange("attachment_urls", index, e.target.value)
                                }
                                placeholder="https://example.com/image.jpg"
                                type="url"
                                className="flex-1"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => removeArrayItem("attachment_urls", index)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="space-y-2">
                      <Label htmlFor="remarks">Additional Remarks</Label>
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
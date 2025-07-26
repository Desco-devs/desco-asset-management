"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertTriangle,
  FileText,
  MapPin,
  Save,
  Settings,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Types
export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber?: string;
  project: {
    uid: string;
    name: string;
    client: {
      uid: string;
      name: string;
      location: {
        uid: string;
        address: string;
      };
    };
  };
}

interface Location {
  uid: string;
  address: string;
}

export interface MaintenanceReport {
  uid: string;
  equipmentId: string;
  locationId: string;
  reportedBy: string;
  repairedBy?: string;
  issueDescription: string;
  remarks?: string;
  inspectionDetails?: string;
  actionTaken?: string;
  partsReplaced: string[];
  priority: "LOW" | "MEDIUM" | "HIGH";
  status: "REPORTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  downtimeHours?: string;
  dateReported: string;
  dateRepaired?: string;
  attachmentUrls: string[];
  equipment: Equipment;
  location: Location;
}

interface MaintenanceReportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  locations?: Location[];
  editReport?: MaintenanceReport | null;
  onReportSubmitted: () => void;
}

const MaintenanceReportModal = ({
  isOpen,
  onOpenChange,
  equipment,
  locations = [],
  editReport,
  onReportSubmitted,
}: MaintenanceReportModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    equipmentId: equipment?.uid || editReport?.equipmentId || "",
    locationId:
      editReport?.locationId || equipment?.project.client.location.uid || "",
    reportedBy: editReport?.reportedBy || user?.full_name || "",
    repairedBy: editReport?.repairedBy || "",
    issueDescription: editReport?.issueDescription || "",
    remarks: editReport?.remarks || "",
    inspectionDetails: editReport?.inspectionDetails || "",
    actionTaken: editReport?.actionTaken || "",
    partsReplaced: editReport?.partsReplaced?.join(", ") || "",
    priority: editReport?.priority || ("MEDIUM" as "LOW" | "MEDIUM" | "HIGH"),
    status:
      editReport?.status ||
      ("REPORTED" as "REPORTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"),
    downtimeHours: editReport?.downtimeHours || "",
    dateRepaired: editReport?.dateRepaired
      ? new Date(editReport.dateRepaired).toISOString().split("T")[0]
      : "",
  });

  // File handling
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<string[]>([]);
  const [attachmentsToKeep, setAttachmentsToKeep] = useState<boolean[]>([]);

  // Initialize existing attachments for edit mode
  useEffect(() => {
    if (editReport && editReport.attachmentUrls) {
      setExistingAttachments(editReport.attachmentUrls);
      setAttachmentsToKeep(
        new Array(editReport.attachmentUrls.length).fill(true)
      );
    }
  }, [editReport]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        equipmentId: equipment?.uid || editReport?.equipmentId || "",
        locationId:
          editReport?.locationId ||
          equipment?.project.client.location.uid ||
          "",
        reportedBy: editReport?.reportedBy || user?.full_name || "",
        repairedBy: editReport?.repairedBy || "",
        issueDescription: editReport?.issueDescription || "",
        remarks: editReport?.remarks || "",
        inspectionDetails: editReport?.inspectionDetails || "",
        actionTaken: editReport?.actionTaken || "",
        partsReplaced: editReport?.partsReplaced?.join(", ") || "",
        priority:
          editReport?.priority || ("MEDIUM" as "LOW" | "MEDIUM" | "HIGH"),
        status:
          editReport?.status ||
          ("REPORTED" as
            | "REPORTED"
            | "IN_PROGRESS"
            | "COMPLETED"
            | "CANCELLED"),
        downtimeHours: editReport?.downtimeHours || "",
        dateRepaired: editReport?.dateRepaired
          ? new Date(editReport.dateRepaired).toISOString().split("T")[0]
          : "",
      });
      setAttachmentFiles([]);
    }
  }, [isOpen, equipment, editReport, user]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachmentFiles((prev) => [...prev, ...files]);
  };

  const removeAttachmentFile = (index: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingAttachment = (index: number) => {
    setAttachmentsToKeep((prev) => {
      const newKeep = [...prev];
      newKeep[index] = false;
      return newKeep;
    });
  };

  const restoreExistingAttachment = (index: number) => {
    setAttachmentsToKeep((prev) => {
      const newKeep = [...prev];
      newKeep[index] = true;
      return newKeep;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REPORTED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.equipmentId ||
      !formData.locationId ||
      !formData.reportedBy ||
      !formData.issueDescription
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const submitFormData = new FormData();

      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value) {
          submitFormData.append(key, value);
        }
      });

      // Add new attachment files
      attachmentFiles.forEach((file, index) => {
        submitFormData.append(`attachment_${index}`, file);
      });

      // For edit mode, add keep existing attachment flags
      if (editReport) {
        submitFormData.append("reportId", editReport.uid);
        attachmentsToKeep.forEach((keep, index) => {
          if (keep) {
            submitFormData.append(`keepExistingAttachment_${index}`, "true");
          }
        });
      }

      const apiUrl = editReport
        ? "/api/maintenance-reports/update"
        : "/api/maintenance-reports/create";
      const method = editReport ? "PUT" : "POST";

      const response = await fetch(apiUrl, {
        method,
        body: submitFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${editReport ? "update" : "create"} maintenance report`
        );
      }

      await response.json();

      toast.success(
        `Maintenance report ${editReport ? "updated" : "created"} successfully!`
      );
      onReportSubmitted();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        `Failed to ${editReport ? "update" : "create"} maintenance report: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const triggerSubmit = () => {
    const form = document.querySelector("form") as HTMLFormElement;
    if (form) {
      form.requestSubmit();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col"
        style={{
          maxWidth: "800px",
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {editReport
              ? "Edit Maintenance Report"
              : "Create Maintenance Report"}
          </DialogTitle>
          <DialogDescription>
            {editReport
              ? "Update the maintenance report details below"
              : "Report an issue or maintenance activity for equipment"}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 overflow-y-auto scroll-none"
        >
          {/* Equipment and Location Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4  rounded-lg">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Equipment</Label>
              <div className="flex items-center gap-2 text-sm">
                <Settings className="h-4 w-4" />
                <span className="font-medium">
                  {equipment?.brand} {equipment?.model}{" "}
                  {equipment?.plateNumber && `(${equipment.plateNumber})`}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Type: {equipment?.type} • Project: {equipment?.project.name}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationId">Location *</Label>
              <Select
                value={formData.locationId}
                onValueChange={(value) =>
                  handleInputChange("locationId", value)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.uid} value={location.uid}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {location.address}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reporter and Repairer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportedBy">Reported By *</Label>
              <Input
                id="reportedBy"
                value={formData.reportedBy}
                onChange={(e) =>
                  handleInputChange("reportedBy", e.target.value)
                }
                placeholder="Enter reporter name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="repairedBy">Repaired/Assigned To</Label>
              <Input
                id="repairedBy"
                value={formData.repairedBy}
                onChange={(e) =>
                  handleInputChange("repairedBy", e.target.value)
                }
                placeholder="Enter repairer name"
              />
            </div>
          </div>

          {/* Issue Description */}
          <div className="space-y-2">
            <Label htmlFor="issueDescription">Issue Description *</Label>
            <Textarea
              id="issueDescription"
              value={formData.issueDescription}
              onChange={(e) =>
                handleInputChange("issueDescription", e.target.value)
              }
              placeholder="Describe the issue or maintenance activity..."
              className="min-h-[100px]"
              required
            />
          </div>

          {/* Priority and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => handleInputChange("priority", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">
                    <Badge className={getPriorityColor("LOW")}>Low</Badge>
                  </SelectItem>
                  <SelectItem value="MEDIUM">
                    <Badge className={getPriorityColor("MEDIUM")}>Medium</Badge>
                  </SelectItem>
                  <SelectItem value="HIGH">
                    <Badge className={getPriorityColor("HIGH")}>High</Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPORTED">
                    <Badge className={getStatusColor("REPORTED")}>
                      Reported
                    </Badge>
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    <Badge className={getStatusColor("IN_PROGRESS")}>
                      In Progress
                    </Badge>
                  </SelectItem>
                  <SelectItem value="COMPLETED">
                    <Badge className={getStatusColor("COMPLETED")}>
                      Completed
                    </Badge>
                  </SelectItem>
                  <SelectItem value="CANCELLED">
                    <Badge className={getStatusColor("CANCELLED")}>
                      Cancelled
                    </Badge>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inspectionDetails">Inspection Details</Label>
              <Textarea
                id="inspectionDetails"
                value={formData.inspectionDetails}
                onChange={(e) =>
                  handleInputChange("inspectionDetails", e.target.value)
                }
                placeholder="Inspection findings..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <Textarea
                id="actionTaken"
                value={formData.actionTaken}
                onChange={(e) =>
                  handleInputChange("actionTaken", e.target.value)
                }
                placeholder="Actions taken to resolve the issue..."
                className="min-h-[80px]"
              />
            </div>
          </div>

          {/* Parts and Timing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="partsReplaced">Parts Replaced</Label>
              <Input
                id="partsReplaced"
                value={formData.partsReplaced}
                onChange={(e) =>
                  handleInputChange("partsReplaced", e.target.value)
                }
                placeholder="part1, part2, part3..."
              />
              <div className="text-xs text-muted-foreground">
                Separate multiple parts with commas
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downtimeHours">Downtime Hours</Label>
              <Input
                id="downtimeHours"
                value={formData.downtimeHours}
                onChange={(e) =>
                  handleInputChange("downtimeHours", e.target.value)
                }
                placeholder="e.g., 2.5"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateRepaired">Date Repaired</Label>
              <Input
                id="dateRepaired"
                type="date"
                value={formData.dateRepaired}
                onChange={(e) =>
                  handleInputChange("dateRepaired", e.target.value)
                }
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => handleInputChange("remarks", e.target.value)}
              placeholder="Additional notes or remarks..."
              className="min-h-[60px]"
            />
          </div>

          {/* Existing Attachments (Edit Mode) */}
          {editReport && existingAttachments.length > 0 && (
            <div className="space-y-2">
              <Label>Existing Attachments</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {existingAttachments.map((url, index) => (
                  <div
                    key={index}
                    className={`relative border rounded-lg p-2 ${
                      attachmentsToKeep[index]
                        ? "border-gray-200"
                        : "border-red-200 bg-red-50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm truncate">
                        Attachment {index + 1}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(url, "_blank")}
                        className="text-xs"
                      >
                        View
                      </Button>
                      {attachmentsToKeep[index] ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => removeExistingAttachment(index)}
                          className="text-xs"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => restoreExistingAttachment(index)}
                          className="text-xs"
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Attachments */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="attachments">Add Attachments</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                />
                <Upload className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* New Attachment Preview */}
            {attachmentFiles.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {attachmentFiles.map((file, index) => (
                  <div key={index} className="relative border rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removeAttachmentFile(index)}
                      className="absolute top-1 right-1 h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={triggerSubmit} type="submit" disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                {editReport ? "Updating..." : "Creating..."}
              </div>
            ) : (
              <div className="flex items-center gap-2 dark:text-accent-foreground">
                <Save className="h-4 w-4" />
                {editReport ? "Update Report" : "Create Report"}
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MaintenanceReportModal;

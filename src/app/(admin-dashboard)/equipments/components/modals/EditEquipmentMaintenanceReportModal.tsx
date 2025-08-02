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
import {
  useUpdateEquipmentMaintenanceReport,
  useEquipments,
} from "@/hooks/useEquipmentQuery";
import { useProjects } from "@/hooks/api/use-projects";
import { useEquipmentStore, selectActiveModal } from "@/stores/equipmentStore";
import { Plus, Trash2, Settings, Clock, MapPin, Wrench, FileText, Camera, Upload, X, Package, ClipboardCheck, ImageIcon, Loader2, LinkIcon } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import { toast } from "sonner";

export default function EditEquipmentMaintenanceReportModal() {
  const selectedReport = useEquipmentStore((state) => state.selectedEquipmentMaintenanceReport);
  const activeModal = useEquipmentStore(selectActiveModal);
  const { setSelectedEquipmentMaintenanceReport } = useEquipmentStore();
  const { setActiveModal } = useEquipmentStore();
  // Server state from TanStack Query (standardized approach)
  const { data: equipments = [] } = useEquipments();
  const { data: projects = [] } = useProjects();
  // Extract locations from projects for backward compatibility
  // Handle different return types from useProjects
  const projectsArray = Array.isArray(projects) ? projects : (projects?.data || []);
  const locations = projectsArray
    .map(p => p.client?.location)
    .filter((location): location is NonNullable<typeof location> => Boolean(location));
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
  const [localAttachmentFiles, setLocalAttachmentFiles] = useState<File[]>([]);
  const [deletedAttachments, setDeletedAttachments] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'parts' | 'attachments'>('details');

  // Populate form when selectedReport changes
  useEffect(() => {
    if (selectedReport) {
      const partsReplaced = selectedReport.parts_replaced?.length > 0 
        ? selectedReport.parts_replaced.filter((part: string) => part.trim() !== "") 
        : [];
      const attachmentUrls = selectedReport.attachment_urls?.length > 0 
        ? selectedReport.attachment_urls.filter((url: string) => url.trim() !== "") 
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
    setLocalAttachmentFiles([]);
    setDeletedAttachments([]);
    setActiveTab('details');
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

  // Stable tab change handler
  const handleTabChange = useCallback((tab: 'details' | 'parts' | 'attachments') => {
    setActiveTab(tab);
  }, []);

  const addPartReplaced = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      parts_replaced: [...prev.parts_replaced, ""],
    }));
  }, []);

  const removePartReplaced = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      parts_replaced: prev.parts_replaced.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    console.log('🔧 handleSubmit called');
    console.log('📋 selectedReport:', selectedReport);
    console.log('🔑 selectedReport keys:', selectedReport ? Object.keys(selectedReport) : 'null');
    
    if (!selectedReport) {
      console.error('❌ No selectedReport found');
      toast.error("No report selected");
      return;
    }

    // Try to extract the ID from different possible locations
    const reportId = selectedReport.id || selectedReport.uid || selectedReport._id;
    console.log('🆔 selectedReport.id:', selectedReport.id);
    console.log('🔍 typeof selectedReport.id:', typeof selectedReport.id);
    console.log('🎯 Extracted reportId:', reportId);
    console.log('📊 Full selectedReport object:', JSON.stringify(selectedReport, null, 2));

    if (!reportId) {
      console.error('❌ No valid report ID found in selectedReport');
      toast.error("Invalid report data - missing ID");
      return;
    }

    if (!formData.issue_description.trim()) {
      toast.error("Issue description is required");
      return;
    }

    // Filter out empty values from arrays
    const filteredPartsReplaced = formData.parts_replaced.filter(
      (part) => part.trim() !== ""
    );
    
    // Filter out deleted attachments and empty URLs
    const filteredAttachmentUrls = formData.attachment_urls.filter(
      (url) => url.trim() !== "" && !deletedAttachments.includes(url)
    );

    try {
      // Create FormData for file uploads and data
      const formDataToSend = new FormData();
      
      // Add the report ID for the mutation
      formDataToSend.append('reportId', reportId);
      
      // Add basic form fields
      formDataToSend.append('equipment_id', selectedReport.equipment_id);
      formDataToSend.append('location_id', formData.location_id || '');
      formDataToSend.append('issue_description', formData.issue_description);
      formDataToSend.append('remarks', formData.remarks || '');
      formDataToSend.append('inspection_details', formData.inspection_details || '');
      formDataToSend.append('action_taken', formData.action_taken || '');
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('downtime_hours', formData.downtime_hours || '');
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
      localAttachmentFiles.forEach((file, index) => {
        if (file) {
          formDataToSend.append(`attachment_${index}`, file);
        }
      });

      console.log('Sending update request for report:', reportId);
      
      // Use TanStack Query mutation for consistent data management
      const updatedReport = await updateMaintenanceReportMutation.mutateAsync(formDataToSend);
      console.log('Update successful:', updatedReport);
      
      toast.success("Equipment maintenance report updated successfully");
      handleClose();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update maintenance report");
    }
  }, [formData, selectedReport, updateMaintenanceReportMutation, handleClose, localAttachmentFiles, deletedAttachments]);

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
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="space-y-4">
            {/* Tab Navigation - Always Horizontal */}
            <div className="border-b mb-4">
              <div className="flex gap-0 justify-center">
                <button
                  type="button"
                  onClick={() => handleTabChange('details')}
                  className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'details'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Report Details
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('parts')}
                  className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'parts'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  Parts Replaced
                </button>
                <button
                  type="button"
                  onClick={() => handleTabChange('attachments')}
                  className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
                    activeTab === 'attachments'
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  Attachments & Images
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-4 border-t pt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ClipboardCheck className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Report Information</span>
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Update maintenance report details and priority
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4 grid-cols-1">
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
                          rows={3}
                          className="resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="inspection_details">Inspection Details</Label>
                        <Textarea
                          id="inspection_details"
                          value={formData.inspection_details}
                          onChange={(e) => handleInputChange("inspection_details", e.target.value)}
                          rows={3}
                          placeholder="Detail the inspection findings..."
                          className="resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    
                    <div className="grid gap-4 grid-cols-1">
                      <div className="space-y-2">
                        <Label htmlFor="action_taken">Action Taken</Label>
                        <Textarea
                          id="action_taken"
                          value={formData.action_taken}
                          onChange={(e) => handleInputChange("action_taken", e.target.value)}
                          rows={3}
                          placeholder="Describe the action taken or repairs made..."
                          className="resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="remarks">Additional Remarks</Label>
                        <Textarea
                          id="remarks"
                          value={formData.remarks}
                          onChange={(e) => handleInputChange("remarks", e.target.value)}
                          rows={3}
                          placeholder="Any additional notes or observations..."
                          className="resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
                          <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LOW">Low</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HIGH">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                          <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="REPORTED">Reported</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="downtime_hours">Downtime (Hours)</Label>
                        <Input
                          id="downtime_hours"
                          type="number"
                          min="0"
                          step="0.1"
                          value={formData.downtime_hours}
                          onChange={(e) => handleInputChange("downtime_hours", e.target.value)}
                          placeholder="0.0"
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Select value={formData.location_id} onValueChange={(value) => handleInputChange("location_id", value)}>
                        <SelectTrigger className="w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500">
                          <SelectValue placeholder="Select location..." />
                        </SelectTrigger>
                        <SelectContent>
                          {locations.map((location) => (
                            <SelectItem key={location.id} value={location.id}>
                              {location.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Parts Replaced Tab */}
            {activeTab === 'parts' && (
              <div className="space-y-4 border-t pt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Parts Replaced</span>
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      List the names and descriptions of parts that were replaced during maintenance
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.parts_replaced.map((part, index) => {
                      return (
                        <div key={`part-input-${index}`} className="border rounded-lg">
                          <div className="flex items-center justify-between p-3 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                Part {index + 1}
                                {part && ` - ${part.slice(0, 30)}${part.length > 30 ? '...' : ''}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {formData.parts_replaced.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removePartReplaced(index)}
                                  className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className="space-y-3 border-t p-4">
                            <Input
                              value={part}
                              onChange={(e) => {
                                const value = e.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  parts_replaced: prev.parts_replaced.map((item, i) => 
                                    i === index ? value : item
                                  )
                                }));
                              }}
                              placeholder="Part name or description..."
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addPartReplaced}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Another Part
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Attachments & Images Tab */}
            {activeTab === 'attachments' && (
              <div className="space-y-4 border-t pt-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ImageIcon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">Attachments & Images</span>
                    </CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Upload photos and documents related to this maintenance work.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Existing Attachments */}
                    {formData.attachment_urls.map((attachmentUrl, index) => {
                      if (!attachmentUrl || deletedAttachments.includes(attachmentUrl)) return null;
                      
                      const fileName = attachmentUrl.split('/').pop() || `Attachment ${index + 1}`;
                      
                      return (
                        <div key={`existing-attachment-${attachmentUrl}-${index}`} className="border rounded-lg">
                          <div className="flex items-center justify-between p-3 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {fileName.slice(0, 30)}{fileName.length > 30 ? '...' : ''}
                              </span>
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                existing
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setDeletedAttachments(prev => [...prev, attachmentUrl]);
                              }}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-3 border-t p-4">
                            <FileUploadSectionSimple
                              label={fileName}
                              accept="image/*,application/pdf,.doc,.docx"
                              onFileChange={() => {}}
                              onKeepExistingChange={() => {}}
                              selectedFile={null}
                              currentFileUrl={attachmentUrl}
                              required={false}
                              readOnly={true}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* New Attachment Files */}
                    {localAttachmentFiles.map((file, index) => {
                      return (
                        <div key={`new-attachment-${file.name}-${index}-${Date.now()}`} className="border rounded-lg">
                          <div className="flex items-center justify-between p-3 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {file.name.slice(0, 30)}{file.name.length > 30 ? '...' : ''}
                              </span>
                              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                new
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setLocalAttachmentFiles(prev => {
                                  const newFiles = [...prev];
                                  newFiles.splice(index, 1);
                                  return newFiles;
                                });
                              }}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="space-y-3 border-t p-4">
                            <FileUploadSectionSimple
                              label={file.name}
                              accept="image/*,application/pdf,.doc,.docx"
                              onFileChange={(newFile) => {
                                setLocalAttachmentFiles(prev => {
                                  const newFiles = [...prev];
                                  if (newFile) {
                                    newFiles[index] = newFile;
                                  } else {
                                    newFiles.splice(index, 1);
                                  }
                                  return newFiles;
                                });
                              }}
                              onKeepExistingChange={() => {}}
                              selectedFile={file}
                              currentFileUrl={null}
                              required={false}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Another Attachment Button */}
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          // Create empty file input for new attachment
                          const newFileInput = document.createElement('input');
                          newFileInput.type = 'file';
                          newFileInput.accept = 'image/*,application/pdf,.doc,.docx';
                          newFileInput.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              setLocalAttachmentFiles(prev => [...prev, file]);
                            }
                          };
                          newFileInput.click();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Another Attachment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
        
        {/* Desktop Action Buttons in Footer */}
        <DialogFooter className="pt-4 border-t bg-background">
          <div className="flex gap-2 w-full justify-end">
            <Button type="button" variant="outline" onClick={handleClose} size="lg">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={updateMaintenanceReportMutation.isPending}
              size="lg"
            >
              {updateMaintenanceReportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Report...
                </>
              ) : (
                "Update Report"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
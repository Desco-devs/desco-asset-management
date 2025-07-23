"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
  useCreateEquipmentMaintenanceReport,
  useEquipmentsWithReferenceData,
} from "@/hooks/useEquipmentsQuery";
import { useEquipmentsStore, selectIsMobile } from "@/stores/equipmentsStore";
import { Plus, Trash2, X, Settings, Camera, FileText, Upload, MapPin, Calendar, Clock, Wrench } from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

interface CreateEquipmentMaintenanceReportModalProps {
  equipmentId: string;
}

export default function CreateEquipmentMaintenanceReportModal({
  equipmentId,
}: CreateEquipmentMaintenanceReportModalProps) {
  // State from Zustand (following proper Next.js pattern)
  const isOpen = useEquipmentsStore((state) => state.isEquipmentMaintenanceModalOpen);
  const isMobile = useEquipmentsStore(selectIsMobile);
  const { setIsEquipmentMaintenanceModalOpen, setIsModalOpen } = useEquipmentsStore();

  // Server state from TanStack Query
  const { locations } = useEquipmentsWithReferenceData();
  const createMaintenanceReportMutation = useCreateEquipmentMaintenanceReport();

  // Local form state (client state)
  const [activeTab, setActiveTab] = useState<'details' | 'parts' | 'attachments'>('details');
  
  // Stable tab change handler
  const handleTabChange = useCallback((tab: 'details' | 'parts' | 'attachments') => {
    setActiveTab(tab);
  }, []);
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

  // Stable event handlers using useCallback (proper Next.js pattern)
  const handleClose = useCallback(() => {
    setIsEquipmentMaintenanceModalOpen(false);
    // Reset form state
    setActiveTab('details');
    setPartsFiles([]);
    setAttachmentFiles([]);
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
    // Return to detail drawer
    setIsModalOpen(true);
  }, [setIsEquipmentMaintenanceModalOpen, setIsModalOpen]);

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

    if (!formData.issue_description.trim()) {
      toast.error("Issue description is required");
      return;
    }

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
  }, [formData, equipmentId, createMaintenanceReportMutation, handleClose]);

  // Stable tab button renderer
  const renderTabButton = useCallback((tab: 'details' | 'parts' | 'attachments', label: string, icon: React.ReactNode) => (
    <Button
      type="button"
      variant={activeTab === tab ? 'default' : 'ghost'}
      size="sm"
      onClick={() => handleTabChange(tab)}
      className="flex-1 flex items-center gap-2"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  ), [activeTab, handleTabChange]);

  if (!isOpen) return null;

  // Mobile: Drawer pattern
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="!max-h-[95vh]">
          <DrawerHeader className="p-4 pb-4 flex-shrink-0 border-b relative">
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 rounded-full h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="text-xl font-bold">
              Create Equipment Maintenance Report
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="grid grid-cols-3 bg-muted rounded-md p-1">
                {renderTabButton('details', 'Details', <Settings className="h-4 w-4" />)}
                {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />)}
                {renderTabButton('attachments', 'Images', <Camera className="h-4 w-4" />)}
              </div>

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Issue Information */}
                  <Card>
                    <CardHeader className="pb-6">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Issue Information
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Describe the maintenance issue or task details
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="issue_description">Issue Description *</Label>
                        <Textarea
                          id="issue_description"
                          value={formData.issue_description}
                          onChange={(e) => handleInputChange("issue_description", e.target.value)}
                          placeholder="Describe the issue or maintenance required..."
                          className="min-h-[100px]"
                        />
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="priority" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Priority
                          </Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => handleInputChange("priority", value)}
                          >
                            <SelectTrigger className="w-full">
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
                            <SelectTrigger className="w-full">
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
                          onChange={(e) => handleInputChange("downtime_hours", e.target.value)}
                          placeholder="0.0"
                          className="w-full"
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
                          <SelectTrigger className="w-full">
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
                    </CardContent>
                  </Card>

                  {/* Technical Details */}
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wrench className="h-4 w-4" />
                        Technical Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inspection_details">Inspection Details</Label>
                        <Textarea
                          id="inspection_details"
                          value={formData.inspection_details}
                          onChange={(e) => handleInputChange("inspection_details", e.target.value)}
                          placeholder="Describe the inspection findings..."
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="action_taken">Action Taken</Label>
                        <Textarea
                          id="action_taken"
                          value={formData.action_taken}
                          onChange={(e) => handleInputChange("action_taken", e.target.value)}
                          placeholder="Describe the actions taken..."
                          className="min-h-[80px]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="remarks">Additional Remarks</Label>
                        <Textarea
                          id="remarks"
                          value={formData.remarks}
                          onChange={(e) => handleInputChange("remarks", e.target.value)}
                          placeholder="Additional remarks or notes..."
                          className="min-h-[80px]"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Parts Tab */}
              {activeTab === 'parts' && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Parts Replaced
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload images and details of parts that were replaced during maintenance
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {formData.parts_replaced.map((part, index) => (
                      <div key={index} className="space-y-2">
                        <FileUploadSectionSimple
                          label={`Part ${index + 1} Image`}
                          accept="image/*"
                          onFileChange={(file) => {
                            const newFiles = [...partsFiles];
                            if (file) {
                              newFiles[index] = file;
                            } else {
                              newFiles.splice(index, 1);
                            }
                            setPartsFiles(newFiles);
                          }}
                          onKeepExistingChange={() => {}}
                          required={false}
                        />
                        <div className="flex gap-2">
                          <Input
                            value={part}
                            onChange={(e) => handleArrayChange("parts_replaced", index, e.target.value)}
                            placeholder="Part name or description..."
                            className="flex-1"
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
                      </div>
                    ))}
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem("parts_replaced")}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Another Part
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Attachments & Images
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Upload additional images, documents, or reference materials for this maintenance report
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {formData.attachment_urls.map((url, index) => (
                      <div key={index} className="space-y-2">
                        <FileUploadSectionSimple
                          label={`Attachment ${index + 1}`}
                          accept="image/*,application/pdf,.doc,.docx"
                          onFileChange={(file) => {
                            const newFiles = [...attachmentFiles];
                            if (file) {
                              newFiles[index] = file;
                            } else {
                              newFiles.splice(index, 1);
                            }
                            setAttachmentFiles(newFiles);
                          }}
                          onKeepExistingChange={() => {}}
                          required={false}
                        />
                        <div className="flex gap-2">
                          <Input
                            value={url}
                            onChange={(e) => handleArrayChange("attachment_urls", index, e.target.value)}
                            placeholder="Or enter URL: https://example.com/image.jpg"
                            type="url"
                            className="flex-1"
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
                      </div>
                    ))}
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => addArrayItem("attachment_urls")}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add Another Attachment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          <DrawerFooter className="p-4 pt-2 border-t bg-background">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={createMaintenanceReportMutation.isPending}
                className="flex-1"
              >
                {createMaintenanceReportMutation.isPending ? "Creating..." : "Create Report"}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog pattern
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Equipment Maintenance Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Tab Navigation - Desktop Style */}
          <div className="flex justify-center border-b">
            <button
              type="button"
              onClick={() => handleTabChange('details')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'details'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Settings className="h-4 w-4" />
              Report Details
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('parts')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'parts'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Wrench className="h-4 w-4" />
              Parts Replaced
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('attachments')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'attachments'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <Camera className="h-4 w-4" />
              Attachments & Images
            </button>
          </div>

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Issue Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="issue_description">Issue Description *</Label>
                  <Textarea
                    id="issue_description"
                    value={formData.issue_description}
                    onChange={(e) => handleInputChange("issue_description", e.target.value)}
                    placeholder="Describe the issue or maintenance required..."
                    className="min-h-[100px]"
                  />
                </div>

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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="downtime_hours">Downtime Hours</Label>
                    <Input
                      id="downtime_hours"
                      type="number"
                      step="0.1"
                      value={formData.downtime_hours}
                      onChange={(e) => handleInputChange("downtime_hours", e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="inspection_details">Inspection Details</Label>
                  <Textarea
                    id="inspection_details"
                    value={formData.inspection_details}
                    onChange={(e) => handleInputChange("inspection_details", e.target.value)}
                    placeholder="Describe the inspection findings..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="action_taken">Action Taken</Label>
                  <Textarea
                    id="action_taken"
                    value={formData.action_taken}
                    onChange={(e) => handleInputChange("action_taken", e.target.value)}
                    placeholder="Describe the actions taken..."
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="remarks">Additional Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={formData.remarks}
                    onChange={(e) => handleInputChange("remarks", e.target.value)}
                    placeholder="Additional remarks or notes..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Parts Tab */}
          {activeTab === 'parts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Parts Replaced
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload images and details of parts that were replaced during maintenance
                </p>
              </div>
              {formData.parts_replaced.map((part, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <FileUploadSectionSimple
                    label={`Part ${index + 1} Image`}
                    accept="image/*"
                    onFileChange={(file) => {
                      const newFiles = [...partsFiles];
                      if (file) {
                        newFiles[index] = file;
                      } else {
                        newFiles.splice(index, 1);
                      }
                      setPartsFiles(newFiles);
                    }}
                    onKeepExistingChange={() => {}}
                    required={false}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={part}
                      onChange={(e) => handleArrayChange("parts_replaced", index, e.target.value)}
                      placeholder="Part name or description..."
                      className="flex-1"
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
                </div>
              ))}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addArrayItem("parts_replaced")}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Part
                </Button>
              </div>
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Attachments & Images
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload additional images, documents, or reference materials for this maintenance report
                </p>
              </div>
              {formData.attachment_urls.map((url, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <FileUploadSectionSimple
                    label={`Attachment ${index + 1}`}
                    accept="image/*,application/pdf,.doc,.docx"
                    onFileChange={(file) => {
                      const newFiles = [...attachmentFiles];
                      if (file) {
                        newFiles[index] = file;
                      } else {
                        newFiles.splice(index, 1);
                      }
                      setAttachmentFiles(newFiles);
                    }}
                    onKeepExistingChange={() => {}}
                    required={false}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => handleArrayChange("attachment_urls", index, e.target.value)}
                      placeholder="Or enter URL: https://example.com/image.jpg"
                      type="url"
                      className="flex-1"
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
                </div>
              ))}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => addArrayItem("attachment_urls")}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Another Attachment
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createMaintenanceReportMutation.isPending}
            >
              {createMaintenanceReportMutation.isPending ? "Creating..." : "Create Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
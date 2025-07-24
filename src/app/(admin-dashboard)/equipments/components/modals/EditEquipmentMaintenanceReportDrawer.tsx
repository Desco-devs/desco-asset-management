"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
  useUpdateEquipmentMaintenanceReport,
  useEquipmentsWithReferenceData,
} from "@/hooks/useEquipmentsQuery";
import { useEquipmentsStore, selectIsMobile } from "@/stores/equipmentsStore";
import { Plus, Trash2, X, Settings, Camera, FileText, Upload, MapPin, Calendar, Clock, Wrench, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";

export default function EditEquipmentMaintenanceReportDrawer() {
  // State from Zustand
  const isOpen = useEquipmentsStore((state) => state.isEditMaintenanceReportDrawerOpen);
  const isMobile = useEquipmentsStore(selectIsMobile);
  const selectedReport = useEquipmentsStore((state) => state.selectedMaintenanceReportForEdit);
  const { 
    setIsEditMaintenanceReportDrawerOpen, 
    setSelectedMaintenanceReportForEdit,
    setIsMaintenanceReportDetailOpen,
    setSelectedMaintenanceReportForDetail,
    setIsModalOpen
  } = useEquipmentsStore();

  // Server state from TanStack Query
  const { locations } = useEquipmentsWithReferenceData();
  const updateMaintenanceReportMutation = useUpdateEquipmentMaintenanceReport();

  // Local form state
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
  const [removedPartImages, setRemovedPartImages] = useState<number[]>([]);
  const [removedAttachments, setRemovedAttachments] = useState<number[]>([]);

  // Populate form data when selectedReport changes
  useEffect(() => {
    if (selectedReport) {
      console.log('🔍 Populating form with selectedReport:', selectedReport);
      console.log('📍 Available locations:', locations);
      
      // Find the location to verify it exists
      const selectedLocation = locations.find(loc => loc.uid === selectedReport.location_id);
      console.log('🔍 Selected location found:', selectedLocation);
      
      setFormData({
        issue_description: selectedReport.issue_description || "",
        remarks: selectedReport.remarks || "",
        inspection_details: selectedReport.inspection_details || "",
        action_taken: selectedReport.action_taken || "",
        priority: selectedReport.priority || "MEDIUM",
        status: selectedReport.status || "REPORTED",
        downtime_hours: selectedReport.downtime_hours?.toString() || "",
        location_id: selectedReport.location_id || "",
        parts_replaced: selectedReport.parts_replaced && selectedReport.parts_replaced.length > 0 
          ? selectedReport.parts_replaced.filter(part => part && part.trim() !== "")
          : [],
        attachment_urls: selectedReport.attachment_urls && selectedReport.attachment_urls.length > 0 
          ? selectedReport.attachment_urls.filter(url => url && url.trim() !== "")
          : [],
      });
      
      console.log('📝 Form data populated:', {
        location_id: selectedReport.location_id,
        location_exists: !!selectedLocation,
        parts_replaced: selectedReport.parts_replaced,
        attachment_urls: selectedReport.attachment_urls
      });
    }
  }, [selectedReport, locations]);

  // Stable event handlers using useCallback
  const handleClose = useCallback(() => {
    setIsEditMaintenanceReportDrawerOpen(false);
    const reportToReturn = selectedReport; // Store before clearing
    setSelectedMaintenanceReportForEdit(null);
    // Reset form state
    setActiveTab('details');
    setPartsFiles([]);
    setAttachmentFiles([]);
    setRemovedPartImages([]);
    setRemovedAttachments([]);
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
    // Reopen maintenance report detail drawer (user came from there)
    if (reportToReturn) {
      setSelectedMaintenanceReportForDetail(reportToReturn);
      setIsMaintenanceReportDetailOpen(true);
    } else {
      // Fallback to equipment modal if no report
      setIsModalOpen(true);
    }
  }, [setIsEditMaintenanceReportDrawerOpen, selectedReport, setSelectedMaintenanceReportForDetail, setIsMaintenanceReportDetailOpen, setIsModalOpen]);

  const handleSaveAndViewDetails = useCallback((updatedReport?: any) => {
    // Use the updated report if provided, otherwise use selected report
    const reportToShow = updatedReport || selectedReport;
    if (reportToShow) {
      // Set the updated report for detail view
      setSelectedMaintenanceReportForDetail(reportToShow);
      setIsMaintenanceReportDetailOpen(true);
      // Close edit drawer (this will also close equipment modal via handleClose)
      setIsEditMaintenanceReportDrawerOpen(false);
      setSelectedMaintenanceReportForEdit(null);
      // Reset form state
      setActiveTab('details');
      setPartsFiles([]);
      setAttachmentFiles([]);
      setRemovedPartImages([]);
      setRemovedAttachments([]);
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
      // Equipment modal stays closed since we're opening detail drawer
      // (Detail drawer will handle reopening equipment modal when it closes)
    }
  }, [selectedReport, setSelectedMaintenanceReportForDetail, setIsMaintenanceReportDetailOpen, setIsEditMaintenanceReportDrawerOpen, setSelectedMaintenanceReportForEdit, setPartsFiles, setAttachmentFiles, setFormData, setActiveTab]);

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



  // File upload helper function  
  const uploadFileToSupabase = useCallback(async (file: File, prefix: string): Promise<string> => {
    const supabase = createClient();
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `${prefix}_${timestamp}.${ext}`;
    
    // Create a simple folder structure for maintenance reports
    const equipmentId = selectedReport?.equipment_id || 'unknown';
    const filepath = `equipments/maintenance-reports/${equipmentId}/${filename}`;
    
    const buffer = await file.arrayBuffer();
    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('equipments')
      .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

    if (uploadErr || !uploadData) {
      throw new Error(`Upload failed: ${uploadErr?.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('equipments')
      .getPublicUrl(uploadData.path);

    return urlData.publicUrl;
  }, [selectedReport?.equipment_id]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedReport) {
      toast.error("No report selected for editing");
      return;
    }

    if (!formData.issue_description.trim()) {
      toast.error("Issue description is required");
      return;
    }


    try {
      // Step 1: Upload new files first
      const uploadedUrls: string[] = [...formData.attachment_urls];
      
      // Upload parts files and replace URLs
      for (let i = 0; i < partsFiles.length; i++) {
        const file = partsFiles[i];
        if (file) {
          try {
            const uploadedUrl = await uploadFileToSupabase(file, `part_${i}`);
            uploadedUrls[i] = uploadedUrl;
          } catch (uploadError) {
            console.error(`Error uploading part ${i + 1} image:`, uploadError);
            toast.error(`Failed to upload part ${i + 1} image`);
            return; // Stop if upload fails
          }
        }
      }

      // Upload attachment files
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        if (file) {
          try {
            const uploadedUrl = await uploadFileToSupabase(file, `attachment_${i}`);
            // Find the next available slot or append
            const attachmentIndex = partsFiles.length + i;
            uploadedUrls[attachmentIndex] = uploadedUrl;
          } catch (uploadError) {
            console.error(`Error uploading attachment ${i + 1}:`, uploadError);
            toast.error(`Failed to upload attachment ${i + 1}`);
            return; // Stop if upload fails
          }
        }
      }

      // Step 2: Filter out empty parts, removed images, and attachment URLs
      const filteredPartsReplaced = formData.parts_replaced.filter(
        (part, index) => part.trim() !== "" && !removedPartImages.includes(index)
      );
      
      // Filter attachment URLs, excluding removed ones
      const filteredAttachmentUrls = uploadedUrls.filter(
        (url, index) => url && url.trim() !== "" && !removedAttachments.includes(index)
      );

      // Step 3: Update the maintenance report with new data
      const reportData = {
        id: selectedReport.id,
        equipment_id: selectedReport.equipment_id,
        issue_description: formData.issue_description,
        remarks: formData.remarks || undefined,
        inspection_details: formData.inspection_details || undefined,
        action_taken: formData.action_taken || undefined,
        priority: formData.priority,
        status: formData.status,
        downtime_hours: formData.downtime_hours || undefined,
        // location_id is required in schema, fallback to existing value if empty
        location_id: formData.location_id || selectedReport.location_id,
        parts_replaced: filteredPartsReplaced,
        attachment_urls: filteredAttachmentUrls,
        date_repaired: formData.status === "COMPLETED" && !selectedReport.date_repaired 
          ? new Date().toISOString() 
          : selectedReport.date_repaired,
      };

      // Debug: Log the data being sent
      console.log("Sending report data with uploaded URLs:", reportData);

      const updatedReport = await updateMaintenanceReportMutation.mutateAsync(reportData);
      handleSaveAndViewDetails(updatedReport);
    } catch (error) {
      console.error("Error updating maintenance report:", error);
      toast.error("Failed to update maintenance report");
    }
  }, [formData, selectedReport, updateMaintenanceReportMutation, handleSaveAndViewDetails, partsFiles, attachmentFiles, uploadFileToSupabase]);


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

  if (!isOpen || !selectedReport) return null;

  // Mobile: Drawer pattern
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={handleClose}>
        <DrawerContent className="!max-h-[95dvh]">
          <DrawerHeader className="p-4 pb-4 flex-shrink-0 border-b relative">
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="absolute right-4 top-4 rounded-full h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
            <DrawerTitle className="text-xl font-bold">
              Edit Maintenance Report
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
                        Update the maintenance issue or task details
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
                      Update images and details of parts that were replaced during maintenance
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {formData.parts_replaced.map((part, index) => (
                      <div key={index} className="space-y-2">
                        <FileUploadSectionSimple
                          label={`Part ${index + 1} Image`}
                          accept="image/*"
                          currentFileUrl={removedPartImages.includes(index) ? null : (selectedReport?.attachment_urls?.[index] || null)}
                          onFileChange={(file) => {
                            const newFiles = [...partsFiles];
                            if (file) {
                              newFiles[index] = file;
                              // Remove from removed list if re-adding
                              setRemovedPartImages(prev => prev.filter(i => i !== index));
                            } else {
                              // Mark as removed instead of deleting
                              setRemovedPartImages(prev => [...prev, index]);
                              newFiles[index] = undefined as any;
                            }
                            setPartsFiles(newFiles);
                          }}
                          onKeepExistingChange={() => {}}
                          required={false}
                          hideChangeButton={true}
                        />
                        <div className="flex gap-2">
                          <Input
                            value={part}
                            onChange={(e) => handleArrayChange("parts_replaced", index, e.target.value)}
                            placeholder="Part name or description..."
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}
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
                      Update additional images, documents, or reference materials for this maintenance report
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {formData.attachment_urls.map((url, index) => (
                      <div key={index} className="space-y-2">
                        <FileUploadSectionSimple
                          label={`Attachment ${index + 1}`}
                          accept="image/*,application/pdf,.doc,.docx"
                          currentFileUrl={removedAttachments.includes(index) ? null : (url || null)}
                          onFileChange={(file) => {
                            const newFiles = [...attachmentFiles];
                            if (file) {
                              newFiles[index] = file;
                              // Remove from removed list if re-adding
                              setRemovedAttachments(prev => prev.filter(i => i !== index));
                            } else {
                              // Mark as removed instead of deleting
                              setRemovedAttachments(prev => [...prev, index]);
                              newFiles[index] = undefined as any;
                            }
                            setAttachmentFiles(newFiles);
                          }}
                          onKeepExistingChange={() => {}}
                          required={false}
                          hideChangeButton={true}
                        />
                        <div className="flex gap-2">
                          <Input
                            value={url}
                            onChange={(e) => handleArrayChange("attachment_urls", index, e.target.value)}
                            placeholder="Or enter URL: https://example.com/image.jpg"
                            type="url"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    ))}
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
                disabled={updateMaintenanceReportMutation.isPending}
                className="flex-1"
              >
                {updateMaintenanceReportMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
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
      <DialogContent 
        className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '55vw', width: '55vw' }}
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl">Edit Maintenance Report</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Update maintenance report details, parts replacement, and attachments
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-0">
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
                  Update images and details of parts that were replaced during maintenance
                </p>
              </div>
              {formData.parts_replaced.map((part, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <FileUploadSectionSimple
                    label={`Part ${index + 1} Image`}
                    accept="image/*"
                    currentFileUrl={removedPartImages.includes(index) ? null : (selectedReport?.attachment_urls?.[index] || null)}
                    onFileChange={(file) => {
                      const newFiles = [...partsFiles];
                      if (file) {
                        newFiles[index] = file;
                        // Remove from removed list if re-adding
                        setRemovedPartImages(prev => prev.filter(i => i !== index));
                      } else {
                        // Mark as removed instead of deleting
                        setRemovedPartImages(prev => [...prev, index]);
                        newFiles[index] = undefined as any;
                      }
                      setPartsFiles(newFiles);
                    }}
                    onKeepExistingChange={() => {}}
                    required={false}
                    hideChangeButton={true}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={part}
                      onChange={(e) => handleArrayChange("parts_replaced", index, e.target.value)}
                      placeholder="Part name or description..."
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}
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
                  Update additional images, documents, or reference materials for this maintenance report
                </p>
              </div>
              {formData.attachment_urls.map((url, index) => (
                <div key={index} className="space-y-3 p-4 border rounded-lg">
                  <FileUploadSectionSimple
                    label={`Attachment ${index + 1}`}
                    accept="image/*,application/pdf,.doc,.docx"
                    currentFileUrl={removedAttachments.includes(index) ? null : (url || null)}
                    onFileChange={(file) => {
                      const newFiles = [...attachmentFiles];
                      if (file) {
                        newFiles[index] = file;
                        // Remove from removed list if re-adding
                        setRemovedAttachments(prev => prev.filter(i => i !== index));
                      } else {
                        // Mark as removed instead of deleting
                        setRemovedAttachments(prev => [...prev, index]);
                        newFiles[index] = undefined as any;
                      }
                      setAttachmentFiles(newFiles);
                    }}
                    onKeepExistingChange={() => {}}
                    required={false}
                    hideChangeButton={true}
                  />
                  <div className="flex gap-2">
                    <Input
                      value={url}
                      onChange={(e) => handleArrayChange("attachment_urls", index, e.target.value)}
                      placeholder="Or enter URL: https://example.com/image.jpg"
                      type="url"
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

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
              type="button"
              onClick={handleSubmit}
              disabled={updateMaintenanceReportMutation.isPending}
              size="lg"
            >
              {updateMaintenanceReportMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
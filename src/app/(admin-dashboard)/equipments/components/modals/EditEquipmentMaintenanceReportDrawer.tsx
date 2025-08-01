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
  useEquipments,
} from "@/hooks/useEquipmentQuery";
import { useProjects } from "@/hooks/api/use-projects";
import { useQueryClient } from "@tanstack/react-query";
import { equipmentKeys } from "@/hooks/useEquipmentQuery";
import { useEquipmentStore, selectIsMobile } from "@/stores/equipmentStore";
import { Plus, Trash2, X, ClipboardCheck, Package, ImageIcon, Upload, MapPin, Calendar, Clock, Wrench, Loader2 } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";

export default function EditEquipmentMaintenanceReportDrawer() {
  // State from Zustand
  const isOpen = useEquipmentStore((state) => state.isEditMaintenanceReportDrawerOpen);
  const isMobile = useEquipmentStore(selectIsMobile);
  const selectedReport = useEquipmentStore((state) => state.selectedMaintenanceReportForEdit);
  const { 
    setIsEditMaintenanceReportDrawerOpen, 
    setSelectedMaintenanceReportForEdit,
    setIsMaintenanceReportDetailOpen,
    setSelectedMaintenanceReportForDetail,
    setIsModalOpen
  } = useEquipmentStore();

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
  const queryClient = useQueryClient();

  // Local form state
  const [activeTab, setActiveTab] = useState<'details' | 'parts' | 'attachments'>('details');
  
  // Stable tab change handler
  const handleTabChange = useCallback((tab: 'details' | 'parts' | 'attachments') => {
    setActiveTab(tab);
  }, []);

  // Helper functions for counts
  const getPartsCount = () => {
    return formData.parts_replaced.filter(part => part && part.trim() !== "").length;
  };

  const getAttachmentsCount = () => {
    return formData.attachment_urls.filter(url => url && url.trim() !== "").length;
  };

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
  const [removedAttachments, setRemovedAttachments] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form data when selectedReport changes
  useEffect(() => {
    if (selectedReport) {
      
      // Find the location to verify it exists
      const selectedLocation = locations.find(loc => loc.id === selectedReport.location_id);
      
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
          ? selectedReport.parts_replaced.filter((part: string) => part && part.trim() !== "")
          : [""], // Always have at least one empty part
        attachment_urls: selectedReport.attachment_urls && selectedReport.attachment_urls.length > 0 && selectedReport.parts_replaced
          ? selectedReport.attachment_urls.slice(selectedReport.parts_replaced.length).filter((url: string) => url && url.trim() !== "")
          : [""], // Only attachment URLs after part images
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
    setLocalAttachmentFiles([]);
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
      // Set the updated report for detail view - ensure it's a fresh object
      setSelectedMaintenanceReportForDetail({...reportToShow});
      setIsMaintenanceReportDetailOpen(true);
      
      // Invalidate queries to ensure fresh data everywhere
      if (selectedReport?.equipment_id) {
        queryClient.invalidateQueries({ queryKey: equipmentKeys.equipmentMaintenanceReports(selectedReport.equipment_id) });
      }
      queryClient.invalidateQueries({ queryKey: equipmentKeys.list() });
      
      // Close edit drawer (this will also close equipment modal via handleClose)
      setIsEditMaintenanceReportDrawerOpen(false);
      setSelectedMaintenanceReportForEdit(null);
      // Reset form state
      setActiveTab('details');
      setLocalAttachmentFiles([]);
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
  }, [selectedReport, setSelectedMaintenanceReportForDetail, setIsMaintenanceReportDetailOpen, setIsEditMaintenanceReportDrawerOpen, setSelectedMaintenanceReportForEdit, setLocalAttachmentFiles, setFormData, setActiveTab, queryClient]);

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

  // Add/remove handlers for parts and attachments
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


  const addAttachment = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      attachment_urls: [...prev.attachment_urls, ""],
    }));
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachment_urls: prev.attachment_urls.filter((_, i) => i !== index),
    }));
    // Also remove corresponding files
    setLocalAttachmentFiles((prev) => prev.filter((_, i) => i !== index));
    setRemovedAttachments((prev) => prev.filter(i => i !== index).map(i => i > index ? i - 1 : i));
  }, []);



  // File upload helper function  
  const uploadFileToSupabase = useCallback(async (file: File, prefix: string, isAttachment: boolean = false): Promise<string> => {
    const supabase = createClient();
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `${timestamp}_${selectedReport?.id || 'unknown'}_${file.name}`;
    
    // Match the create functionality path structure
    const equipmentId = selectedReport?.equipment_id || 'unknown';
    const reportId = selectedReport?.id || 'unknown';
    const folder = isAttachment ? 'attachments' : 'parts';
    const filepath = `equipment-${equipmentId}/maintenance-reports/${reportId}/${folder}/${filename}`;
    
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
  }, [selectedReport?.equipment_id, selectedReport?.id]);

  // Function to delete old files from Supabase storage
  const deleteFileFromSupabase = useCallback(async (fileUrl: string): Promise<void> => {
    if (!fileUrl || !fileUrl.includes('supabase.co/storage/v1/object/public/equipments/')) {
      return; // Not a Supabase storage URL, skip deletion
    }
    
    const supabase = createClient();
    
    // Extract the file path from the URL
    // URL format: https://domain.supabase.co/storage/v1/object/public/equipments/path/to/file
    const urlParts = fileUrl.split('/storage/v1/object/public/equipments/');
    if (urlParts.length !== 2) {
      console.warn('Invalid storage URL format:', fileUrl);
      return;
    }
    
    const filePath = urlParts[1];
    
    const { error } = await supabase.storage
      .from('equipments')
      .remove([filePath]);
      
    if (error) {
      console.warn('Failed to delete file from storage:', filePath, error);
      // Don't throw error - continue with update even if file deletion fails
    }
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set loading state immediately
    setIsSubmitting(true);

    if (!selectedReport) {
      toast.error("No report selected for editing");
      setIsSubmitting(false);
      return;
    }

    if (!formData.issue_description.trim()) {
      toast.error("Issue description is required");
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Process parts (text-only, no images)
      const filteredPartsReplaced: string[] = formData.parts_replaced.filter(
        (part) => part.trim() !== ""
      );

      // Step 2: Delete removed attachment files from storage  
      for (const removedIndex of removedAttachments) {
        const existingUrl = selectedReport?.attachment_urls?.[removedIndex];
        if (existingUrl) {
          await deleteFileFromSupabase(existingUrl);
        }
      }

      // Step 3: Process attachment files
      const attachmentUrls: string[] = [];
      
      for (let i = 0; i < formData.attachment_urls.length; i++) {
        // Skip removed attachments
        if (removedAttachments.includes(i)) {
          continue;
        }
        
        const file = localAttachmentFiles[i];
        if (file) {
          // Delete old attachment file if replacing
          const existingUrl = selectedReport?.attachment_urls?.[attachmentUrls.length];
          if (existingUrl) {
            await deleteFileFromSupabase(existingUrl);
          }
          
          // Upload new attachment file
          try {
            const uploadedUrl = await uploadFileToSupabase(file, `attachment_${attachmentUrls.length}`, true);
            attachmentUrls.push(uploadedUrl);
          } catch (uploadError) {
            toast.error(`Failed to upload attachment ${attachmentUrls.length + 1}`);
            setIsSubmitting(false);
            return;
          }
        } else if (formData.attachment_urls[i] && formData.attachment_urls[i].trim()) {
          // Keep manual URL if provided
          attachmentUrls.push(formData.attachment_urls[i]);
        }
      }

      // Step 4: Update the maintenance report with new data
      // Create FormData for the update
      const formDataToSend = new FormData();
      
      // Add basic form fields
      formDataToSend.append('id', selectedReport.id);
      formDataToSend.append('equipment_id', selectedReport.equipment_id);
      formDataToSend.append('issue_description', formData.issue_description);
      if (formData.remarks) formDataToSend.append('remarks', formData.remarks);
      if (formData.inspection_details) formDataToSend.append('inspection_details', formData.inspection_details);
      if (formData.action_taken) formDataToSend.append('action_taken', formData.action_taken);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('status', formData.status);
      if (formData.downtime_hours) formDataToSend.append('downtime_hours', formData.downtime_hours);
      
      // location_id is required in schema, fallback to existing value if empty
      formDataToSend.append('location_id', formData.location_id || selectedReport.location_id || '');
      
      // Add arrays as JSON strings
      formDataToSend.append('parts_replaced', JSON.stringify(filteredPartsReplaced));
      formDataToSend.append('attachment_urls', JSON.stringify(attachmentUrls));
      
      // Add repair date
      const repairDate = formData.status === "COMPLETED" && !selectedReport.date_repaired 
        ? new Date().toISOString() 
        : selectedReport.date_repaired;
      if (repairDate) formDataToSend.append('date_repaired', repairDate);

      const updatedReport = await updateMaintenanceReportMutation.mutateAsync(formDataToSend);
      setIsSubmitting(false);
      handleSaveAndViewDetails(updatedReport);
    } catch (error) {
      setIsSubmitting(false);
      toast.error("Failed to update maintenance report");
    }
  }, [formData, selectedReport, updateMaintenanceReportMutation, handleSaveAndViewDetails, localAttachmentFiles, uploadFileToSupabase, removedAttachments]);


  // Stable tab button renderer
  const renderTabButton = useCallback((tab: 'details' | 'parts' | 'attachments', label: string, icon: React.ReactNode, count?: number) => (
    <Button
      type="button"
      variant={activeTab === tab ? 'default' : 'ghost'}
      size="sm"
      onClick={() => handleTabChange(tab)}
      className="flex-1 flex items-center gap-2"
    >
      <div className="relative">
        {icon}
        {count !== undefined && count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[10px] leading-none">
            {count}
          </span>
        )}
      </div>
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
            <p className="text-sm text-muted-foreground mt-1">
              Update maintenance report details, parts replacement, and attachments
            </p>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex overflow-x-auto gap-1 pb-1">
                <Button
                  type="button"
                  variant={activeTab === 'details' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabChange('details')}
                  className="flex-shrink-0 flex items-center gap-2 min-w-0"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  <span className="truncate">Details</span>
                </Button>
                <Button
                  type="button"
                  variant={activeTab === 'parts' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabChange('parts')}
                  className="flex-shrink-0 flex items-center gap-2 min-w-0"
                >
                  <Package className="h-4 w-4" />
                  <span className="truncate">Parts</span>
                </Button>
                <Button
                  type="button"
                  variant={activeTab === 'attachments' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleTabChange('attachments')}
                  className="flex-shrink-0 flex items-center gap-2 min-w-0"
                >
                  <ImageIcon className="h-4 w-4" />
                  <span className="truncate">Files</span>
                </Button>
              </div>

              {/* Details Tab */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Issue Information */}
                  <Card>
                    <CardHeader className="pb-6">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5" />
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
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="status" className="flex items-center gap-2">
                            <ClipboardCheck className="h-4 w-4" />
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
                              <SelectItem key={location.id} value={location.id}>
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
                        <ClipboardCheck className="h-4 w-4" />
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
                      <Package className="h-4 w-4" />
                      Parts Replaced
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Update the names and descriptions of parts that were replaced during maintenance
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {formData.parts_replaced.map((part, index) => {
                      return (
                        <div key={`part-input-${index}`} className="border rounded-lg">
                          <div className="flex items-center justify-between p-3 px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium text-sm">
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
                          <div className="space-y-3 border-t p-3">
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
                              className="h-10 text-sm"
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
              )}

              {/* Attachments Tab */}
              {activeTab === 'attachments' && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Attachments & Images
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      Update additional images, documents, or reference materials for this maintenance report
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border rounded-lg">
                      <div className="flex items-center gap-2 p-3 px-3 py-2">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          Upload Attachments
                          {localAttachmentFiles[0] && ` - ${localAttachmentFiles[0].name.slice(0, 30)}${localAttachmentFiles[0].name.length > 30 ? '...' : ''}`}
                        </span>
                      </div>
                      <div className="space-y-3 border-t p-3">
                        <FileUploadSectionSimple
                          label="Attachment"
                          accept="image/*,application/pdf,.doc,.docx"
                          onFileChange={(file) => {
                            const newFiles = [...localAttachmentFiles];
                            if (file) {
                              newFiles[0] = file;
                            } else {
                              newFiles.splice(0, 1);
                            }
                            setLocalAttachmentFiles(newFiles);
                          }}
                          onKeepExistingChange={() => {}}
                          selectedFile={localAttachmentFiles[0]}
                          currentFileUrl={formData.attachment_urls[0] || null}
                          required={false}
                        />
                      </div>
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
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
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
                          <SelectItem key={location.id} value={location.id}>
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
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Parts Replaced
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Update the names and descriptions of parts that were replaced during maintenance
                </p>
              </div>
              {formData.parts_replaced.map((part, index) => {
                return (
                  <div key={`part-input-${index}`} className="border rounded-lg">
                    <div className="flex items-center justify-between p-3 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
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
                    <div className="space-y-3 border-t p-3">
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
                        className="h-10 text-sm"
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
            </div>
          )}

          {/* Attachments Tab */}
          {activeTab === 'attachments' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Attachments & Images
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Update additional images, documents, or reference materials for this maintenance report
                </p>
              </div>
              <div className="border rounded-lg">
                <div className="flex items-center gap-2 p-3 px-3 py-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    Upload Attachments
                    {localAttachmentFiles[0] && ` - ${localAttachmentFiles[0].name.slice(0, 30)}${localAttachmentFiles[0].name.length > 30 ? '...' : ''}`}
                  </span>
                </div>
                <div className="space-y-3 border-t p-3">
                  <FileUploadSectionSimple
                    label="Attachment"
                    accept="image/*,application/pdf,.doc,.docx"
                    onFileChange={(file) => {
                      const newFiles = [...localAttachmentFiles];
                      if (file) {
                        newFiles[0] = file;
                      } else {
                        newFiles.splice(0, 1);
                      }
                      setLocalAttachmentFiles(newFiles);
                    }}
                    onKeepExistingChange={() => {}}
                    selectedFile={localAttachmentFiles[0]}
                    currentFileUrl={formData.attachment_urls[0] || null}
                    required={false}
                  />
                </div>
              </div>
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
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
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
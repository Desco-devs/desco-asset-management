"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  useCreateMaintenanceReport,
  useVehiclesWithReferenceData,
  vehicleKeys,
} from "@/hooks/useVehiclesQuery";
import { useVehiclesStore, selectIsMobile } from "@/stores/vehiclesStore";
import { 
  useMaintenanceReportStore,
  selectActiveTab,
  selectFormData,
  selectPartsFiles,
  selectAttachmentFiles
} from "@/stores/maintenanceReportStore";
import { useUsers } from "@/hooks/useUsersQuery";
import { 
  Plus, 
  Trash2, 
  X, 
  ClipboardCheck, 
  Package, 
  ImageIcon, 
  CalendarIcon,
  Loader2
} from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface CreateVehicleMaintenanceReportModalProps {
  vehicleId: string;
}

export default function CreateVehicleMaintenanceReportModal({
  vehicleId,
}: CreateVehicleMaintenanceReportModalProps) {
  // Use the vehicle store modal state 
  const isOpen = useVehiclesStore((state) => state.isVehicleMaintenanceModalOpen);
  
  // CRITICAL: Don't subscribe to store during typing - causes re-renders
  // We'll only read initial values and use refs for everything else
  
  // Mobile detection from vehicle store
  const isMobile = useVehiclesStore(selectIsMobile);
  const { setIsVehicleMaintenanceModalOpen, setIsModalOpen } = useVehiclesStore();
  
  // Local loading state for immediate feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Only get resetForm for cleanup - no reactive subscriptions
  const { resetForm } = useMaintenanceReportStore();

  // Server state from TanStack Query
  const { locations } = useVehiclesWithReferenceData();
  const { data: usersData } = useUsers();
  const createMaintenanceReportMutation = useCreateMaintenanceReport();
  const queryClient = useQueryClient();

  // Tab state for navigation
  const [activeTab, setActiveTab] = useState<'details' | 'parts' | 'attachments'>('details');
  
  // CRITICAL FIX: Use ref for form data to prevent re-renders entirely - EXACTLY like EquipmentModalModern
  const formDataRef = useRef({
    issue_description: '',
    remarks: '',
    inspection_details: '',
    action_taken: '',
    priority: 'MEDIUM',
    status: 'REPORTED',
    downtime_hours: '',
    location_id: '',
    parts_replaced: [''],
    attachment_urls: [''],
    repaired_by: '',
  });

  // Initialize form data when modal opens - fresh defaults (no store)
  useEffect(() => {
    if (isOpen) {
      // Reset loading state
      setIsSubmitting(false);
      
      // Reset all local file states
      setLocalAttachmentFiles([]);
      
      
      // Reset date state
      setDateRepaired(undefined);
      
      formDataRef.current = {
        issue_description: '',
        remarks: '',
        inspection_details: '',
        action_taken: '',
        priority: 'MEDIUM',
        status: 'REPORTED',
        downtime_hours: '',
        location_id: '',
        parts_replaced: [''],
        attachment_urls: [''],
        repaired_by: '',
      };
    }
  }, [isOpen]);

  // CRITICAL FIX: Update form data via ref without causing re-renders - EXACTLY like EquipmentModalModern
  const handleFieldChange = useCallback((field: string, value: any) => {
    formDataRef.current = { ...formDataRef.current, [field]: value };
    // NO STORE SYNC - completely isolated during typing
  }, []); // No dependencies - function is stable

  const updateTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);
  
  // Local UI state for date picker
  const [dateRepairedOpen, setDateRepairedOpen] = useState(false);
  const [dateRepaired, setDateRepaired] = useState<Date | undefined>();
  
  // Local file state - NO store subscriptions
  const [localAttachmentFiles, setLocalAttachmentFiles] = useState<File[]>([]);

  // Debug logging to track re-renders and focus issues
  console.log('CreateVehicleMaintenanceReportModal render - activeTab:', activeTab, 'isOpen:', isOpen);

  // Stable tab change handler
  const handleTabChange = useCallback((tab: 'details' | 'parts' | 'attachments') => {
    console.log('Tab changed to:', tab);
    setActiveTab(tab);
  }, []);


  // Stable event handlers using useCallback
  const handleClose = useCallback(() => {
    setIsVehicleMaintenanceModalOpen(false);
    resetForm();
    setActiveTab('details');
    setDateRepaired(undefined);
    // Return to vehicle modal
    setIsModalOpen(true);
  }, [setIsVehicleMaintenanceModalOpen, resetForm, setIsModalOpen]);

  // File upload handlers - use local state
  const handleAttachmentUpload = useCallback((index: number, file: File | null) => {
    const newFiles = [...localAttachmentFiles];
    if (file) {
      newFiles[index] = file;
    } else {
      newFiles.splice(index, 1);
    }
    setLocalAttachmentFiles(newFiles);
  }, [localAttachmentFiles]);

  // Add/remove handlers for parts - NO store sync
  const addPartReplaced = useCallback(() => {
    formDataRef.current = { 
      ...formDataRef.current, 
      parts_replaced: [...formDataRef.current.parts_replaced, ''] 
    };
  }, []);

  const removePartReplaced = useCallback((index: number) => {
    formDataRef.current = { 
      ...formDataRef.current, 
      parts_replaced: formDataRef.current.parts_replaced.filter((_, i) => i !== index)
    };
  }, []);


  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Set loading state immediately for instant feedback
    setIsSubmitting(true);

    // Access current form data from ref - this prevents callback recreation on form changes
    const currentFormData = formDataRef.current;

    if (!currentFormData.issue_description.trim()) {
      toast.error("Issue description is required");
      setIsSubmitting(false);
      return;
    }

    // Step 1: Create the maintenance report first (without files)
    const processedParts: string[] = [];
    
    for (let i = 0; i < currentFormData.parts_replaced.length; i++) {
      const partName = currentFormData.parts_replaced[i];
      
      // Only include parts with actual names (no file uploads for parts anymore)
      if (partName?.trim()) {
        processedParts.push(partName.trim());
      }
    }

    const filteredAttachmentUrls = currentFormData.attachment_urls.filter(
      (url) => url.trim() !== ""
    );

    // Create report first without file URLs
    const reportData = {
      vehicle_id: vehicleId,
      issue_description: currentFormData.issue_description,
      remarks: currentFormData.remarks || undefined,
      inspection_details: currentFormData.inspection_details || undefined,
      action_taken: currentFormData.action_taken || undefined,
      priority: currentFormData.priority as any,
      status: currentFormData.status as any,
      downtime_hours: currentFormData.downtime_hours || undefined,
      location_id: currentFormData.location_id || undefined,
      parts_replaced: processedParts,
      attachment_urls: filteredAttachmentUrls, // Only manual URLs for now
      date_reported: new Date().toISOString(),
      date_repaired: dateRepaired ? dateRepaired.toISOString() : undefined,
    };

    try {
      // Create the report and get the ID
      const createdReport = await createMaintenanceReportMutation.mutateAsync(reportData);
      const reportId = createdReport.id;

      // Step 2: Upload files with the report ID
      const uploadedAttachmentUrls: string[] = [];

      console.log('Starting file uploads for report:', reportId);
      console.log('Local attachment files:', localAttachmentFiles);

      // Upload attachment files only
      const allFiles = [...localAttachmentFiles];
      
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        if (file) {
          const folderPath = `vehicle-${vehicleId}/maintenance-reports/${reportId}/attachments`;
          console.log('Uploading file:', file.name, 'to folder:', folderPath);
          
          const formDataUpload = new FormData();
          formDataUpload.append('file', file);
          formDataUpload.append('folder', folderPath);
          
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formDataUpload,
          });
          
          if (uploadResponse.ok) {
            const result = await uploadResponse.json();
            uploadedAttachmentUrls.push(result.url);
            console.log('File uploaded successfully:', result);
          } else {
            console.error('File upload failed:', uploadResponse.status, await uploadResponse.text());
          }
        }
      }

      // Step 3: Update the report with file URLs if any files were uploaded
      if (uploadedAttachmentUrls.length > 0 || filteredAttachmentUrls.length > 0) {
        const allAttachmentUrls = [
          ...uploadedAttachmentUrls, // Uploaded files
          ...filteredAttachmentUrls // Manual URLs
        ];

        // Update the report with file URLs
        const updateResponse = await fetch(`/api/vehicles/maintenance-reports/${reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attachment_urls: allAttachmentUrls,
          }),
        });

        if (updateResponse.ok) {
          // CRITICAL FIX: Invalidate the cache to ensure fresh data is displayed
          console.log('Invalidating maintenance reports cache after file upload');
          await queryClient.invalidateQueries({ 
            queryKey: vehicleKeys.maintenanceReports() 
          });
        }
      } else {
        // Even if no files were uploaded, invalidate cache to ensure fresh data
        console.log('Invalidating maintenance reports cache after report creation');
        await queryClient.invalidateQueries({ 
          queryKey: vehicleKeys.maintenanceReports() 
        });
      }

      toast.success("Maintenance report created successfully");
      handleClose();
    } catch (error) {
      console.error('Maintenance report creation error:', error);
      toast.error('Failed to create maintenance report');
      setIsSubmitting(false);
    }
  }, [vehicleId, createMaintenanceReportMutation, handleClose, localAttachmentFiles, dateRepaired, queryClient]);

  console.log('CreateVehicleMaintenanceReportModal - isOpen:', isOpen, 'vehicleId:', vehicleId);
  
  if (!isOpen) return null;

  const ContentComponent = () => (
    <div className="space-y-4">
      {/* Tab Navigation - Always Horizontal */}
      <div className="border-b mb-4">
        <div className={`${isMobile ? 'flex overflow-x-auto gap-1 pb-1' : 'flex gap-0 justify-center'}`}>
          {isMobile ? (
            <>
              {/* Mobile Tab Buttons */}
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
            </>
          ) : (
            <>
              {/* Desktop Tab Navigation - Horizontal */}
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
                Attachments
              </button>
            </>
          )}
        </div>
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Issue Information
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Describe the maintenance issue or task details
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Issue Description */}
              <div className="space-y-2">
                <Label htmlFor="issue_description">Issue Description *</Label>
                <Textarea
                  id="issue_description"
                  defaultValue={formDataRef.current.issue_description}
                  onChange={(e) => handleFieldChange("issue_description", e.target.value)}
                  placeholder="Describe the issue or maintenance required..."
                  className="min-h-[100px]"
                />
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    defaultValue={formDataRef.current.priority}
                    onValueChange={(value) => handleFieldChange("priority", value)}
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
                    defaultValue={formDataRef.current.status}
                    onValueChange={(value) => handleFieldChange("status", value)}
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

              {/* Downtime and Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="downtime_hours">Downtime Hours</Label>
                  <Input
                    id="downtime_hours"
                    type="number"
                    step="0.1"
                    defaultValue={formDataRef.current.downtime_hours}
                    onChange={(e) => handleFieldChange("downtime_hours", e.target.value)}
                    placeholder="0.0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location_id">Location</Label>
                  <Select
                    defaultValue={formDataRef.current.location_id}
                    onValueChange={(value) => handleFieldChange("location_id", value)}
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

              {/* Date Repaired */}
              <div className="space-y-2">
                <Label>Date Repaired (Optional)</Label>
                <Popover open={dateRepairedOpen} onOpenChange={setDateRepairedOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRepaired && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRepaired ? format(dateRepaired, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateRepaired}
                      onSelect={(date) => {
                        setDateRepaired(date);
                        setDateRepairedOpen(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Repaired By */}
              <div className="space-y-2">
                <Label htmlFor="repaired_by">Repaired By</Label>
                <Select
                  defaultValue={formDataRef.current.repaired_by}
                  onValueChange={(value) => handleFieldChange("repaired_by", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usersData?.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
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
              <CardTitle className="text-base">Technical Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inspection_details">Inspection Details</Label>
                <Textarea
                  id="inspection_details"
                  defaultValue={formDataRef.current.inspection_details}
                  onChange={(e) => handleFieldChange("inspection_details", e.target.value)}
                  placeholder="Describe the inspection findings..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="action_taken">Action Taken</Label>
                <Textarea
                  id="action_taken"
                  defaultValue={formDataRef.current.action_taken}
                  onChange={(e) => handleFieldChange("action_taken", e.target.value)}
                  placeholder="Describe the actions taken..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="remarks">Additional Remarks</Label>
                <Textarea
                  id="remarks"
                  defaultValue={formDataRef.current.remarks}
                  onChange={(e) => handleFieldChange("remarks", e.target.value)}
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
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parts Replaced
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              List the parts that were replaced during this maintenance
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {formDataRef.current.parts_replaced.map((part, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  defaultValue={part}
                  onChange={(e) => {
                    const newParts = [...formDataRef.current.parts_replaced];
                    newParts[index] = e.target.value;
                    handleFieldChange("parts_replaced", newParts);
                  }}
                  placeholder="Part name or description..."
                  className="flex-1"
                />
                {formDataRef.current.parts_replaced.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removePartReplaced(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
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
            <CardTitle className="text-lg flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Attachments & Images
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload additional images, documents, or reference materials
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* File Upload Sections */}
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <FileUploadSectionSimple
                  label={`Attachment ${index + 1}`}
                  accept="image/*,application/pdf,.doc,.docx"
                  onFileChange={(file) => handleAttachmentUpload(index, file)}
                  onKeepExistingChange={() => {}}
                  required={false}
                />
              </div>
            ))}

            {/* Manual URL inputs */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Or add URLs manually:</h4>
              {formDataRef.current.attachment_urls.map((url, index) => (
                <div key={index} className="flex gap-2 items-center mb-2">
                  <Input
                    defaultValue={url}
                    onChange={(e) => {
                      const newUrls = [...formDataRef.current.attachment_urls];
                      newUrls[index] = e.target.value;
                      handleFieldChange("attachment_urls", newUrls);
                    }}
                    placeholder="https://example.com/image.jpg"
                    type="url"
                    className="flex-1"
                  />
                  {formDataRef.current.attachment_urls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newUrls = formDataRef.current.attachment_urls.filter((_, i) => i !== index);
                        handleFieldChange("attachment_urls", newUrls);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newUrls = [...formDataRef.current.attachment_urls, ''];
                  handleFieldChange("attachment_urls", newUrls);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add URL
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

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
              Create Vehicle Maintenance Report
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <ContentComponent />
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
                    Creating...
                  </>
                ) : (
                  "Create Report"
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
          <DialogTitle className="text-xl">Create Vehicle Maintenance Report</DialogTitle>
          <DialogDescription>
            Record maintenance activities, parts replacement, and vehicle status updates
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="p-0">
            <ContentComponent />
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
                  Creating...
                </>
              ) : (
                "Create Report"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
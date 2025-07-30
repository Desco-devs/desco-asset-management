"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  useCreateEquipmentMaintenanceReport,
  useEquipmentsWithReferenceData,
} from "@/hooks/useEquipmentsQuery";
import { useEquipmentStore, selectIsMobile } from "@/stores/equipmentStore";
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
  ChevronDown, 
  ChevronRight,
  CalendarIcon,
  Loader2
} from "lucide-react";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import { toast } from "sonner";

interface CreateEquipmentMaintenanceReportModalProps {
  equipmentId: string;
}

export default function CreateEquipmentMaintenanceReportModal({
  equipmentId,
}: CreateEquipmentMaintenanceReportModalProps) {
  // Use the equipment store modal state 
  const isOpen = useEquipmentStore((state) => state.isMaintenanceModalOpen);
  
  // CRITICAL: Don't subscribe to store during typing - causes re-renders
  // We'll only read initial values and use refs for everything else
  
  // Mobile detection from equipment store
  const isMobile = useEquipmentStore(selectIsMobile);
  const { setIsMaintenanceModalOpen } = useEquipmentStore();
  
  // Local loading state for immediate feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Only get resetForm for cleanup - no reactive subscriptions
  const { resetForm } = useMaintenanceReportStore();

  // Server state from TanStack Query
  const { locations } = useEquipmentsWithReferenceData();
  const { data: usersData } = useUsers();
  const createMaintenanceReportMutation = useCreateEquipmentMaintenanceReport();

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
      setLocalPartsFiles([]);
      setLocalAttachmentFiles([]);
      
      // Reset collapsible states
      setOpenParts({ 0: true });
      setOpenAttachments({ 0: true });
      setIsPartsReplacedOpen(false);
      setIsAttachmentsOpen(false);
      
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
  
  // Local UI state for collapsibles and date picker
  const [isPartsReplacedOpen, setIsPartsReplacedOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [openParts, setOpenParts] = useState<Record<number, boolean>>({ 0: true });
  const [openAttachments, setOpenAttachments] = useState<Record<number, boolean>>({ 0: true });
  const [dateRepairedOpen, setDateRepairedOpen] = useState(false);
  const [dateRepaired, setDateRepaired] = useState<Date | undefined>();
  
  // Local file state - NO store subscriptions
  const [localPartsFiles, setLocalPartsFiles] = useState<File[]>([]);
  const [localAttachmentFiles, setLocalAttachmentFiles] = useState<File[]>([]);

  // Debug logging to track re-renders and focus issues
  console.log('CreateEquipmentMaintenanceReportModal render - activeTab:', activeTab, 'isOpen:', isOpen);

  // Stable tab change handler
  const handleTabChange = useCallback((tab: 'details' | 'parts' | 'attachments') => {
    console.log('Tab changed to:', tab);
    setActiveTab(tab);
  }, []);

  // Toggle functions for collapsibles
  const togglePartOpen = useCallback((index: number) => {
    setOpenParts(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  const toggleAttachmentOpen = useCallback((index: number) => {
    setOpenAttachments(prev => ({ ...prev, [index]: !prev[index] }));
  }, []);

  // Stable event handlers using useCallback
  const handleClose = useCallback(() => {
    setIsMaintenanceModalOpen(false);
    resetForm();
    setActiveTab('details');
    setDateRepaired(undefined);
    setIsPartsReplacedOpen(false);
    setIsAttachmentsOpen(false);
    setOpenParts({ 0: true });
    setOpenAttachments({ 0: true });
    // Modal should stay closed after cleanup
  }, [setIsMaintenanceModalOpen, resetForm]);

  // File upload handlers - use local state
  const handlePartImageUpload = useCallback((index: number, file: File | null) => {
    const newFiles = [...localPartsFiles];
    if (file) {
      newFiles[index] = file;
    } else {
      newFiles.splice(index, 1);
    }
    setLocalPartsFiles(newFiles);
  }, [localPartsFiles]);

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
    const newIndex = formDataRef.current.parts_replaced.length - 1;
    setOpenParts(prevOpen => ({ ...prevOpen, [newIndex]: true }));
  }, []);

  const removePartReplaced = useCallback((index: number) => {
    formDataRef.current = { 
      ...formDataRef.current, 
      parts_replaced: formDataRef.current.parts_replaced.filter((_, i) => i !== index)
    };
    setOpenParts(prevOpen => {
      const newState = { ...prevOpen };
      delete newState[index];
      return newState;
    });
  }, []);

  const addAttachment = useCallback(() => {
    formDataRef.current = { 
      ...formDataRef.current, 
      attachment_urls: [...formDataRef.current.attachment_urls, ''] 
    };
    const newIndex = formDataRef.current.attachment_urls.length - 1;
    setOpenAttachments(prevOpen => ({ ...prevOpen, [newIndex]: true }));
  }, []);

  const removeAttachment = useCallback((index: number) => {
    formDataRef.current = { 
      ...formDataRef.current, 
      attachment_urls: formDataRef.current.attachment_urls.filter((_, i) => i !== index)
    };
    setOpenAttachments(prevOpen => {
      const newState = { ...prevOpen };
      delete newState[index];
      return newState;
    });
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
      const partFile = localPartsFiles[i];
      
      // If there's either a part name or a part image, include this part
      if (partName?.trim() || partFile) {
        processedParts.push(partName?.trim() || `Part ${i + 1}`); // Use default name if empty but has image
      }
    }

    const filteredAttachmentUrls = currentFormData.attachment_urls.filter(
      (url) => url.trim() !== ""
    );

    // Create report first without file URLs
    const reportData = {
      equipment_id: equipmentId,
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

    // Create the report and get the ID
    const createdReport = await createMaintenanceReportMutation.mutateAsync(reportData);
    const reportId = createdReport.id;

    // Step 2: Upload files with the report ID
    const uploadedAttachmentUrls: string[] = [];

    console.log('Starting file uploads for report:', reportId);
    console.log('Local parts files:', localPartsFiles);
    console.log('Local attachment files:', localAttachmentFiles);

    try {
      // Upload ALL files (both parts and attachments) to attachments folder for simplicity
      const allFiles = [...localPartsFiles, ...localAttachmentFiles];
      
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i];
        if (file) {
          const folderPath = `equipment-${equipmentId}/maintenance-reports/${reportId}/attachments`;
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
        await fetch(`/api/equipments/maintenance-reports/${reportId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attachment_urls: allAttachmentUrls,
          }),
        });
      }
      handleClose();
    } catch (error) {
      console.error('Maintenance report creation error:', error);
      toast.error('Failed to create maintenance report');
      setIsSubmitting(false);
    }
  }, [equipmentId, createMaintenanceReportMutation, handleClose, localPartsFiles, localAttachmentFiles, dateRepaired]);

  console.log('CreateEquipmentMaintenanceReportModal - isOpen:', isOpen, 'equipmentId:', equipmentId);
  
  if (!isOpen) return null;

  const ContentComponent = () => (
    <div className="space-y-4">
      {/* Tab Navigation - Always Horizontal */}
      <div className="border-b mb-4">
        <div className={`${isMobile ? 'flex overflow-x-auto gap-1 pb-1' : 'flex gap-0'}`}>
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
                Attachments & Images
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className={`space-y-4 ${isMobile ? 'px-1' : 'border-t pt-4'}`}>
          <Card className={isMobile ? 'mx-0' : ''}>
            <CardHeader className={`pb-3 ${isMobile ? 'px-4 py-3' : 'pb-4'}`}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                <ClipboardCheck className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Report Information</span>
              </CardTitle>
              <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Create an initial maintenance report for this equipment.
              </p>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'px-4 pb-4' : 'space-y-6'}`}>
              {/* Issue Description & Inspection Details */}
              <div className="grid gap-4 grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="maintenance-issue-description" className={isMobile ? 'text-sm font-medium' : ''}>
                    Issue Description *
                  </Label>
                  <Textarea
                    id="maintenance-issue-description"
                    defaultValue={formDataRef.current.issue_description}
                    onChange={(e) => handleFieldChange('issue_description', e.target.value)}
                    rows={isMobile ? 2 : 3}
                    placeholder="Describe the maintenance issue or work needed..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                    aria-describedby="maintenance-issue-description-help"
                  />
                  <div id="maintenance-issue-description-help" className="sr-only">
                    Describe the specific maintenance issue or work that needs to be performed
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="inspectionDetails" className={isMobile ? 'text-sm font-medium' : ''}>
                    Inspection Details
                  </Label>
                  <Textarea
                    id="inspectionDetails"
                    defaultValue={formDataRef.current.inspection_details}
                    onChange={(e) => handleFieldChange('inspection_details', e.target.value)}
                    rows={isMobile ? 2 : 3}
                    placeholder="Detail the inspection findings..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                  />
                </div>
              </div>
              
              {/* Action Taken & Remarks */}
              <div className="grid gap-4 grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="actionTaken" className={isMobile ? 'text-sm font-medium' : ''}>
                    Action Taken
                  </Label>
                  <Textarea
                    id="actionTaken"
                    defaultValue={formDataRef.current.action_taken}
                    onChange={(e) => handleFieldChange('action_taken', e.target.value)}
                    rows={isMobile ? 2 : 3}
                    placeholder="Describe the action taken or repairs made..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="maintenanceRemarks" className={isMobile ? 'text-sm font-medium' : ''}>
                    Additional Remarks
                  </Label>
                  <Textarea
                    id="maintenanceRemarks"
                    defaultValue={formDataRef.current.remarks}
                    onChange={(e) => handleFieldChange('remarks', e.target.value)}
                    rows={isMobile ? 2 : 3}
                    placeholder="Any additional notes or observations..."
                    className={`resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'text-sm' : ''}`}
                  />
                </div>
              </div>
              
              {/* Priority, Status, and Smart Fields */}
              <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-3'}`}>
                <div className="space-y-2">
                  <Label className={isMobile ? 'text-sm font-medium' : ''}>Priority</Label>
                  <Select defaultValue={formDataRef.current.priority} onValueChange={(value) => handleFieldChange('priority', value)}>
                    <SelectTrigger className={`w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}>
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
                  <Label className={isMobile ? 'text-sm font-medium' : ''}>Status</Label>
                  <Select defaultValue={formDataRef.current.status} onValueChange={(value) => handleFieldChange('status', value)}>
                    <SelectTrigger className={`w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REPORTED">Reported</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Show Downtime only for IN_PROGRESS and COMPLETED status */}
                {(formDataRef.current.status === 'IN_PROGRESS' || formDataRef.current.status === 'COMPLETED') && (
                  <div className="space-y-2">
                    <Label htmlFor="downtimeHours" className={isMobile ? 'text-sm font-medium' : ''}>
                      Downtime (Hours)
                    </Label>
                    <Input
                      id="downtimeHours"
                      type="number"
                      min="0"
                      step="0.1"
                      defaultValue={formDataRef.current.downtime_hours}
                      onChange={(e) => handleFieldChange('downtime_hours', e.target.value)}
                      placeholder="0.0"
                      className={`transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}
                    />
                  </div>
                )}
              </div>

              {/* Location field */}
              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm font-medium' : ''}>Location</Label>
                <Select defaultValue={formDataRef.current.location_id} onValueChange={(value) => handleFieldChange('location_id', value)}>
                  <SelectTrigger className={`w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}>
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
              
              {/* Completion Fields - Only show when status is COMPLETED */}
              {formDataRef.current.status === 'COMPLETED' && (
                <div className={`grid gap-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div className="space-y-2">
                    <Label className={isMobile ? 'text-sm font-medium' : ''}>Repaired By</Label>
                    <Select defaultValue={formDataRef.current.repaired_by} onValueChange={(value) => handleFieldChange('repaired_by', value)}>
                      <SelectTrigger className={`w-full transition-all duration-200 focus:ring-2 focus:ring-blue-500 ${isMobile ? 'h-10 text-sm' : ''}`}>
                        <SelectValue placeholder="Select technician" />
                      </SelectTrigger>
                      <SelectContent>
                        {usersData?.data?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.username})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className={isMobile ? 'text-sm font-medium' : ''}>Date Repaired</Label>
                    <Popover open={dateRepairedOpen} onOpenChange={setDateRepairedOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal transition-all duration-200 focus:ring-2 focus:ring-blue-500",
                            !dateRepaired && "text-muted-foreground",
                            isMobile ? 'h-10 text-sm' : ''
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                          {dateRepaired ? (
                            <span className="truncate">{format(dateRepaired, isMobile ? "MMM d, yyyy" : "PPP")}</span>
                          ) : (
                            <span className="truncate">Pick repair date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateRepaired}
                          onSelect={(date) => {
                            setDateRepaired(date);
                            setDateRepairedOpen(false);
                          }}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1990}
                          toYear={2030}
                          classNames={{
                            caption_dropdowns: "flex gap-2 justify-center",
                            vhidden: "hidden",
                            caption_label: "hidden"
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Parts Replaced Tab */}
      {activeTab === 'parts' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card className={isMobile ? 'mx-0' : ''}>
            <CardHeader className={`pb-3 ${isMobile ? 'px-4 py-3' : 'pb-4'}`}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                <Package className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Parts Replaced</span>
              </CardTitle>
              <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Upload images and details of parts that were replaced during maintenance
              </p>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'px-4 pb-4' : ''}`}>
              {formDataRef.current.parts_replaced.map((part, index) => {
                const isPartOpen = openParts[index] ?? (index === 0); // First part open by default
                return (
                  <Collapsible key={`part-input-${index}`} open={isPartOpen} onOpenChange={() => togglePartOpen(index)}>
                    <div className={`border rounded-lg ${isMobile ? '' : ''}`}>
                      <CollapsibleTrigger asChild>
                        <div className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                              Part {index + 1}
                              {part && ` - ${part.slice(0, 30)}${part.length > 30 ? '...' : ''}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {formDataRef.current.parts_replaced.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removePartReplaced(index);
                                }}
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                            {isPartOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className={`space-y-3 ${isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}`}>
                          <FileUploadSectionSimple
                            label={`Part ${index + 1} Image`}
                            accept="image/*"
                            onFileChange={(file) => handlePartImageUpload(index, file)}
                            onKeepExistingChange={() => {}}
                            selectedFile={localPartsFiles[index]}
                            required={false}
                          />
                          <Input
                            defaultValue={part}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Update ref directly without store sync
                              formDataRef.current = {
                                ...formDataRef.current,
                                parts_replaced: formDataRef.current.parts_replaced.map((item, i) => 
                                  i === index ? value : item
                                )
                              };
                            }}
                            placeholder="Part name or description..."
                            className={`${isMobile ? 'h-10 text-sm' : ''}`}
                          />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
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
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <Card className={isMobile ? 'mx-0' : ''}>
            <CardHeader className={`pb-3 ${isMobile ? 'px-4 py-3' : 'pb-4'}`}>
              <CardTitle className={`flex items-center gap-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                <ImageIcon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">Attachments & Images</span>
              </CardTitle>
              <p className={`text-muted-foreground mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Upload photos and documents related to this maintenance work.
              </p>
            </CardHeader>
            <CardContent className={`space-y-4 ${isMobile ? 'px-4 pb-4' : ''}`}>
              {formDataRef.current.attachment_urls.map((url, index) => {
                const isAttachmentOpen = openAttachments[index] ?? (index === 0); // First attachment open by default
                return (
                  <Collapsible key={`attachment-input-${index}`} open={isAttachmentOpen} onOpenChange={() => toggleAttachmentOpen(index)}>
                    <div className={`border rounded-lg ${isMobile ? '' : ''}`}>
                      <CollapsibleTrigger asChild>
                        <div className={`flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors ${isMobile ? 'px-3 py-2' : 'px-4 py-3'}`}>
                          <div className="flex items-center gap-2">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                              Attachment {index + 1}
                              {localAttachmentFiles[index] && ` - ${localAttachmentFiles[index].name.slice(0, 30)}${localAttachmentFiles[index].name.length > 30 ? '...' : ''}`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {formDataRef.current.attachment_urls.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeAttachment(index);
                                }}
                                className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                            {isAttachmentOpen ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className={`space-y-3 ${isMobile ? 'p-3 pt-0' : 'p-4 pt-0'}`}>
                          <FileUploadSectionSimple
                            label={`Attachment ${index + 1}`}
                            accept="image/*,application/pdf,.doc,.docx"
                            onFileChange={(file) => handleAttachmentUpload(index, file)}
                            onKeepExistingChange={() => {}}
                            selectedFile={localAttachmentFiles[index]}
                            required={false}
                          />
                          <Input
                            defaultValue={url}
                            onChange={(e) => {
                              const value = e.target.value;
                              // Update ref directly without store sync
                              formDataRef.current = {
                                ...formDataRef.current,
                                attachment_urls: formDataRef.current.attachment_urls.map((item, i) => 
                                  i === index ? value : item
                                )
                              };
                            }}
                            placeholder="Or enter URL: https://example.com/image.jpg"
                            type="url"
                            className={`${isMobile ? 'h-10 text-sm' : ''}`}
                          />
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addAttachment}
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
              Add New Equipment Maintenance Report
            </DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Add new equipment to your inventory with comprehensive details
            </p>
          </DrawerHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <form onSubmit={handleSubmit}>
              <ContentComponent />
            </form>
          </div>
          <DrawerFooter className="p-4 pt-2 border-t bg-background">
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || createMaintenanceReportMutation.isPending}
                className="flex-1"
              >
                {(isSubmitting || createMaintenanceReportMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
          <DialogTitle className="text-xl">Add New Equipment Maintenance Report</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Create a new maintenance report with issue details, parts replaced, and attachments
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit}>
            <ContentComponent />
          </form>
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
              disabled={isSubmitting || createMaintenanceReportMutation.isPending}
              size="lg"
            >
              {(isSubmitting || createMaintenanceReportMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Report...
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
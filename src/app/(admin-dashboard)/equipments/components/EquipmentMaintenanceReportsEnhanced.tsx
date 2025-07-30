"use client";

import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useEquipmentMaintenanceReports,
  useUpdateEquipmentMaintenanceReport,
} from "@/hooks/useEquipmentsQuery";
import { useEquipmentStore } from "@/stores/equipmentStore";
import { useEquipmentsStore } from "@/stores/equipmentsStore";
import type { EquipmentMaintenanceReport } from "@/stores/equipmentsStore";
import {
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  User,
  Wrench,
  Settings,
  Camera,
  Clock,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploadSectionSimple } from "@/components/equipment/FileUploadSectionSimple";
import EditEquipmentMaintenanceReportModal from "./modals/EditEquipmentMaintenanceReportModal";
import { toast } from "sonner";

interface EquipmentMaintenanceReportsEnhancedProps {
  equipmentId: string;
  isEditMode?: boolean;
}

export default function EquipmentMaintenanceReportsEnhanced({
  equipmentId,
  isEditMode = false,
}: EquipmentMaintenanceReportsEnhancedProps) {
  const { data: maintenanceReports = [], isLoading } = useEquipmentMaintenanceReports();
  const isMaintenanceModalOpen = useEquipmentStore(state => state.isMaintenanceModalOpen);
  const updateMaintenanceReportMutation = useUpdateEquipmentMaintenanceReport();
  const { 
    setIsMaintenanceModalOpen
  } = useEquipmentStore();
  const { 
    setSelectedMaintenanceReportForDetail,
    setIsMaintenanceReportDetailOpen
  } = useEquipmentsStore();
  
  // State for expanded reports
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  
  // State for active tabs per report
  const [activeTabs, setActiveTabs] = useState<Record<string, 'details' | 'parts' | 'attachments'>>({});
  
  // State for form data per report
  interface ReportFormData {
    issue_description: string;
    remarks: string;
    inspection_details: string;
    action_taken: string;
    priority: string;
    status: string;
    downtime_hours: string;
    location_id: string;
    parts_replaced: string[];
    attachment_urls: string[];
  }
  
  const [reportFormData, setReportFormData] = useState<Record<string, ReportFormData>>({});

  // Filter reports for this specific equipment
  const equipmentReports = Array.isArray(maintenanceReports)
    ? maintenanceReports.filter((report) => report.equipment_id === equipmentId)
    : [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "REPORTED":
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "CRITICAL": // Legacy data - map to HIGH styling
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LOW":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Quick update functions
  const handleQuickStatusUpdate = async (report: EquipmentMaintenanceReport, newStatus: string) => {
    try {
      const reportData = {
        id: report.id,
        equipment_id: report.equipment_id,
        issue_description: report.issue_description,
        remarks: report.remarks || undefined,
        inspection_details: report.inspection_details || undefined,
        action_taken: report.action_taken || undefined,
        priority: report.priority,
        status: newStatus,
        downtime_hours: report.downtime_hours || undefined,
        location_id: report.location_id,
        parts_replaced: report.parts_replaced || [],
        attachment_urls: report.attachment_urls || [],
        date_repaired: newStatus === "COMPLETED" && !report.date_repaired 
          ? new Date().toISOString() 
          : report.date_repaired,
      };

      await updateMaintenanceReportMutation.mutateAsync(reportData);
      toast.success(`Status updated to ${newStatus.toLowerCase().replace('_', ' ')}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleQuickPriorityUpdate = async (report: EquipmentMaintenanceReport, newPriority: string) => {
    try {
      const reportData = {
        id: report.id,
        equipment_id: report.equipment_id,
        issue_description: report.issue_description,
        remarks: report.remarks || undefined,
        inspection_details: report.inspection_details || undefined,
        action_taken: report.action_taken || undefined,
        priority: newPriority,
        status: report.status,
        downtime_hours: report.downtime_hours || undefined,
        location_id: report.location_id,
        parts_replaced: report.parts_replaced || [],
        attachment_urls: report.attachment_urls || [],
        date_repaired: report.date_repaired,
      };

      await updateMaintenanceReportMutation.mutateAsync(reportData);
      toast.success(`Priority updated to ${newPriority.toLowerCase()}`);
    } catch {
      toast.error("Failed to update priority");
    }
  };

  // File upload helper function  
  const uploadFileToSupabase = useCallback(async (file: File, prefix: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', `maintenance-${prefix}`);
    
    const uploadResponse = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (uploadResponse.ok) {
      const result = await uploadResponse.json();
      return result.url;
    } else {
      throw new Error(`Upload failed for ${prefix}`);
    }
  }, []);


  // Helper functions for tab and form management
  const getActiveTab = (reportId: string) => activeTabs[reportId] || 'details';
  
  const setActiveTab = useCallback((reportId: string, tab: 'details' | 'parts' | 'attachments') => {
    setActiveTabs(prev => ({ ...prev, [reportId]: tab }));
  }, []);
  
  const initializeFormData = useCallback((report: EquipmentMaintenanceReport, force = false) => {
    if (!reportFormData[report.id] || force) {
      setReportFormData(prev => ({
        ...prev,
        [report.id]: {
          issue_description: report.issue_description || "",
          remarks: report.remarks || "",
          inspection_details: report.inspection_details || "",
          action_taken: report.action_taken || "",
          priority: report.priority || "MEDIUM",
          status: report.status || "REPORTED",
          downtime_hours: report.downtime_hours?.toString() || "",
          location_id: report.location_id || "",
          parts_replaced: report.parts_replaced || [],
          attachment_urls: report.attachment_urls || [],
        }
      }));
    }
  }, [reportFormData]);
  
  const updateFormData = useCallback((reportId: string, field: keyof ReportFormData, value: string | string[]) => {
    setReportFormData(prev => ({
      ...prev,
      [reportId]: {
        ...prev[reportId],
        [field]: value
      }
    }));
  }, []);

  // State for tracking attachment files per report  
  const [reportAttachmentFiles, setReportAttachmentFiles] = useState<Record<string, (File | null)[]>>({});

  const updateAttachmentFile = useCallback((reportId: string, index: number, file: File | null) => {
    setReportAttachmentFiles(prev => {
      const currentFiles = prev[reportId] || [];
      const newFiles = [...currentFiles];
      newFiles[index] = file;
      return {
        ...prev,
        [reportId]: newFiles
      };
    });
  }, []);

  const addPartToReport = useCallback((reportId: string) => {
    const currentParts = reportFormData[reportId]?.parts_replaced || [];
    updateFormData(reportId, "parts_replaced", [...currentParts, ""]);
  }, [reportFormData, updateFormData]);

  const removePartFromReport = useCallback((reportId: string, index: number) => {
    const currentParts = [...(reportFormData[reportId]?.parts_replaced || [])];
    currentParts.splice(index, 1);
    updateFormData(reportId, "parts_replaced", currentParts);
  }, [reportFormData, updateFormData]);

  const addAttachmentToReport = useCallback((reportId: string) => {
    const currentAttachments = reportFormData[reportId]?.attachment_urls || [];
    updateFormData(reportId, "attachment_urls", [...currentAttachments, ""]);
  }, [reportFormData, updateFormData]);

  const removeAttachmentFromReport = useCallback((reportId: string, index: number) => {
    const currentAttachments = [...(reportFormData[reportId]?.attachment_urls || [])];
    currentAttachments.splice(index, 1);
    updateFormData(reportId, "attachment_urls", currentAttachments);
  }, [reportFormData, updateFormData]);

  // Comprehensive update function for main save changes
  const handleFullUpdate = useCallback(async (report: EquipmentMaintenanceReport, reportId: string) => {
    try {
      const formData = reportFormData[reportId];
      if (!formData) {
        toast.error("No form data available");
        return;
      }

      if (!formData.issue_description?.trim()) {
        toast.error("Issue description is required");
        return;
      }

      // Handle file uploads - all files go to attachments folder
      const uploadedAttachmentUrls: string[] = [];

      // Upload attachment files
      const attachmentFiles = reportAttachmentFiles[reportId] || [];
      for (let i = 0; i < attachmentFiles.length; i++) {
        const file = attachmentFiles[i];
        if (file) {
          try {
            const uploadedUrl = await uploadFileToSupabase(file, 'attachments');
            uploadedAttachmentUrls.push(uploadedUrl);
          } catch {
            toast.error(`Failed to upload attachment ${i + 1}`);
            return;
          }
        }
      }

      // Combine existing URLs with newly uploaded files and manual URLs
      const existingAttachmentUrls = report.attachment_urls || [];
      const filteredManualUrls = (formData.attachment_urls || []).filter((url: string) => url.trim() !== "");
      
      // Create final attachment URLs array (all files in one place)
      const finalAttachmentUrls = [
        ...existingAttachmentUrls,
        ...uploadedAttachmentUrls,
        ...filteredManualUrls
      ];

      const reportData = {
        id: report.id,
        equipment_id: report.equipment_id,
        issue_description: formData.issue_description,
        remarks: formData.remarks || undefined,
        inspection_details: formData.inspection_details || undefined,
        action_taken: formData.action_taken || undefined,
        priority: formData.priority,
        status: formData.status,
        downtime_hours: formData.downtime_hours || undefined,
        location_id: formData.location_id || report.location_id,
        parts_replaced: (formData.parts_replaced || []).filter((part: string) => part.trim() !== ""),
        attachment_urls: finalAttachmentUrls,
        date_repaired: formData.status === "COMPLETED" && !report.date_repaired 
          ? new Date().toISOString() 
          : report.date_repaired,
      };

      await updateMaintenanceReportMutation.mutateAsync(reportData);
      toast.success("Maintenance report updated successfully");
      
      // Clear file states after successful update
      setReportAttachmentFiles(prev => ({ ...prev, [reportId]: [] }));
      
    } catch {
      toast.error("Failed to update maintenance report");
    }
  }, [reportFormData, reportAttachmentFiles, uploadFileToSupabase, updateMaintenanceReportMutation]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Invalid Date";
    }
  };


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Loading maintenance reports...
          </p>
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" />
            Add Report
          </Button>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-4 bg-gray-200 rounded flex-1 max-w-xs"></div>
                    <div className="flex gap-1">
                      <div className="h-5 w-16 bg-gray-200 rounded"></div>
                      <div className="h-5 w-12 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="ml-4">
                  <div className="h-4 w-4 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {equipmentReports.length} maintenance report
              {equipmentReports.length !== 1 ? "s" : ""} found
            </p>
          </div>
          {!isEditMode && (
            <Button
              onClick={() => {
                console.log('Add Report button clicked - setting maintenance modal open');
                setIsMaintenanceModalOpen(true);
              }}
              disabled={isMaintenanceModalOpen}
              className="gap-2"
            >
              {isMaintenanceModalOpen ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Add Report
            </Button>
          )}
        </div>

        {equipmentReports.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No maintenance reports yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track equipment maintenance, repairs, and inspections by creating
              your first report
            </p>
            {!isEditMode && (
              <Button
                onClick={() => {
                  console.log('Create First Report button clicked - setting maintenance modal open');
                  setIsMaintenanceModalOpen(true);
                }}
                disabled={isMaintenanceModalOpen}
                className="gap-2"
              >
                {isMaintenanceModalOpen ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Create First Report
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {equipmentReports.map((report) => {
              const isExpanded = isEditMode ? true : expandedReports.has(report.id);
              
              const toggleExpanded = () => {
                if (isEditMode) return; // Disable collapsible in edit mode
                
                const newExpanded = new Set(expandedReports);
                if (isExpanded) {
                  newExpanded.delete(report.id);
                } else {
                  newExpanded.add(report.id);
                  // Initialize form data when expanding
                  initializeFormData(report);
                }
                setExpandedReports(newExpanded);
              };

              // Initialize form data for edit mode
              if (isEditMode && !reportFormData[report.id]) {
                initializeFormData(report);
              }

              return (
                <Card key={report.id} className="overflow-hidden">
                  <CardHeader 
                    className={`pb-3 ${!isEditMode ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors`}
                    onClick={() => {
                      if (isEditMode) {
                        // Do nothing in edit mode - no collapsible behavior
                        return;
                      } else {
                        setSelectedMaintenanceReportForDetail(report);
                        setIsMaintenanceReportDetailOpen(true);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left side - Main info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-2">
                          <CardTitle className="text-sm flex-1 leading-tight">
                            {report.issue_description}
                          </CardTitle>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge className={getStatusColor(report.status)} variant="outline">
                              {report.status || "REPORTED"}
                            </Badge>
                            <Badge className={getPriorityColor(report.priority)} variant="outline">
                              {report.priority || "MEDIUM"}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Secondary info */}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(report.date_reported)}</span>
                          </div>
                          
                          {report.reported_user && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span className="truncate max-w-[100px] sm:max-w-[120px]">{report.reported_user.full_name}</span>
                            </div>
                          )}

                          {report.parts_replaced && report.parts_replaced.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              <span>{report.parts_replaced.length} part{report.parts_replaced.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right side - Expand/collapse indicator */}
                      {!isEditMode && (
                        <div className="ml-4 flex-shrink-0">
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  {/* Full edit interface with tabs */}
                  {isEditMode && isExpanded && reportFormData[report.id] && (
                    <div className="border-t">
                      {/* Header */}
                      <div className="border-b bg-gray-50 p-4">
                        <h3 className="text-lg font-semibold text-gray-900">Edit Maintenance Report</h3>
                        <p className="text-sm text-gray-600">All sections are shown below - no tabs needed!</p>
                      </div>

                      {/* Tab Content */}
                      <div className="p-3 sm:p-4">
                          {/* Details Tab */}
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-blue-600">
                              <Settings className="h-5 w-5" />
                              Basic Details
                            </h3>
                            <div>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor={`issue_description_${report.id}`} className="text-sm font-medium">
                                  Issue Description *
                                </Label>
                                <Textarea
                                  id={`issue_description_${report.id}`}
                                  value={reportFormData[report.id]?.issue_description || ""}
                                  onChange={(e) => updateFormData(report.id, "issue_description", e.target.value)}
                                  placeholder="Describe the issue or maintenance required..."
                                  className="min-h-[80px] text-sm"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Priority
                                  </Label>
                                  <Select
                                    value={reportFormData[report.id]?.priority || "MEDIUM"}
                                    onValueChange={(value) => {
                                      updateFormData(report.id, "priority", value);
                                      handleQuickPriorityUpdate(report, value);
                                    }}
                                  >
                                    <SelectTrigger className="text-sm">
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
                                  <Label className="text-sm font-medium flex items-center gap-2">
                                    <Settings className="h-4 w-4" />
                                    Status
                                  </Label>
                                  <Select
                                    value={reportFormData[report.id]?.status || "REPORTED"}
                                    onValueChange={(value) => {
                                      updateFormData(report.id, "status", value);
                                      handleQuickStatusUpdate(report, value);
                                    }}
                                  >
                                    <SelectTrigger className="text-sm">
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
                                <Label htmlFor={`downtime_hours_${report.id}`} className="text-sm font-medium flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Downtime Hours
                                </Label>
                                <Input
                                  id={`downtime_hours_${report.id}`}
                                  type="number"
                                  step="0.1"
                                  value={reportFormData[report.id]?.downtime_hours || ""}
                                  onChange={(e) => updateFormData(report.id, "downtime_hours", e.target.value)}
                                  placeholder="0.0"
                                  className="text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`inspection_details_${report.id}`} className="text-sm font-medium">
                                  Inspection Details
                                </Label>
                                <Textarea
                                  id={`inspection_details_${report.id}`}
                                  value={reportFormData[report.id]?.inspection_details || ""}
                                  onChange={(e) => updateFormData(report.id, "inspection_details", e.target.value)}
                                  placeholder="Describe the inspection findings..."
                                  className="min-h-[60px] text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`action_taken_${report.id}`} className="text-sm font-medium">
                                  Action Taken
                                </Label>
                                <Textarea
                                  id={`action_taken_${report.id}`}
                                  value={reportFormData[report.id]?.action_taken || ""}
                                  onChange={(e) => updateFormData(report.id, "action_taken", e.target.value)}
                                  placeholder="Describe the actions taken..."
                                  className="min-h-[60px] text-sm"
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`remarks_${report.id}`} className="text-sm font-medium">
                                  Additional Remarks
                                </Label>
                                <Textarea
                                  id={`remarks_${report.id}`}
                                  value={reportFormData[report.id]?.remarks || ""}
                                  onChange={(e) => updateFormData(report.id, "remarks", e.target.value)}
                                  placeholder="Additional remarks or notes..."
                                  className="min-h-[60px] text-sm"
                                />
                              </div>
                            </div>
                            </div>
                          </div>

                          {/* Parts Tab */}
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-600">
                              <Wrench className="h-5 w-5" />
                              Parts Replaced
                            </h3>
                            <div>
                            <div className="space-y-4">
                              <div className="flex justify-end mb-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addPartToReport(report.id)}
                                  className="text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Part
                                </Button>
                              </div>
                              
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mb-4">
                                🔧 <strong>Parts Replaced:</strong> List the specific parts that were replaced during this maintenance (text only).
                              </div>
                              
                              <div className="space-y-3">
                                {(reportFormData[report.id]?.parts_replaced || []).map((part: string, index: number) => (
                                  <div key={index} className="flex gap-2 items-center p-3 border rounded-lg bg-gray-50">
                                    <Wrench className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                    <Input
                                      value={part}
                                      onChange={(e) => {
                                        const currentParts = [...(reportFormData[report.id]?.parts_replaced || [])];
                                        currentParts[index] = e.target.value;
                                        updateFormData(report.id, "parts_replaced", currentParts);
                                      }}
                                      placeholder={`e.g., "Engine oil filter", "Brake pads - front left", "Transmission fluid"`}
                                      className="flex-1 text-sm border-none bg-transparent focus:bg-white"
                                    />
                                    {(reportFormData[report.id]?.parts_replaced || []).length > 1 && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => removePartFromReport(report.id, index)}
                                        className="px-2 flex-shrink-0"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                
                                {(!reportFormData[report.id]?.parts_replaced || reportFormData[report.id]?.parts_replaced.length === 0) && (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No parts added yet. Click "Add Part" to get started.
                                  </p>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>

                          {/* Attachments Tab */}
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-purple-600">
                              <Camera className="h-5 w-5" />
                              Attachments & Images
                            </h3>
                            <div>
                            <div className="space-y-4">
                              <div className="flex justify-end mb-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addAttachmentToReport(report.id)}
                                  className="text-xs"
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Attachment
                                </Button>
                              </div>
                              
                              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800 mb-4">
                                📸 <strong>Attachments:</strong> Upload photos of work done, receipts, before/after images, or any documentation.
                              </div>
                              
                              {/* Display existing attachments in a grid */}
                              {report.attachment_urls && report.attachment_urls.length > 0 && (
                                <div className="space-y-3">
                                  <h5 className="text-sm font-medium text-gray-700">Current Attachments</h5>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {report.attachment_urls.map((url: string, index: number) => (
                                      <div key={index} className="relative group">
                                        <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                                          {url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                                            <img
                                              src={url}
                                              alt={`Attachment ${index + 1}`}
                                              className="w-full h-full object-cover cursor-pointer"
                                              onClick={() => window.open(url, '_blank')}
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                  parent.innerHTML = `
                                                    <div class="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                                                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                        <polyline points="14,2 14,8 20,8"/>
                                                      </svg>
                                                      <span class="text-xs mt-1">Failed to load</span>
                                                    </div>
                                                  `;
                                                }
                                              }}
                                            />
                                          ) : (
                                            <a 
                                              href={url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors"
                                            >
                                              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                <polyline points="14,2 14,8 20,8"/>
                                              </svg>
                                              <span className="text-xs text-center mt-1">Document</span>
                                            </a>
                                          )}
                                        </div>
                                        {/* Filename tooltip */}
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate">
                                          {url.split('/').pop()?.split('_').pop() || 'File'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Add new attachments section */}
                              <div className="space-y-4">
                                {(reportFormData[report.id]?.attachment_urls || []).map((url: string, index: number) => (
                                  <div key={index} className="space-y-2 p-3 border rounded-lg bg-gray-50">
                                    <FileUploadSectionSimple
                                      label={`New Attachment ${index + 1}`}
                                      accept="image/*,application/pdf,.doc,.docx"
                                      currentFileUrl={null}
                                      selectedFile={reportAttachmentFiles[report.id]?.[index] || null}
                                      onFileChange={(file) => updateAttachmentFile(report.id, index, file)}
                                      onKeepExistingChange={() => {}}
                                      required={false}
                                      hideChangeButton={true}
                                    />
                                    <div className="flex gap-2">
                                      <Input
                                        value={url}
                                        onChange={(e) => {
                                          const currentUrls = [...(reportFormData[report.id]?.attachment_urls || [])];
                                          currentUrls[index] = e.target.value;
                                          updateFormData(report.id, "attachment_urls", currentUrls);
                                        }}
                                        placeholder="Or enter file URL manually..."
                                        className="flex-1 text-sm"
                                      />
                                      {(reportFormData[report.id]?.attachment_urls || []).length > 1 && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => removeAttachmentFromReport(report.id, index)}
                                          className="px-2"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                
                                {(!reportFormData[report.id]?.attachment_urls || reportFormData[report.id]?.attachment_urls.length === 0) && (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No attachments added yet. Click "Add Attachment" to get started.
                                  </p>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>
                        </div>

                      {/* Save Button */}
                      <div className="border-t bg-background p-3 sm:p-4">
                        <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Reset form data to original values
                                initializeFormData(report, true);
                                // Clear file states
                                setReportAttachmentFiles(prev => ({ ...prev, [report.id]: [] }));
                                toast.success("Form reset to original values");
                              }}
                              disabled={updateMaintenanceReportMutation.isPending}
                              className="text-xs"
                            >
                              Reset
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleFullUpdate(report, report.id)}
                              disabled={updateMaintenanceReportMutation.isPending}
                              className="text-xs"
                            >
                              {updateMaintenanceReportMutation.isPending ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Saving...
                                </>
                              ) : (
                                "Save Changes"
                              )}
                            </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Modal - only show when not in edit mode */}
      {!isEditMode && <EditEquipmentMaintenanceReportModal />}
    </>
  );
}
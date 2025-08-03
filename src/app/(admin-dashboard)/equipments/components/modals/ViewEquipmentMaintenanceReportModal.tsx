"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
// Removed old equipmentsStore import
import { useEquipmentStore, selectActiveModal, selectSelectedMaintenanceReport, selectMaintenanceReportMode } from "@/stores/equipmentStore";
import { useDeleteEquipmentMaintenanceReport } from "@/hooks/useEquipmentQuery";
import { useDialogManager } from "@/hooks/useDialogManager";
import {
  Calendar,
  Edit3,
  Eye,
  MapPin,
  Trash2,
  User,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ViewEquipmentMaintenanceReportModal() {
  const selectedMaintenanceReport = useEquipmentStore(selectSelectedMaintenanceReport);
  const maintenanceReportMode = useEquipmentStore(selectMaintenanceReportMode);
  const activeModal = useEquipmentStore(selectActiveModal);
  const { openMaintenanceReportEdit, closeMaintenanceReport } = useEquipmentStore();
  const deleteMaintenanceReportMutation = useDeleteEquipmentMaintenanceReport();
  
  // Use the new dialog manager with callbacks
  const dialog = useDialogManager({
    onConfirm: async (dialogId) => {
      if (dialogId === 'delete-confirm' && selectedMaintenanceReport) {
        try {
          await deleteMaintenanceReportMutation.mutateAsync(selectedMaintenanceReport.id);
          toast.success("Maintenance report deleted successfully");
          dialog.openSuccess();
          setTimeout(() => {
            handleClose();
          }, 1000);
        } catch {
          toast.error("Failed to delete maintenance report");
        }
      }
    }
  });

  const handleClose = () => {
    dialog.closeAll();
    closeMaintenanceReport();
  };

  const handleEdit = () => {
    if (selectedMaintenanceReport) {
      openMaintenanceReportEdit(selectedMaintenanceReport);
    }
  };

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
      case "CRITICAL":
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LOW":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  // Simple render condition using unified state
  // Show when we have a selected report in view mode, regardless of which modal is active
  const shouldShow = Boolean(
    selectedMaintenanceReport && 
    maintenanceReportMode === 'view'
  );
  
  if (!shouldShow || !selectedMaintenanceReport) {
    return null;
  }

  return (
    <>
      {/* Main Details Dialog */}
      <Dialog open={shouldShow && !dialog.hasOpenDialogs} onOpenChange={handleClose}>
      <DialogContent 
        className="!max-w-none !w-[80vw] max-h-[90vh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '80vw', width: '80vw' }}
        aria-describedby="maintenance-report-description"
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl mb-2">
                Maintenance Report Details
              </DialogTitle>
              <DialogDescription id="maintenance-report-description">
                View detailed information about this maintenance report including issue description, technical details, parts replaced, and attachments.
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getStatusColor(selectedMaintenanceReport.status ?? undefined)}>
                  {selectedMaintenanceReport.status}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(selectedMaintenanceReport.priority ?? undefined)}>
                  {selectedMaintenanceReport.priority}
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Calendar className="h-3 w-3" />
                  {formatDate(selectedMaintenanceReport.date_reported)}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 pr-2">
          <div className="space-y-6">
            {/* Issue Description */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Issue Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{selectedMaintenanceReport.issue_description}</p>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Report Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reported By</label>
                    <div className="flex items-center gap-2 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedMaintenanceReport.reported_by || "Unknown"}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Downtime Hours</label>
                    <div className="text-sm mt-1">{selectedMaintenanceReport.downtime_hours || "0"}</div>
                  </div>
                  {selectedMaintenanceReport.date_repaired && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Date Repaired</label>
                      <div className="text-sm mt-1">{formatDate(selectedMaintenanceReport.date_repaired)}</div>
                    </div>
                  )}
                  {selectedMaintenanceReport.repaired_by && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Repaired By</label>
                      <div className="text-sm mt-1">{selectedMaintenanceReport.repaired_by}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            {(selectedMaintenanceReport.inspection_details || selectedMaintenanceReport.action_taken) && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Technical Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedMaintenanceReport.inspection_details && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Inspection Details</label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedMaintenanceReport.inspection_details}</p>
                    </div>
                  )}
                  {selectedMaintenanceReport.action_taken && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Action Taken</label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedMaintenanceReport.action_taken}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Parts Replaced */}
            {selectedMaintenanceReport.parts_replaced && selectedMaintenanceReport.parts_replaced.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Parts Replaced
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedMaintenanceReport.parts_replaced.map((part: string, index: number) => (
                      <li key={index}>{part}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {(() => {
              // Handle attachment_urls being either string or array
              let attachmentUrls: string[] = [];
              if (selectedMaintenanceReport.attachment_urls) {
                if (Array.isArray(selectedMaintenanceReport.attachment_urls)) {
                  attachmentUrls = selectedMaintenanceReport.attachment_urls.filter(url => url && url.trim() !== "");
                } else if (typeof selectedMaintenanceReport.attachment_urls === 'string') {
                  // Try to parse as JSON, fallback to single URL
                  try {
                    const parsed = JSON.parse(selectedMaintenanceReport.attachment_urls);
                    attachmentUrls = Array.isArray(parsed) ? parsed.filter(url => url && url.trim() !== "") : [selectedMaintenanceReport.attachment_urls].filter(url => url.trim() !== "");
                  } catch {
                    attachmentUrls = [selectedMaintenanceReport.attachment_urls].filter(url => url.trim() !== "");
                  }
                }
              }
              
              return attachmentUrls.length > 0 && (
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      Attachments ({attachmentUrls.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {attachmentUrls.map((url: string, index: number) => (
                      <div 
                        key={index} 
                        className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-white hover:border-blue-300 transition-all cursor-pointer"
                        onClick={() => window.open(url, '_blank')}
                      >
                        {url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ? (
                          <>
                            <img
                              src={url}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="h-6 w-6 text-white" />
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors">
                            <MapPin className="h-8 w-8 mb-2" />
                            <span className="text-xs text-center px-2">
                              {url.split('/').pop()?.split('.').pop()?.toUpperCase() || 'DOC'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* Remarks */}
            {selectedMaintenanceReport.remarks && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Remarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{selectedMaintenanceReport.remarks}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
            
        {/* Fixed Footer with Action Buttons */}
        <DialogFooter className="flex-shrink-0 pt-4 border-t bg-background">
          <div className="flex gap-2 w-full justify-between">
            <Button type="button" variant="outline" onClick={handleClose} size="lg">
              Close
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleEdit}
                size="lg"
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={dialog.openDeleteConfirm}
                size="lg"
                className="gap-2"
                data-testid="delete-maintenance-report-button"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={dialog.isOpen('delete-confirm')} 
        onOpenChange={(open) => open ? dialog.openDeleteConfirm() : dialog.closeDeleteConfirm()}
      >
        <DialogContent data-testid="delete-confirmation-dialog">
          <DialogHeader>
            <DialogTitle>Delete Maintenance Report</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this maintenance report? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => dialog.cancel('delete-confirm')}
              data-testid="cancel-delete-button"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => dialog.confirm('delete-confirm')}
              disabled={deleteMaintenanceReportMutation.isPending}
              className="gap-2"
              data-testid="confirm-delete-button"
            >
              <Trash2 className="h-4 w-4" />
              {deleteMaintenanceReportMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog 
        open={dialog.isOpen('success')} 
        onOpenChange={(open) => open ? dialog.openSuccess() : dialog.closeSuccess()}
      >
        <DialogContent data-testid="success-dialog">
          <DialogHeader>
            <DialogTitle>Success</DialogTitle>
            <DialogDescription>
              The maintenance report has been deleted successfully.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleClose} data-testid="success-close-button">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { useEquipmentsStore, selectIsMobile } from "@/stores/equipmentsStore";
import { useDeleteEquipmentMaintenanceReport } from "@/hooks/useEquipmentsQuery";
import {
  Calendar,
  Clock,
  Edit,
  MapPin,
  User,
  Wrench,
  X,
  Trash2,
  ExternalLink,
  Camera,
  FileText
} from "lucide-react";
import { useState, useCallback } from "react";

export default function MaintenanceReportDetailDrawer() {
  // State from Zustand
  const isMobile = useEquipmentsStore(selectIsMobile);
  const selectedReport = useEquipmentsStore((state) => state.selectedMaintenanceReportForDetail);
  const isOpen = useEquipmentsStore((state) => state.isMaintenanceReportDetailOpen);
  const { 
    setIsMaintenanceReportDetailOpen, 
    setSelectedMaintenanceReportForDetail,
    setSelectedEquipmentMaintenanceReport,
    setIsModalOpen 
  } = useEquipmentsStore();

  // Server state
  const deleteMaintenanceReportMutation = useDeleteEquipmentMaintenanceReport();
  
  // Local state for delete confirmation
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleClose = useCallback(() => {
    setIsMaintenanceReportDetailOpen(false);
    setSelectedMaintenanceReportForDetail(null);
    // Reopen equipment detail drawer
    setIsModalOpen(true);
  }, [setIsMaintenanceReportDetailOpen, setSelectedMaintenanceReportForDetail, setIsModalOpen]);

  const handleEdit = useCallback(() => {
    if (!selectedReport) return;
    // Set report for edit modal
    setSelectedEquipmentMaintenanceReport(selectedReport);
    // Close this drawer and reopen equipment detail
    handleClose();
  }, [selectedReport, setSelectedEquipmentMaintenanceReport, handleClose]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedReport) return;

    try {
      await deleteMaintenanceReportMutation.mutateAsync(selectedReport.id);
      setShowDeleteConfirmation(false);
      handleClose();
    } catch (error) {
      console.error("Error deleting maintenance report:", error);
    }
  }, [selectedReport, deleteMaintenanceReportMutation, handleClose]);

  const handleDeleteCancel = useCallback(() => {
    setShowDeleteConfirmation(false);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return "Invalid Date";
    }
  }, []);

  const getStatusColor = useCallback((status?: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800 border-green-200";
      case "IN_PROGRESS":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "REPORTED":
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  }, []);

  const getPriorityColor = useCallback((priority?: string) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-100 text-red-800 border-red-200";
      case "HIGH":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LOW":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

  if (!isOpen || !selectedReport) return null;

  // Report content component
  const ReportContent = () => (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-3">{selectedReport.issue_description}</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge className={getStatusColor(selectedReport.status)}>
            {selectedReport.status || "REPORTED"}
          </Badge>
          <Badge className={getPriorityColor(selectedReport.priority)}>
            {selectedReport.priority || "MEDIUM"} Priority
          </Badge>
        </div>
      </div>

      {/* Key Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Reported:</span>
            <span>{formatDate(selectedReport.date_reported)}</span>
          </div>

          {selectedReport.date_repaired && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Completed:</span>
              <span>{formatDate(selectedReport.date_repaired)}</span>
            </div>
          )}

          {selectedReport.downtime_hours && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Downtime:</span>
              <span>{selectedReport.downtime_hours} hours</span>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {selectedReport.reported_user && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Reported by:</span>
              <span>{selectedReport.reported_user.full_name}</span>
            </div>
          )}

          {selectedReport.repaired_user && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Repaired by:</span>
              <span>{selectedReport.repaired_user.full_name}</span>
            </div>
          )}

          {selectedReport.location && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Location:</span>
              <span>{selectedReport.location.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Details Sections */}
      {selectedReport.inspection_details && (
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Inspection Details
          </h3>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{selectedReport.inspection_details}</p>
          </div>
        </div>
      )}

      {selectedReport.action_taken && (
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Action Taken
          </h3>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{selectedReport.action_taken}</p>
          </div>
        </div>
      )}

      {selectedReport.remarks && (
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Additional Remarks
          </h3>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm whitespace-pre-wrap">{selectedReport.remarks}</p>
          </div>
        </div>
      )}

      {/* Parts Replaced */}
      {selectedReport.parts_replaced && selectedReport.parts_replaced.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Parts Replaced ({selectedReport.parts_replaced.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedReport.parts_replaced.map((part, index) => (
              <Badge
                key={`${selectedReport.id}-part-${index}-${part}`}
                variant="outline"
                className="justify-start p-2 h-auto"
              >
                {part}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Attachments */}
      {selectedReport.attachment_urls && selectedReport.attachment_urls.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Attachments ({selectedReport.attachment_urls.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {selectedReport.attachment_urls.map((url, index) => {
              const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
              
              return (
                <div key={`${selectedReport.id}-attachment-${index}-${url.split('/').pop()}`} className="border rounded-lg p-3">
                  {isImage ? (
                    <div className="space-y-2">
                      <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="max-w-full max-h-[80vh] sm:max-h-[65vh] lg:max-h-[55vh] xl:max-h-[45vh] object-contain rounded"
                        onError={(e) => {
                          console.error('Image load error:', e);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const errorDiv = target.nextElementSibling as HTMLElement;
                          if (errorDiv && errorDiv.classList.contains('image-error')) {
                            errorDiv.style.display = 'block';
                          }
                        }}
                        onLoad={() => {
                          console.log('Image loaded successfully:', url);
                        }}
                      />
                      <div className="image-error hidden text-sm text-muted-foreground text-center py-4 bg-muted rounded">
                        <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p>Failed to load image</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => window.open(url, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open in new tab
                        </Button>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center gap-1"
                        onClick={() => window.open(url, "_blank")}
                      >
                        <ExternalLink className="h-3 w-3" />
                        Open Full Size
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start gap-2 h-auto p-3"
                      onClick={() => window.open(url, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span className="text-left">
                        <div className="font-medium">Attachment {index + 1}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {url.split('/').pop()}
                        </div>
                      </span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );


  // Render delete confirmation dialog separately
  const DeleteConfirmationDialog = () => (
    <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
      <DialogContent className="w-[95vw] max-w-[425px] mx-auto p-0 overflow-hidden">
        <div className="p-6 flex flex-col h-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Maintenance Report
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The maintenance report will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this maintenance report?
            </p>

            {selectedReport && (
              <div className="bg-muted/50 p-4 rounded-lg border">
                <div className="space-y-2">
                  <p className="font-medium text-sm break-words">
                    {selectedReport.issue_description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    <Badge className={getStatusColor(selectedReport.status)} variant="outline">
                      {selectedReport.status || "REPORTED"}
                    </Badge>
                    <Badge className={getPriorityColor(selectedReport.priority)} variant="outline">
                      {selectedReport.priority || "MEDIUM"} Priority
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Reported: {formatDate(selectedReport.date_reported)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 sm:gap-2 pt-4 mt-4 border-t">
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleteMaintenanceReportMutation.isPending}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMaintenanceReportMutation.isPending}
              className="gap-2 w-full sm:w-auto order-1 sm:order-2"
            >
              {deleteMaintenanceReportMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Report
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Return both the main component and confirmation dialog
  return (
    <>
      {/* Main content - either drawer or dialog */}
      {isMobile ? (
        <Drawer open={isOpen} onOpenChange={handleClose}>
          <DrawerContent className="!max-h-[95vh]">
            <DrawerHeader className="p-4 pb-4 flex-shrink-0 border-b relative">
              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="absolute right-4 top-4 rounded-full h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
              <DrawerTitle className="text-xl font-bold">
                Maintenance Report Details
              </DrawerTitle>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <ReportContent />
            </div>
            <DrawerFooter className="p-4 pt-2 border-t bg-background">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  className="flex-1 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteClick}
                  disabled={deleteMaintenanceReportMutation.isPending}
                  className="flex-1 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Maintenance Report Details</DialogTitle>
            </DialogHeader>
            <ReportContent />
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button variant="outline" onClick={handleEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit Report
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteClick}
                disabled={deleteMaintenanceReportMutation.isPending}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Report
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog />
    </>
  );
}
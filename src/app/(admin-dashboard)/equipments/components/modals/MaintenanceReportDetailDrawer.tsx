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
// Removed old equipmentsStore import
import { useEquipmentStore, selectIsMobile } from "@/stores/equipmentStore";
import { useDeleteEquipmentMaintenanceReport } from "@/hooks/useEquipmentQuery";
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
  FileText,
  Eye
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import Image from "next/image";

export default function MaintenanceReportDetailDrawer() {
  // State from Zustand
  const isMobile = useEquipmentStore(selectIsMobile);
  const selectedReport = useEquipmentStore((state) => state.selectedMaintenanceReportForDetail);
  const isOpen = useEquipmentStore((state) => state.isMaintenanceReportDetailOpen);
  const { 
    setIsMaintenanceReportDetailOpen, 
    setSelectedMaintenanceReportForDetail,
    setSelectedMaintenanceReportForEdit,
    setIsEditMaintenanceReportDrawerOpen,
    setIsModalOpen 
  } = useEquipmentStore();

  // Server state
  const deleteMaintenanceReportMutation = useDeleteEquipmentMaintenanceReport();
  
  // Local state for delete confirmation, tab navigation and image viewer
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'parts' | 'attachments'>('details');
  const [imageViewer, setImageViewer] = useState<{isOpen: boolean, url: string, title: string}>({isOpen: false, url: '', title: ''});

  // Reset tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
    }
  }, [isOpen]);

  // Stable tab change handler
  const handleTabChange = useCallback((tab: 'details' | 'parts' | 'attachments') => {
    setActiveTab(tab);
  }, []);

  const handleClose = useCallback(() => {
    setIsMaintenanceReportDetailOpen(false);
    setSelectedMaintenanceReportForDetail(null);
    // Reopen equipment modal after closing detail drawer
    setIsModalOpen(true);
  }, [setIsMaintenanceReportDetailOpen, setSelectedMaintenanceReportForDetail, setIsModalOpen]);

  const handleEdit = useCallback(() => {
    if (!selectedReport) return;
    // Set report for edit drawer
    setSelectedMaintenanceReportForEdit(selectedReport);
    setIsEditMaintenanceReportDrawerOpen(true);
    // Close this drawer
    setIsMaintenanceReportDetailOpen(false);
    setSelectedMaintenanceReportForDetail(null);
    // Close equipment modal to prevent navigation conflicts (same as opening detail from main modal)
    setIsModalOpen(false);
  }, [selectedReport, setSelectedMaintenanceReportForEdit, setIsEditMaintenanceReportDrawerOpen, setIsMaintenanceReportDetailOpen, setSelectedMaintenanceReportForDetail, setIsModalOpen]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedReport) return;

    try {
      await deleteMaintenanceReportMutation.mutateAsync(selectedReport.id);
      setShowDeleteConfirmation(false);
      // Close this drawer and reopen equipment modal
      setIsMaintenanceReportDetailOpen(false);
      setSelectedMaintenanceReportForDetail(null);
      setIsModalOpen(true);
    } catch (error) {
    }
  }, [selectedReport, deleteMaintenanceReportMutation, setIsMaintenanceReportDetailOpen, setSelectedMaintenanceReportForDetail, setIsModalOpen]);

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
      case "CRITICAL": // Legacy data - map to HIGH color
      case "HIGH":
        return "bg-red-100 text-red-800 border-red-200";
      case "MEDIUM":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LOW":
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }, []);

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

  // Helper functions for counts
  const getPartsCount = () => {
    return selectedReport?.parts_replaced?.filter((part: string) => part && part.trim() !== "").length || 0;
  };

  const getAttachmentsCount = () => {
    if (!selectedReport?.attachment_urls) return 0;
    // FIXED: All attachments are standalone - no part-specific attachments in current implementation
    return selectedReport.attachment_urls.filter((url: string) => url && url.trim() !== "").length;
  };

  // Image Viewer Component - EXACTLY like equipment modal
  const ImageViewerModal = () => (
    <Dialog open={imageViewer.isOpen} onOpenChange={() => setImageViewer({isOpen: false, url: '', title: ''})}>
      <DialogContent 
        className="!max-w-none p-4 
          w-[95vw] max-h-[85vh] sm:w-[80vw] sm:max-h-[70vh] lg:w-[60vw] lg:max-h-[65vh] xl:w-[40vw] xl:max-h-[60vh]" 
        style={{ 
          maxWidth: 'min(95vw, 800px)', 
          width: 'min(95vw, 800px)'
        }}
      >
        <DialogHeader className="pb-4">
          <DialogTitle className="text-center">
            {imageViewer.title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center">
          <Image
            src={imageViewer.url}
            alt={imageViewer.title}
            width={800}
            height={600}
            className="max-w-full max-h-[70vh] sm:max-h-[55vh] lg:max-h-[50vh] xl:max-h-[45vh] object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={(e) => {
            }}
            onLoad={() => {
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );

  if (!isOpen || !selectedReport) return null;

  // Report content component
  const ReportContent = () => (
    <div className="space-y-4">
      {/* Tab Navigation - Mobile and Desktop */}
      <div className={`w-full mb-6 ${isMobile ? 'grid grid-cols-3 bg-muted rounded-md p-1' : 'flex justify-center border-b'}`}>
        {isMobile ? (
          <>
            {renderTabButton('details', 'Details', <FileText className="h-4 w-4" />)}
            {renderTabButton('parts', 'Parts', <Wrench className="h-4 w-4" />, getPartsCount() > 0 ? getPartsCount() : undefined)}
            {renderTabButton('attachments', 'Images', <Camera className="h-4 w-4" />, getAttachmentsCount() > 0 ? getAttachmentsCount() : undefined)}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => handleTabChange('details')}
              className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'details'
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <FileText className="h-4 w-4" />
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
              {getPartsCount() > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getPartsCount()}
                </span>
              )}
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
              Attachments
              {getAttachmentsCount() > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {getAttachmentsCount()}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div className={`space-y-6 ${isMobile ? '' : 'border-t pt-4'}`}>
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
        </div>
      )}

      {/* Parts Tab */}
      {activeTab === 'parts' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Parts Replaced
            </h3>
            <p className="text-sm text-muted-foreground">
              Components and parts that were replaced during this maintenance
            </p>
          </div>
          
          
          {selectedReport.parts_replaced && selectedReport.parts_replaced.filter((part: string) => part && part.trim() !== "").length > 0 ? (
            <div className="space-y-4">
              {selectedReport.parts_replaced.filter((part: string) => part && part.trim() !== "").map((part: string, index: number) => {
                return (
                  <div key={`${selectedReport.id}-part-${index}-${part}`} className="border rounded-lg p-4 space-y-3">
                    {/* Part Name - Full Width */}
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm flex-1">{part}</span>
                    </div>
                    
                    {/* FIXED: No part-specific images in current implementation */}
                    {/* Parts are displayed as text only, images are shown in Attachments tab */}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No parts were replaced in this maintenance</p>
            </div>
          )}
        </div>
      )}

      {/* Attachments Tab */}
      {activeTab === 'attachments' && (
        <div className={`space-y-4 ${isMobile ? '' : 'border-t pt-4'}`}>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Attachments & Images
            </h3>
            <p className="text-sm text-muted-foreground">
              Photos, documents and reference materials for this maintenance report
            </p>
          </div>
          
          {(() => {
            if (!selectedReport.attachment_urls) return null;
            
            // FIXED: Show all attachments since none are part-specific in current implementation
            const allAttachments = selectedReport.attachment_urls.filter((url: string) => url && url.trim() !== "");
            
            return allAttachments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {allAttachments.map((url: string, attachmentIndex: number) => {
                  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                  
                  return (
                    <div key={`${selectedReport.id}-attachment-${attachmentIndex}-${url.split('/').pop()}`} className="border rounded-lg p-3">
                    {isImage ? (
                      <div className="space-y-2">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                          <div className="relative w-full max-w-[200px] mx-auto group">
                            <div 
                              className="relative cursor-pointer"
                              onClick={() => {
                                setImageViewer({isOpen: true, url: url, title: `Attachment ${attachmentIndex + 1}`});
                              }}
                            >
                              <Image
                                src={url}
                                alt={`Attachment ${attachmentIndex + 1}`}
                                width={200}
                                height={200}
                                className="w-full h-[200px] object-cover rounded hover:opacity-80 transition-opacity"
                                onError={(e) => {
                                }}
                                onLoad={() => {
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-0 transition-opacity bg-black/40 rounded">
                                <Eye className="h-6 w-6 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-center">Click to view full image</p>
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
                          <div className="font-medium">Attachment {attachmentIndex + 1}</div>
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
            ) : (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No attachments available for this report</p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );


  // Render delete confirmation dialog separately
  const DeleteConfirmationDialog = () => (
    <Dialog open={showDeleteConfirmation} onOpenChange={handleDeleteCancel}>
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
          <DrawerContent className="!max-h-[95dvh]">
            <DrawerHeader className="p-4 pb-4 flex-shrink-0 border-b relative">
              <DrawerClose asChild>
                <Button variant="ghost" size="sm" className="absolute right-4 top-4 rounded-full h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </DrawerClose>
              <DrawerTitle className="text-xl font-bold">
                Maintenance Report Details
              </DrawerTitle>
              <p className="text-sm text-muted-foreground mt-1">
                View maintenance report details, parts replaced, and attachments
              </p>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <ReportContent />
            </div>
            <DrawerFooter className="p-4 pt-2 border-t bg-background">
              <div className="flex gap-3">
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteClick}
                  disabled={deleteMaintenanceReportMutation.isPending}
                  className="flex-1 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleEdit}
                  className="flex-1 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent 
            className="!max-w-none !w-[55vw] max-h-[95dvh] overflow-hidden flex flex-col p-6"
            style={{ maxWidth: '55vw', width: '55vw' }}
          >
            <DialogHeader className="flex-shrink-0 pb-4">
              <DialogTitle className="text-xl">Maintenance Report Details</DialogTitle>
              <p className="text-sm text-muted-foreground">
                View detailed maintenance report information and attachments
              </p>
            </DialogHeader>
            
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="p-0">
                <ReportContent />
              </div>
            </div>
            
            {/* Desktop Action Buttons in Footer */}
            <DialogFooter className="pt-4 border-t bg-background">
              <div className="flex gap-2 w-full justify-end">
                <Button variant="outline" onClick={handleClose} size="lg">
                  Close
                </Button>
                <Button 
                  variant="default" 
                  onClick={handleEdit}
                  className="gap-2"
                  size="lg"
                >
                  <Edit className="h-4 w-4" />
                  Edit Report
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteClick}
                  disabled={deleteMaintenanceReportMutation.isPending}
                  className="gap-2"
                  size="lg"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Report
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog />
      
      {/* Image viewer modal */}
      <ImageViewerModal />
    </>
  );
}
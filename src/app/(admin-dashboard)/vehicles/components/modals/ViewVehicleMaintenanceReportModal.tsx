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
import { useVehiclesStore } from "@/stores/vehiclesStore";
import { useDeleteMaintenanceReport } from "@/hooks/useVehiclesQuery";
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

export default function ViewVehicleMaintenanceReportModal() {
  const selectedReportForView = useVehiclesStore((state) => state.selectedMaintenanceReportForDetail);
  const isDetailOpen = useVehiclesStore((state) => state.isMaintenanceReportDetailOpen);
  const { 
    setSelectedMaintenanceReportForDetail,
    setSelectedMaintenanceReportForEdit,
    setIsMaintenanceReportDetailOpen,
    setIsModalOpen 
  } = useVehiclesStore();
  const deleteMaintenanceReportMutation = useDeleteMaintenanceReport();

  const handleClose = () => {
    setSelectedMaintenanceReportForDetail(null);
    setIsMaintenanceReportDetailOpen(false);
  };

  const handleEdit = () => {
    if (selectedReportForView) {
      // Close view modal
      setSelectedMaintenanceReportForDetail(null);
      setIsMaintenanceReportDetailOpen(false);
      // Open edit modal
      setSelectedMaintenanceReportForEdit(selectedReportForView);
    }
  };

  const handleDelete = async () => {
    if (!selectedReportForView) return;
    
    if (window.confirm("Are you sure you want to delete this maintenance report?")) {
      try {
        await deleteMaintenanceReportMutation.mutateAsync(selectedReportForView.id);
        toast.success("Maintenance report deleted successfully");
        handleClose();
      } catch {
        toast.error("Failed to delete maintenance report");
      }
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

  // Only render when conditions are met
  const shouldShow = Boolean(selectedReportForView && isDetailOpen);
  
  if (!selectedReportForView || !shouldShow) {
    return null;
  }

  return (
    <Dialog open={shouldShow} onOpenChange={handleClose}>
      <DialogContent 
        className="!max-w-none !w-[80vw] max-h-[90vh] overflow-hidden flex flex-col p-6"
        style={{ maxWidth: '80vw', width: '80vw' }}
        aria-describedby="vehicle-maintenance-report-description"
      >
        <DialogHeader className="flex-shrink-0 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl mb-2">
                Vehicle Maintenance Report Details
              </DialogTitle>
              <DialogDescription id="vehicle-maintenance-report-description">
                View detailed information about this vehicle maintenance report including issue description, technical details, parts replaced, and attachments.
              </DialogDescription>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={getStatusColor(selectedReportForView.status)}>
                  {selectedReportForView.status}
                </Badge>
                <Badge variant="outline" className={getPriorityColor(selectedReportForView.priority)}>
                  {selectedReportForView.priority}
                </Badge>
                <div className="flex items-center gap-1 text-muted-foreground text-sm">
                  <Calendar className="h-3 w-3" />
                  {formatDate(selectedReportForView.date_reported)}
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
                <p className="text-sm whitespace-pre-wrap">{selectedReportForView.issue_description}</p>
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
                      <span className="text-sm">{selectedReportForView.reported_user?.full_name || "Unknown"}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Downtime Hours</label>
                    <div className="text-sm mt-1">{selectedReportForView.downtime_hours || "0"}</div>
                  </div>
                  {selectedReportForView.date_repaired && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Date Repaired</label>
                      <div className="text-sm mt-1">{formatDate(selectedReportForView.date_repaired)}</div>
                    </div>
                  )}
                  {selectedReportForView.repaired_user && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Repaired By</label>
                      <div className="text-sm mt-1">{selectedReportForView.repaired_user.full_name}</div>
                    </div>
                  )}
                  {selectedReportForView.location && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Location</label>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{selectedReportForView.location.address}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Technical Details */}
            {(selectedReportForView.inspection_details || selectedReportForView.action_taken) && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Technical Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedReportForView.inspection_details && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Inspection Details</label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedReportForView.inspection_details}</p>
                    </div>
                  )}
                  {selectedReportForView.action_taken && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Action Taken</label>
                      <p className="text-sm mt-1 whitespace-pre-wrap">{selectedReportForView.action_taken}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Parts Replaced */}
            {selectedReportForView.parts_replaced && selectedReportForView.parts_replaced.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Parts Replaced
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {selectedReportForView.parts_replaced.map((part, index) => (
                      <li key={index}>{part}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {selectedReportForView.attachment_urls && selectedReportForView.attachment_urls.length > 0 && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Attachments ({selectedReportForView.attachment_urls.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {selectedReportForView.attachment_urls.map((url, index) => (
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
                            <FileText className="h-8 w-8 mb-2" />
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
            )}

            {/* Remarks */}
            {selectedReportForView.remarks && (
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Additional Remarks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{selectedReportForView.remarks}</p>
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
                onClick={handleDelete}
                size="lg"
                className="gap-2"
                disabled={deleteMaintenanceReportMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                {deleteMaintenanceReportMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
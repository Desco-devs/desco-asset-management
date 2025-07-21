"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Wrench, 
  MoreVertical, 
  Edit, 
  Trash2, 
  ExternalLink,
  Calendar,
  Clock,
  User,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { useVehiclesStore } from "@/stores/vehiclesStore";
import { useMaintenanceReports, useDeleteMaintenanceReport } from "@/hooks/useVehiclesQuery";
import CreateMaintenanceReportModal from "./CreateMaintenanceReportModal";
import EditMaintenanceReportModal from "./EditMaintenanceReportModal";
import { toast } from "sonner";

interface VehicleMaintenanceReportsEnhancedProps {
  vehicleId: string;
}

export default function VehicleMaintenanceReportsEnhanced({ vehicleId }: VehicleMaintenanceReportsEnhancedProps) {
  const { data: maintenanceReports = [], isLoading } = useMaintenanceReports();
  const { setIsMaintenanceModalOpen, setSelectedMaintenanceReport } = useVehiclesStore();
  const deleteMaintenanceReportMutation = useDeleteMaintenanceReport();
  
  // Filter reports for this specific vehicle
  const vehicleReports = Array.isArray(maintenanceReports) 
    ? maintenanceReports.filter(report => report.vehicle_id === vehicleId)
    : [];

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'REPORTED':
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleDelete = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this maintenance report? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteMaintenanceReportMutation.mutateAsync(reportId);
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  const handleEdit = (report: any) => {
    setSelectedMaintenanceReport(report);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Loading maintenance reports...</p>
          <Button disabled className="gap-2">
            <Plus className="h-4 w-4" />
            Add Report
          </Button>
        </div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded mb-1 w-1/2"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
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
              {vehicleReports.length} maintenance report{vehicleReports.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <Button onClick={() => setIsMaintenanceModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Report
          </Button>
        </div>

        {vehicleReports.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance reports yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track vehicle maintenance, repairs, and inspections by creating your first report
            </p>
            <Button onClick={() => setIsMaintenanceModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Report
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicleReports.map((report) => (
              <div key={report.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-card">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg mb-2">{report.issue_description}</h4>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={getStatusColor(report.status)}>
                        {report.status || 'REPORTED'}
                      </Badge>
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority || 'MEDIUM'} Priority
                      </Badge>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(report)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Report
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(report.id)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Report
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="font-medium">Reported:</span>
                      <span>{formatDate(report.date_reported)}</span>
                    </div>
                    
                    {report.date_repaired && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Completed:</span>
                        <span>{formatDate(report.date_repaired)}</span>
                      </div>
                    )}
                    
                    {report.downtime_hours && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">Downtime:</span>
                        <span>{report.downtime_hours} hours</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {report.reported_user && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Reported by:</span>
                        <span>{report.reported_user.full_name}</span>
                      </div>
                    )}
                    
                    {report.repaired_user && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span className="font-medium">Repaired by:</span>
                        <span>{report.repaired_user.full_name}</span>
                      </div>
                    )}
                    
                    {report.location && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span className="font-medium">Location:</span>
                        <span>{report.location.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Sections */}
                {report.inspection_details && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Inspection Details:</h5>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {report.inspection_details}
                    </p>
                  </div>
                )}

                {report.action_taken && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Action Taken:</h5>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {report.action_taken}
                    </p>
                  </div>
                )}

                {report.remarks && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-1">Remarks:</h5>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                      {report.remarks}
                    </p>
                  </div>
                )}

                {/* Parts Replaced */}
                {report.parts_replaced && report.parts_replaced.length > 0 && (
                  <div className="mb-3">
                    <h5 className="font-medium text-sm mb-2">Parts Replaced:</h5>
                    <div className="flex flex-wrap gap-1">
                      {report.parts_replaced.map((part, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {part}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments */}
                {report.attachment_urls && report.attachment_urls.length > 0 && (
                  <div>
                    <h5 className="font-medium text-sm mb-2">Attachments:</h5>
                    <div className="flex flex-wrap gap-2">
                      {report.attachment_urls.map((url, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Attachment {index + 1}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CreateMaintenanceReportModal vehicleId={vehicleId} />
      
      {/* Edit Modal */}
      <EditMaintenanceReportModal />
    </>
  );
}
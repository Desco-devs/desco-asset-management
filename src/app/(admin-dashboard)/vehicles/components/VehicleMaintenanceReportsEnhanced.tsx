"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMaintenanceReports,
  useDeleteMaintenanceReport,
} from "@/hooks/useVehiclesQuery";
import { useVehiclesStore, selectIsVehicleMaintenanceModalOpen, type MaintenanceReport } from "@/stores/vehiclesStore";
import {
  Calendar,
  Eye,
  Loader2,
  Plus,
  User,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditVehicleMaintenanceReportModal from "./modals/EditVehicleMaintenanceReportModal";
import ViewVehicleMaintenanceReportModal from "./modals/ViewVehicleMaintenanceReportModal";
import { toast } from "sonner";

interface VehicleMaintenanceReportsEnhancedProps {
  vehicleId: string;
}

export default function VehicleMaintenanceReportsEnhanced({
  vehicleId,
}: VehicleMaintenanceReportsEnhancedProps) {
  const { data: maintenanceReports = [], isLoading } = useMaintenanceReports();
  const deleteMaintenanceReportMutation = useDeleteMaintenanceReport();
  const isMaintenanceModalOpen = useVehiclesStore(selectIsVehicleMaintenanceModalOpen);
  const [activeModal, setActiveModal] = useState<'maintenance-view' | 'maintenance-edit' | 'maintenance-create' | null>(null);
  const { 
    setIsVehicleMaintenanceModalOpen, 
    setIsModalOpen,
    setSelectedMaintenanceReportForDetail,
    setIsMaintenanceReportDetailOpen,
    setSelectedMaintenanceReportForEdit
  } = useVehiclesStore();


  // Filter reports for this specific vehicle
  const vehicleReports = Array.isArray(maintenanceReports)
    ? maintenanceReports.filter((report) => report.vehicle_id === vehicleId)
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

  // Simple CRUD functions with unified modal coordination
  const handleViewReport = (report: MaintenanceReport) => {
    // Use unified modal coordination - this will close all other modals
    setActiveModal('maintenance-view');
    // Set the report data
    setSelectedMaintenanceReportForDetail(report);
    setIsMaintenanceReportDetailOpen(true);
    // Clear any edit state
    setSelectedMaintenanceReportForEdit(null);
  };

  const handleEditReport = (report: MaintenanceReport) => {
    // Use unified modal coordination - this will close all other modals
    setActiveModal('maintenance-edit');
    // Set the report data for editing
    setSelectedMaintenanceReportForEdit(report);
    // Clear view state
    setIsMaintenanceReportDetailOpen(false);
    setSelectedMaintenanceReportForDetail(null);
  };

  const handleDeleteReport = async (report: MaintenanceReport) => {
    if (window.confirm("Are you sure you want to delete this maintenance report?")) {
      try {
        await deleteMaintenanceReportMutation.mutateAsync(report.id);
        toast.success("Maintenance report deleted successfully");
      } catch {
        toast.error("Failed to delete maintenance report");
      }
    }
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Maintenance Reports</h3>
          <p className="text-sm text-muted-foreground">
            Track vehicle maintenance, repairs, and inspections
          </p>
        </div>
        <Button
          onClick={() => {
            // Use unified modal coordination - this will close all other modals
            setActiveModal('maintenance-create');
            // Clear any existing report state
            setIsMaintenanceReportDetailOpen(false);
            setSelectedMaintenanceReportForDetail(null);
            setSelectedMaintenanceReportForEdit(null);
            // Close vehicle modal and open create modal
            setIsModalOpen(false);
            setIsVehicleMaintenanceModalOpen(true);
          }}
          disabled={isMaintenanceModalOpen}
          className="gap-2 shrink-0"
        >
          {isMaintenanceModalOpen ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Report
        </Button>
      </div>

      {/* Reports List */}
      {vehicleReports.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No maintenance reports yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Track vehicle maintenance, repairs, and inspections by creating your first report
          </p>
          <Button
            onClick={() => {
              // Use unified modal coordination - this will close all other modals
              setActiveModal('maintenance-create');
              // Clear any existing report state
              setIsMaintenanceReportDetailOpen(false);
              setSelectedMaintenanceReportForDetail(null);
              setSelectedMaintenanceReportForEdit(null);
              // Close vehicle modal and open create modal
              setIsModalOpen(false);
              setIsVehicleMaintenanceModalOpen(true);
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
        </div>
      ) : (
        <div className="space-y-3">
          {vehicleReports.map((report) => (
            <Card key={report.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader 
                className="pb-3"
                onClick={() => handleViewReport(report)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base mb-2 line-clamp-2">
                      {report.issue_description}
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline" className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(report.date_reported)}
                      </div>
                      {report.reported_user && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="text-xs">{report.reported_user.full_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* View Indicator */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">Click to view</span>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Render modals conditionally to prevent conflicts */}
      <ViewVehicleMaintenanceReportModal />
      <EditVehicleMaintenanceReportModal />
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useMaintenanceReports,
  useDeleteMaintenanceReport,
} from "@/hooks/useVehiclesQuery";
import { useVehiclesStore, selectIsVehicleMaintenanceModalOpen, type MaintenanceReport } from "@/stores/vehiclesStore";
import {
  Calendar,
  ExternalLink,
  Loader2,
  MapPin,
  Plus,
  User,
  Wrench,
} from "lucide-react";
import EditVehicleMaintenanceReportModal from "./modals/EditVehicleMaintenanceReportModal";

interface VehicleMaintenanceReportsEnhancedProps {
  vehicleId: string;
}

export default function VehicleMaintenanceReportsEnhanced({
  vehicleId,
}: VehicleMaintenanceReportsEnhancedProps) {
  const { data: maintenanceReports = [], isLoading } = useMaintenanceReports();
  const deleteMaintenanceReportMutation = useDeleteMaintenanceReport();
  const isMaintenanceModalOpen = useVehiclesStore(selectIsVehicleMaintenanceModalOpen);
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

  const handleDelete = async (reportId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this maintenance report? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteMaintenanceReportMutation.mutateAsync(reportId);
    } catch {
      // Error handling is done in the mutation
    }
  };

  const handleEdit = (report: MaintenanceReport) => {
    setSelectedMaintenanceReportForEdit(report);
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
              {vehicleReports.length} maintenance report
              {vehicleReports.length !== 1 ? "s" : ""} found
            </p>
          </div>
          <Button
            onClick={() => {
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
            Add Report
          </Button>
        </div>

        {vehicleReports.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No maintenance reports yet
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track vehicle maintenance, repairs, and inspections by creating
              your first report
            </p>
            <Button
              onClick={() => {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicleReports.map((report) => (
              <div
                key={report.id}
                onClick={() => {
                  setSelectedMaintenanceReportForDetail(report);
                  setIsMaintenanceReportDetailOpen(true);
                  // Close vehicle modal in mobile to prevent navigation conflicts
                  setIsModalOpen(false);
                }}
                className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-card hover:border-primary/50"
              >
                {/* Header */}
                <div className="mb-3">
                  <h4 className="font-medium text-base mb-2 line-clamp-2">
                    {report.issue_description}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge className={getStatusColor(report.status)} variant="outline">
                      {report.status || "REPORTED"}
                    </Badge>
                    <Badge className={getPriorityColor(report.priority)} variant="outline">
                      {report.priority || "MEDIUM"}
                    </Badge>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(report.date_reported)}</span>
                  </div>
                  
                  {report.reported_user && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{report.reported_user.full_name}</span>
                    </div>
                  )}

                  {report.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{report.location.address}</span>
                    </div>
                  )}

                  {report.parts_replaced && report.parts_replaced.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      <span>{report.parts_replaced.length} part{report.parts_replaced.length !== 1 ? 's' : ''} replaced</span>
                    </div>
                  )}
                </div>

                {/* Action hint */}
                <div className="mt-3 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Click to view details</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <EditVehicleMaintenanceReportModal />
    </>
  );
}

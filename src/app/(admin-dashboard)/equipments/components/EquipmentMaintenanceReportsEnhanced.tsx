"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useEquipmentMaintenanceReports,
  useDeleteEquipmentMaintenanceReport,
} from "@/hooks/useEquipmentQuery";
import { useEquipmentStore, selectActiveModal } from "@/stores/equipmentStore";
import type { EquipmentMaintenanceReport } from "@/hooks/useEquipmentQuery";
import {
  Calendar,
  Eye,
  Loader2,
  Plus,
  User,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditEquipmentMaintenanceReportModal from "./modals/EditEquipmentMaintenanceReportModal";
import ViewEquipmentMaintenanceReportModal from "./modals/ViewEquipmentMaintenanceReportModal";
import { toast } from "sonner";

interface EquipmentMaintenanceReportsEnhancedProps {
  equipmentId: string;
}

export default function EquipmentMaintenanceReportsEnhanced({
  equipmentId,
}: EquipmentMaintenanceReportsEnhancedProps) {
  const { data: maintenanceReports = [], isLoading } = useEquipmentMaintenanceReports();
  const deleteMaintenanceReportMutation = useDeleteEquipmentMaintenanceReport();
  const isMaintenanceModalOpen = useEquipmentStore(state => state.isMaintenanceModalOpen);
  const activeModal = useEquipmentStore(selectActiveModal);
  const { setIsMaintenanceModalOpen, setActiveModal } = useEquipmentStore();
  const { 
    setSelectedEquipmentMaintenanceReport,
    setSelectedMaintenanceReportForDetail,
    setIsMaintenanceReportDetailOpen
  } = useEquipmentStore();

  // Helper function to deduplicate maintenance reports in component
  const deduplicateReports = (reports: EquipmentMaintenanceReport[]) => {
    const seen = new Set<string>();
    return reports.filter(report => {
      if (seen.has(report.id)) {
        console.warn('🚨 Duplicate equipment maintenance report found and removed in component:', report.id);
        return false;
      }
      seen.add(report.id);
      return true;
    });
  };

  // Filter reports for this specific equipment (memoized for performance)
  const equipmentReports = useMemo(() => {
    if (!Array.isArray(maintenanceReports)) return [];
    
    const filtered = maintenanceReports.filter((report) => report.equipment_id === equipmentId);
    const deduplicated = deduplicateReports(filtered);
    
    // Log if duplicates were found after filtering
    if (filtered.length !== deduplicated.length) {
      console.warn(`🔍 Found ${filtered.length - deduplicated.length} duplicate maintenance reports for equipment ${equipmentId}`);
    }
    
    return deduplicated;
  }, [maintenanceReports, equipmentId]);

  const getStatusColor = (status?: string | null) => {
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

  const getPriorityColor = (priority?: string | null) => {
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

  // Simple CRUD functions with unified modal coordination
  const handleViewReport = (report: EquipmentMaintenanceReport) => {
    // Use unified modal coordination - this will close all other modals
    setActiveModal('maintenance-view');
    // Set the report data
    setSelectedMaintenanceReportForDetail(report);
    setIsMaintenanceReportDetailOpen(true);
    // Clear any edit state
    setSelectedEquipmentMaintenanceReport(null);
  };

  const handleEditReport = (report: EquipmentMaintenanceReport) => {
    // Use unified modal coordination - this will close all other modals
    setActiveModal('maintenance-edit');
    // Set the report data for editing
    setSelectedEquipmentMaintenanceReport(report);
    // Clear view state
    setIsMaintenanceReportDetailOpen(false);
    setSelectedMaintenanceReportForDetail(null);
  };

  const handleDeleteReport = async (report: EquipmentMaintenanceReport) => {
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
            Track equipment maintenance, repairs, and inspections
          </p>
        </div>
        <Button
          onClick={() => {
            // Use unified modal coordination - this will close all other modals
            setActiveModal('maintenance-create');
            // Clear any existing report state
            setIsMaintenanceReportDetailOpen(false);
            setSelectedMaintenanceReportForDetail(null);
            setSelectedEquipmentMaintenanceReport(null);
            // Open create modal
            setIsMaintenanceModalOpen(true);
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
      {equipmentReports.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Wrench className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No maintenance reports yet
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Track equipment maintenance, repairs, and inspections by creating your first report
          </p>
          <Button
            onClick={() => {
              // Use unified modal coordination - this will close all other modals
              setActiveModal('maintenance-create');
              // Clear any existing report state
              setIsMaintenanceReportDetailOpen(false);
              setSelectedMaintenanceReportForDetail(null);
              setSelectedEquipmentMaintenanceReport(null);
              // Open create modal
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
        </div>
      ) : (
        <div className="space-y-3">
          {equipmentReports.map((report) => (
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
                      {report.reported_by && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span className="text-xs">{report.reported_by}</span>
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
      <ViewEquipmentMaintenanceReportModal />
      <EditEquipmentMaintenanceReportModal />
    </div>
  );
}
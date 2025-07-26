"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useEquipmentMaintenanceReports,
} from "@/hooks/useEquipmentsQuery";
import { useEquipmentsStore, type EquipmentMaintenanceReport, selectIsEquipmentMaintenanceModalOpen } from "@/stores/equipmentsStore";
import {
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Plus,
  User,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import EditEquipmentMaintenanceReportModal from "./modals/EditEquipmentMaintenanceReportModal";

interface EquipmentMaintenanceReportsEnhancedProps {
  equipmentId: string;
  isEditMode?: boolean;
}

export default function EquipmentMaintenanceReportsEnhanced({
  equipmentId,
  isEditMode = false,
}: EquipmentMaintenanceReportsEnhancedProps) {
  const { data: maintenanceReports = [], isLoading } = useEquipmentMaintenanceReports();
  const isMaintenanceModalOpen = useEquipmentsStore(selectIsEquipmentMaintenanceModalOpen);
  const { 
    setIsEquipmentMaintenanceModalOpen, 
    setIsModalOpen,
    setSelectedMaintenanceReportForDetail,
    setIsMaintenanceReportDetailOpen,
    setIsEditMaintenanceReportModalOpen,
    setSelectedMaintenanceReportForEdit
  } = useEquipmentsStore();
  
  // State for expanded reports
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

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


  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            Loading maintenance reports...
          </p>
          {isEditMode && (
            <Button disabled className="gap-2">
              <Plus className="h-4 w-4" />
              Add Report
            </Button>
          )}
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
          {isEditMode && (
            <Button
              onClick={() => {
                setIsModalOpen(false);
                setIsEquipmentMaintenanceModalOpen(true);
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
            {isEditMode && (
              <Button
                onClick={() => {
                  setIsModalOpen(false);
                  setIsEquipmentMaintenanceModalOpen(true);
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
              const isExpanded = expandedReports.has(report.id);
              
              const toggleExpanded = () => {
                const newExpanded = new Set(expandedReports);
                if (isExpanded) {
                  newExpanded.delete(report.id);
                } else {
                  newExpanded.add(report.id);
                }
                setExpandedReports(newExpanded);
              };

              return (
                <Card key={report.id} className="overflow-hidden">
                  <CardHeader 
                    className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      if (isEditMode) {
                        toggleExpanded();
                      } else {
                        setSelectedMaintenanceReportForDetail(report);
                        setIsMaintenanceReportDetailOpen(true);
                        setIsModalOpen(false);
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
                      <div className="ml-4 flex-shrink-0">
                        {isEditMode ? (
                          isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {/* Collapsible content for edit mode */}
                  {isEditMode && isExpanded && (
                    <CardContent className="pt-0">
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="text-sm text-muted-foreground mb-2">Edit mode interface will be implemented here</p>
                        <p className="text-xs text-muted-foreground">This will include editable fields and tabs for the maintenance report</p>
                      </div>
                    </CardContent>
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
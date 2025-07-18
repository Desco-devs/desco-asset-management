"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, AlertTriangle } from "lucide-react";
import { MaintenanceReport } from "./MaintenanceReportModal";

// Shared types for Equipment and MaintenanceReport

export interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate?: string;
  before?: number;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
  plateNumber?: string;
  originalReceiptUrl?: string;
  equipmentRegistrationUrl?: string;
  thirdpartyInspectionImage?: string;
  pgpcInspectionImage?: string;
  equipmentParts?: string[];
  project: {
    uid: string;
    name: string;
    client: {
      uid: string;
      name: string;
      location: {
        uid: string;
        address: string;
      };
    };
  };
}



interface ReportSelectionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reports: MaintenanceReport[];
  onSelectReport: (report: MaintenanceReport) => void;
  onDeleteReport: (report: MaintenanceReport) => void;
  action: "edit" | "delete";
}

const ReportSelectionDialog = ({
  isOpen,
  onOpenChange,
  reports,
  onSelectReport,
  onDeleteReport,
  action,
}: ReportSelectionDialogProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "LOW":
        return "bg-green-100 text-green-800";
      case "MEDIUM":
        return "bg-yellow-100 text-yellow-800";
      case "HIGH":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "REPORTED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-orange-100 text-orange-800";
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh]"
        style={{ maxWidth: "800px" }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Select Report to {action === "edit" ? "Edit" : "Delete"}
          </DialogTitle>
          <DialogDescription>
            This equipment has {reports.length} maintenance report
            {reports.length !== 1 ? "s" : ""}. Select the one you want to{" "}
            {action}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[90vh] scroll-none">
          <div className="space-y-3">
            {reports
              .sort(
                (a, b) =>
                  new Date(b.dateReported).getTime() -
                  new Date(a.dateReported).getTime()
              )
              .map((report) => (
                <div
                  key={report.uid}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-2 line-clamp-2">
                        {report.issueDescription}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Reported:{" "}
                          {new Date(report.dateReported).toLocaleDateString()}
                        </span>
                        <User className="h-3 w-3 ml-2" />
                        <span>By: {report.reportedBy}</span>
                      </div>
                      <div className="flex gap-2">
                        <Badge className={getPriorityColor(report.priority)}>
                          {report.priority}
                        </Badge>
                        <Badge className={getStatusColor(report.status)}>
                          {report.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-4">
                      {action === "edit" ? (
                        <Button
                          size="sm"
                          onClick={() => onSelectReport(report)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Edit
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => onDeleteReport(report)}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>

                  {report.remarks && (
                    <div className="text-xs text-muted-foreground mt-2 p-2 bg-gray-100 rounded">
                      <strong>Remarks:</strong>{" "}
                      {report.remarks.substring(0, 100)}
                      {report.remarks.length > 100 && "..."}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ReportSelectionDialog;

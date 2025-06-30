"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { MaintenanceReport } from "./MaintenanceReportModal";

interface ReportDeleteAlertDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  report: MaintenanceReport | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting?: boolean;
}

const ReportDeleteAlertDialog = ({
  isOpen,
  onOpenChange,
  report,
  onConfirm,
  onCancel,
  isDeleting = false,
}: ReportDeleteAlertDialogProps) => {
  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Maintenance Report
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this maintenance report?
          </AlertDialogDescription>
          {report && (
            <div className="mt-2 text-sm">
              <p className="font-medium">Issue:</p>
              <p className="text-muted-foreground">
                {report.issueDescription.substring(0, 100)}
                {report.issueDescription.length > 100 ? "..." : ""}
              </p>
              <p className="mt-2 font-medium">Reported by:</p>
              <p className="text-muted-foreground">{report.reportedBy}</p>
              <p className="mt-2 font-medium">Status:</p>
              <p className="text-muted-foreground">
                {report.status.replace("_", " ")}
              </p>
            </div>
          )}
          <AlertDialogDescription className="text-red-600 font-medium mt-2">
            This will permanently delete the maintenance report and all its
            associated attachments. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-500 hover:bg-red-600 focus:ring-red-500 dark:text-accent-foreground"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                Deleting...
              </div>
            ) : (
              "Delete Report"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReportDeleteAlertDialog;

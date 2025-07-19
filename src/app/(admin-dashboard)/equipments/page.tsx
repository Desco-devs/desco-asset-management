// app/equipment/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Download, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import EquipmentCards from "./equipment-components/Equipments";

// API functions
async function getEquipments() {
  const response = await fetch("/api/equipments/getall");
  if (!response.ok) {
    throw new Error("Failed to fetch equipments");
  }
  return response.json();
}

async function getClients() {
  const response = await fetch("/api/clients/getall");
  if (!response.ok) {
    throw new Error("Failed to fetch clients");
  }
  return response.json();
}

async function getLocations() {
  const response = await fetch("/api/locations/getall");
  if (!response.ok) {
    throw new Error("Failed to fetch locations");
  }
  return response.json();
}

async function getAllMaintenanceReports() {
  const response = await fetch("/api/maintenance-reports");
  if (!response.ok) {
    throw new Error("Failed to fetch maintenance reports");
  }
  return response.json();
}

export default function EquipmentPage() {
  const [equipments, setEquipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportingReports, setExportingReports] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Create a memoized fetch function that can be called to refresh data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [equipmentsData, clientsData, locationsData] = await Promise.all([
        getEquipments(),
        getClients(),
        getLocations(),
      ]);

      setEquipments(equipmentsData);
      setClients(clientsData);
      setLocations(locationsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to handle equipment added/updated - this will refresh the equipment data
  const handleEquipmentAdded = useCallback(async () => {
    try {
      // Only refresh equipment data since clients and locations don't change
      const equipmentsData = await getEquipments();
      setEquipments(equipmentsData);
    } catch (error) {
      console.error("Error refreshing equipment data:", error);
    }
  }, []);

  // Export all maintenance reports function
  const exportAllMaintenanceReports = async () => {
    setExportingReports(true);
    setShowExportDialog(false); // Close the dialog

    try {
      // Fetch all maintenance reports
      const allReports = await getAllMaintenanceReports();

      if (allReports.length === 0) {
        toast.info("No maintenance reports found to export");
        return;
      }

      // Prepare data for export
      const dataToExport = allReports.map((report: unknown, index: number) => {
        const r = report as {
          equipment?: {
            brand?: string;
            model?: string;
            type?: string;
            plateNumber?: string;
            owner?: string;
            project?: { name?: string; client?: { name?: string } };
          };
          issueDescription?: string;
          priority?: string;
          status?: string;
          dateReported?: string;
          reportedBy?: string;
          repairedBy?: string;
          dateRepaired?: string;
          location?: { address?: string };
          downtimeHours?: string;
          partsReplaced?: string[];
          inspectionDetails?: string;
          actionTaken?: string;
          remarks?: string;
          attachmentUrls?: string[];
        };
        return {
          "Report #": index + 1,
          "Equipment Brand": r.equipment?.brand || "",
          "Equipment Model": r.equipment?.model || "",
          "Equipment Type": r.equipment?.type || "",
          "Plate Number": r.equipment?.plateNumber || "",
          "Equipment Owner": r.equipment?.owner || "",
          "Project Name": r.equipment?.project?.name || "",
          "Client Name": r.equipment?.project?.client?.name || "",
          "Issue Description": r.issueDescription || "",
          Priority: r.priority || "",
          Status: r.status?.replace("_", " ") || "",
          "Reported Date": r.dateReported
            ? new Date(r.dateReported).toLocaleDateString()
            : "",
          "Reported By": r.reportedBy || "",
          "Assigned To": r.repairedBy || "",
          "Repaired Date": r.dateRepaired
            ? new Date(r.dateRepaired).toLocaleDateString()
            : "",
          Location: r.location?.address || "",
          "Downtime Hours": r.downtimeHours || "",
          "Parts Replaced": r.partsReplaced?.join(", ") || "",
          "Inspection Details": r.inspectionDetails || "",
          "Action Taken": r.actionTaken || "",
          Remarks: r.remarks || "",
          "Attachments Count": r.attachmentUrls?.length || 0,
          "Created Date": r.dateReported
            ? new Date(r.dateReported).toISOString()
            : "",
        };
      });

      // Create CSV content
      const headers = Object.keys(dataToExport[0]);
      const csvContent = [
        headers.join(","),
        ...dataToExport.map((row: Record<string, unknown>) =>
          headers
            .map((header) => {
              const value = row[header as keyof typeof row];
              // Escape commas and quotes in CSV
              const stringValue = String(value);
              if (
                stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n")
              ) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(",")
        ),
      ].join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);

        // Generate filename with timestamp
        const dateStr = new Date().toISOString().split("T")[0];
        const timeStr = new Date()
          .toISOString()
          .split("T")[1]
          .split(".")[0]
          .replace(/:/g, "-");

        link.setAttribute(
          "download",
          `All_Maintenance_Reports_${dateStr}_${timeStr}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(
          `Successfully exported ${allReports.length} maintenance reports!`
        );
      }
    } catch (error) {
      console.error("Error exporting maintenance reports:", error);
      toast.error("Failed to export maintenance reports. Please try again.");
    } finally {
      setExportingReports(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="container mx-auto py-[5dvh]">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading equipment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-[5dvh] p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Equipment Management</h1>
            <p className="text-muted-foreground">
              View and filter all equipment across projects
            </p>
          </div>

          {/* Export All Reports Button with AlertDialog */}
          <AlertDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={exportingReports}
                className="flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
              >
                {exportingReports ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <AlertTriangle className="h-4 w-4" />
                    Export All Issues
                  </>
                )}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-orange-600" />
                  Export All Maintenance Reports
                </AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to export ALL maintenance reports from ALL
                  equipment in the system. This will download a comprehensive
                  CSV file containing all maintenance data.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Content outside AlertDialogDescription to avoid nesting issues */}
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    The CSV file will include:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm ml-4 text-muted-foreground">
                    <li>All equipment details and specifications</li>
                    <li>Complete issue descriptions and priorities</li>
                    <li>Maintenance history and status updates</li>
                    <li>Personnel assignments and timelines</li>
                    <li>Parts replacements and downtime records</li>
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>Note:</strong> This action cannot be undone and may
                    take a moment to process.
                  </p>
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={exportAllMaintenanceReports}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV File
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <EquipmentCards
        equipments={equipments}
        clients={clients}
        locations={locations}
        onEquipmentAdded={handleEquipmentAdded}
      />
    </div>
  );
}

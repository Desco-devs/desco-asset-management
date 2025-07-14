"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  MapPin,
  PenTool,
  Search,
  Settings,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Equipment, MaintenanceReport } from "./MaintenanceReportModal";

interface ViewReportsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reports: MaintenanceReport[] | [];
  equipment: Equipment | null;
  onEditReport?: (report: MaintenanceReport) => void;
  onDeleteReport?: (report: MaintenanceReport) => void;
  showActions?: boolean;
}

const ViewReportsModal = ({
  isOpen,
  onOpenChange,
  reports,
  equipment,
  onEditReport,
  onDeleteReport,
  showActions = false,
}: ViewReportsModalProps) => {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "REPORTED":
        return <AlertTriangle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <PenTool className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Filter and search logic
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Priority filter
      const priorityMatch =
        selectedPriority === "all" || report.priority === selectedPriority;

      // Status filter
      const statusMatch =
        selectedStatus === "all" || report.status === selectedStatus;

      // Search filter (searches in issue description, remarks, inspection details, and action taken)
      const searchMatch =
        searchTerm === "" ||
        report.issueDescription
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (report.remarks &&
          report.remarks.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.inspectionDetails &&
          report.inspectionDetails
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        (report.actionTaken &&
          report.actionTaken
            .toLowerCase()
            .includes(searchTerm.toLowerCase())) ||
        report.reportedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.repairedBy &&
          report.repairedBy.toLowerCase().includes(searchTerm.toLowerCase()));

      return priorityMatch && statusMatch && searchMatch;
    });
  }, [reports, selectedPriority, selectedStatus, searchTerm]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedPriority("all");
    setSelectedStatus("all");
  };

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm !== "" || selectedPriority !== "all" || selectedStatus !== "all";

  // Export to Excel function
  const exportToExcel = () => {
    // Use the filtered reports for export
    const dataToExport = filteredReports.map((report) => ({
      "Report #": reports.findIndex((r) => r.uid === report.uid) + 1,
      Equipment: equipment
        ? `${equipment.brand} ${equipment.model}${
            equipment.plateNumber ? ` (${equipment.plateNumber})` : ""
          }`
        : "",
      "Issue Description": report.issueDescription,
      Priority: report.priority,
      Status: report.status.replace("_", " "),
      "Reported Date": new Date(report.dateReported).toLocaleDateString(),
      "Reported By": report.reportedBy,
      "Assigned To": report.repairedBy || "",
      "Repaired Date": report.dateRepaired
        ? new Date(report.dateRepaired).toLocaleDateString()
        : "",
      Location: report.location.address,
      "Downtime Hours": report.downtimeHours || "",
      "Parts Replaced": report.partsReplaced.join(", "),
      "Inspection Details": report.inspectionDetails || "",
      "Action Taken": report.actionTaken || "",
      Remarks: report.remarks || "",
      "Attachments Count": report.attachmentUrls.length,
      "Created Date": new Date(report.dateReported).toISOString(),
    }));

    // Create CSV content
    if (dataToExport.length === 0) {
      alert("No reports to export");
      return;
    }

    const headers = Object.keys(dataToExport[0]);
    const csvContent = [
      headers.join(","),
      ...dataToExport.map((row) =>
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

      // Generate filename
      const equipmentName = equipment
        ? `${equipment.brand}_${equipment.model}`.replace(/\s+/g, "_")
        : "Equipment";
      const dateStr = new Date().toISOString().split("T")[0];
      const filterSuffix = hasActiveFilters ? "_filtered" : "";

      link.setAttribute(
        "download",
        `Maintenance_Reports_${equipmentName}_${dateStr}${filterSuffix}.csv`
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  // Reset filters when modal closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      clearFilters();
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-4xl max-h-[90vh] flex flex-col"
        style={{ maxWidth: "900px" }}
      >
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Maintenance Reports
              </DialogTitle>
              <DialogDescription>
                View all maintenance reports for the selected equipment
              </DialogDescription>
              {/* Equipment info */}
              {equipment && (
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Settings className="h-4 w-4" />
                  <span className="font-medium">
                    {equipment.brand} {equipment.model}
                    {equipment.plateNumber && ` (${equipment.plateNumber})`}
                  </span>
                  <span>•</span>
                  <span>
                    {reports.length} total report
                    {reports.length !== 1 ? "s" : ""}
                  </span>
                  {hasActiveFilters && (
                    <>
                      <span>•</span>
                      <span className="text-blue-600 font-medium">
                        {filteredReports.length} filtered
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Export Button */}
            {filteredReports.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                className="flex items-center gap-2 mr-8"
              >
                <Download className="h-4 w-4" />
                Export to CSV
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Filters Section */}
        <div className="space-y-4 border-b pb-4">
          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
            <div className="flex flex-col items-end sm:flex-row gap-3 w-full  h-fit">
              {/* Priority Filter */}
              <div className="flex-none space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Priority
                </label>
                <Select
                  value={selectedPriority}
                  onValueChange={setSelectedPriority}
                >
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="LOW">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Low
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIUM">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                          Medium
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          High
                        </Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status Filter */}
              <div className="flex-none space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Select
                  value={selectedStatus}
                  onValueChange={setSelectedStatus}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="REPORTED">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                          Reported
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          In Progress
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="COMPLETED">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Completed
                        </Badge>
                      </div>
                    </SelectItem>
                    <SelectItem value="CANCELLED">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-800 text-xs">
                          Cancelled
                        </Badge>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Search Bar */}
              <div className="flex-1 h-fit relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search issues, remarks, people, or actions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 w-full"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-2 text-xs text-red-500 border border-red-500  hover:text-red-600"
              >
                <X className="h-3 w-3" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Active filters:
              </span>

              {searchTerm && (
                <Badge variant="outline" className="text-xs">
                  Search: &quot;{searchTerm}&quot;
                </Badge>
              )}

              {selectedPriority !== "all" && (
                <Badge variant="outline" className="text-xs">
                  Priority: {selectedPriority}
                </Badge>
              )}

              {selectedStatus !== "all" && (
                <Badge variant="outline" className="text-xs">
                  Status: {selectedStatus.replace("_", " ")}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Reports List */}
        <ScrollArea className="flex-1 h-full overflow-y-auto">
          <div className="space-y-4 p-1">
            {filteredReports
              .sort(
                (a, b) =>
                  new Date(b.dateReported).getTime() -
                  new Date(a.dateReported).getTime()
              )
              .map((report) => (
                <div
                  key={report.uid}
                  className="border rounded-lg p-4 hover:border-red-500/20 transition-colors"
                >
                  {/* Header with Status and Priority */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(report.status)}
                      <span className="font-medium text-sm">
                        Report #
                        {reports.findIndex((r) => r.uid === report.uid) + 1}
                      </span>
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        {report.status}
                      </Badge>
                    </div>

                    {showActions && (
                      <div className="flex gap-2">
                        {onEditReport && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEditReport(report)}
                          >
                            Edit
                          </Button>
                        )}
                        {onDeleteReport && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDeleteReport(report)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Issue Description */}
                  <div className="mb-3">
                    <h4 className="font-medium text-sm mb-1">
                      Issue Description
                    </h4>
                    <p className="text-sm text-gray-700">
                      {report.issueDescription}
                    </p>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    {/* Left Column */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3 text-blue-500" />
                        <span className="text-muted-foreground">Reported:</span>
                        <span className="font-medium">
                          {new Date(report.dateReported).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <User className="h-3 w-3 text-green-500" />
                        <span className="text-muted-foreground">
                          Reported by:
                        </span>
                        <span className="font-medium">{report.reportedBy}</span>
                      </div>

                      {report.repairedBy && (
                        <div className="flex items-center gap-2 text-xs">
                          <PenTool className="h-3 w-3 text-orange-500" />
                          <span className="text-muted-foreground">
                            Assigned to:
                          </span>
                          <span className="font-medium">
                            {report.repairedBy}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-purple-500" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">
                          {report.location.address}
                        </span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-3">
                      {report.dateRepaired && (
                        <div className="flex items-center gap-2 text-xs">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-muted-foreground">
                            Repaired:
                          </span>
                          <span className="font-medium">
                            {new Date(report.dateRepaired).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {report.downtimeHours && (
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="h-3 w-3 text-red-500" />
                          <span className="text-muted-foreground">
                            Downtime:
                          </span>
                          <span className="font-medium">
                            {report.downtimeHours} hours
                          </span>
                        </div>
                      )}

                      {report.partsReplaced.length > 0 && (
                        <div className="flex items-start gap-2 text-xs">
                          <Settings className="h-3 w-3 text-blue-500 mt-0.5" />
                          <div>
                            <span className="text-muted-foreground">
                              Parts replaced:
                            </span>
                            <div className="font-medium">
                              {report.partsReplaced.join(", ")}
                            </div>
                          </div>
                        </div>
                      )}

                      {report.attachmentUrls.length > 0 && (
                        <div className="flex items-center gap-2 text-xs">
                          <FileText className="h-3 w-3 text-indigo-500" />
                          <span className="text-muted-foreground">
                            Attachments:
                          </span>
                          <span className="font-medium">
                            {report.attachmentUrls.length} file
                            {report.attachmentUrls.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator className="my-6" />

                  {/* Additional Details */}
                  <div className="space-y-2">
                    {report.inspectionDetails && (
                      <div className="p-2 rounded text-xs">
                        <strong className="font-semibold">
                          Inspection Details:
                        </strong>
                        <p className=" mt-1">{report.inspectionDetails}</p>
                      </div>
                    )}

                    {report.actionTaken && (
                      <div className="p-2 rounded text-xs">
                        <strong className="font-semibold">Action Taken:</strong>
                        <p className=" mt-1">{report.actionTaken}</p>
                      </div>
                    )}

                    {report.remarks && (
                      <div className="p-2 rounded text-xs">
                        <strong className="font-semibold">Remarks:</strong>
                        <p className=" mt-1">{report.remarks}</p>
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  {report.attachmentUrls.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <h5 className="text-xs font-medium text-gray-700 mb-2">
                        Attachments
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {report.attachmentUrls.map((url, attachmentIndex) => (
                          <Button
                            key={attachmentIndex}
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(url, "_blank")}
                            className="text-xs h-6"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            File {attachmentIndex + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </ScrollArea>

        {/* Empty States */}
        {reports.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Reports Found</h3>
              <p>This equipment has no maintenance reports yet.</p>
            </div>
          </div>
        )}

        {reports.length > 0 && filteredReports.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Matching Reports</h3>
              <p>No reports match your current filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewReportsModal;

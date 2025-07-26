"use client";

import { EquipmentFormDialog } from "@/app/components/custom-reusable/EquipmentFormDialog";
import EquipmentCardSkeleton from "@/components/assets/cards/EquipmentCardSkeleton";
import SharedFilters from "@/components/assets/filters/SharedFilters";
import {
  filterEquipment,
  hasActiveFilters,
} from "@/components/assets/utils/filterUtils";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { useFilterState } from "@/hooks/assets/useFilterState";
import { useServerPagination } from "@/hooks/useServerPagination";
import { createClient } from "@/lib/supabase";
import type { Client, Equipment, Location, Project } from "@/types/assets";
import {
  AlertTriangle,
  Car,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Plus,
  Settings,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import EquipmentAddModal from "./EquipmentAddModal";
import EquipmentModal from "./EquipmentModal";
import MaintenanceReportModal from "./MaintenanceReportModal";

interface EquipmentClientViewerProps {
  initialEquipment: Equipment[];
  initialClients: Client[];
  initialLocations: Location[];
  initialProjects: Project[];
  totalEquipmentCount: number;
}

// API function for maintenance reports
async function getAllMaintenanceReports() {
  const response = await fetch("/api/maintenance-reports");
  if (!response.ok) {
    throw new Error("Failed to fetch maintenance reports");
  }
  return response.json();
}

export default function EquipmentClientViewer({
  initialEquipment,
  initialClients,
  initialLocations,
  initialProjects,
  totalEquipmentCount,
}: EquipmentClientViewerProps) {
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [newItemIds, setNewItemIds] = useState<Set<string>>(new Set());
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exportingReports, setExportingReports] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Modal states for add/edit functionality
  const [isEditEquipmentOpen, setIsEditEquipmentOpen] = useState(false);
  const [isMaintenanceReportOpen, setIsMaintenanceReportOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(
    null
  );

  const supabase = createClient();

  // Filter state management
  const { filterState, updateFilter, clearFilters } = useFilterState();

  // Filter equipment based on selected filters and search query
  const filteredEquipment = useMemo(() => {
    const filtered = filterEquipment(equipment, filterState);
    return filtered;
  }, [equipment, filterState]);

  // Mobile detection hook
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Server-side pagination hook with mobile optimization
  const itemsPerPage = isMobile ? 6 : 12;
  const {
    data: paginatedEquipment,
    loading: paginationLoading,
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
  } = useServerPagination<Equipment>({
    initialData: filteredEquipment,
    totalCount: totalEquipmentCount,
    itemsPerPage,
    apiEndpoint: "/api/equipments/paginated",
    externalData: filteredEquipment,
  });

  // Get projects filtered by selected client and location
  const availableProjects = useMemo(() => {
    return initialProjects.filter((project) => {
      const matchesClient =
        filterState.selectedClient === "all" ||
        project.client.uid === filterState.selectedClient;
      const projectClient = initialClients.find(
        (c) => c.uid === project.client.uid
      );
      const matchesLocation =
        filterState.selectedLocation === "all" ||
        (projectClient && projectClient.location &&
          projectClient.location.uid === filterState.selectedLocation);

      return matchesClient && matchesLocation;
    });
  }, [
    initialProjects,
    initialClients,
    filterState.selectedClient,
    filterState.selectedLocation,
  ]);

  // Check if any filters are active
  const activeFilters = hasActiveFilters(filterState);

  // Function to handle equipment added/updated - refresh data
  const handleEquipmentAdded = useCallback(async () => {
    try {
      const response = await fetch("/api/equipments/getall");
      if (response.ok) {
        const updatedEquipment = await response.json();
        // Transform to match frontend types
        const serializedEquipment: Equipment[] = updatedEquipment.map(
          (item: unknown) => {
            const equipmentItem = item as {
              id: string;
              brand: string;
              model: string;
              type: string;
              insurance_expiration_date?: string;
              before?: number;
              status: string;
              remarks?: string;
              owner: string;
              image_url?: string;
              inspection_date?: string;
              plate_number?: string;
              original_receipt_url?: string;
              equipment_registration_url?: string;
              thirdparty_inspection_image?: string;
              pgpc_inspection_image?: string;
              equipment_parts?: string[];
              project: {
                id: string;
                name: string;
                client: {
                  id: string;
                  name: string;
                  location: {
                    id: string;
                    address: string;
                  };
                };
              };
            };
            return {
              uid: equipmentItem.id,
              brand: equipmentItem.brand,
              model: equipmentItem.model,
              type: equipmentItem.type,
              insuranceExpirationDate: equipmentItem.insurance_expiration_date
                ? new Date(
                    equipmentItem.insurance_expiration_date
                  ).toISOString()
                : "",
              before: equipmentItem.before || undefined,
              status: equipmentItem.status as "OPERATIONAL" | "NON_OPERATIONAL",
              remarks: equipmentItem.remarks || undefined,
              owner: equipmentItem.owner,
              image_url: equipmentItem.image_url || undefined,
              inspectionDate: equipmentItem.inspection_date
                ? new Date(equipmentItem.inspection_date).toISOString()
                : undefined,
              plateNumber: equipmentItem.plate_number || undefined,
              originalReceiptUrl:
                equipmentItem.original_receipt_url || undefined,
              equipmentRegistrationUrl:
                equipmentItem.equipment_registration_url || undefined,
              thirdpartyInspectionImage:
                equipmentItem.thirdparty_inspection_image || undefined,
              pgpcInspectionImage:
                equipmentItem.pgpc_inspection_image || undefined,
              equipmentParts: equipmentItem.equipment_parts || undefined,
              project: {
                uid: equipmentItem.project.id,
                name: equipmentItem.project.name,
                client: {
                  uid: equipmentItem.project.client.id,
                  name: equipmentItem.project.client.name,
                  location: {
                    uid: equipmentItem.project.client.location.id,
                    address: equipmentItem.project.client.location.address,
                  },
                },
              },
            };
          }
        );
        setEquipment(serializedEquipment);
      }
    } catch (error) {
    }
  }, []);

  // Export all maintenance reports function
  const exportAllMaintenanceReports = async () => {
    setExportingReports(true);
    setShowExportDialog(false);

    try {
      const allReports = await getAllMaintenanceReports();

      if (allReports.length === 0) {
        toast.info("No maintenance reports found to export");
        return;
      }

      // Prepare data for export - same logic as original
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
      toast.error("Failed to export maintenance reports. Please try again.");
    } finally {
      setExportingReports(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Subscribe to equipment table changes
    const equipmentChannel = supabase
      .channel("equipment-realtime-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const brand = payload.new.brand || "Unknown Brand";
            const model = payload.new.model || "Unknown Model";
            const equipmentId = payload.new.id;

            toast.success(`Admin Added New Equipment`, {
              description: `${brand} ${model} has been added to the system by an admin`,
              duration: 6000,
            });

            const project = initialProjects.find(
              (p) => p.uid === payload.new.project_id
            );
            const client = project
              ? initialClients.find((c) => c.uid === project.client.uid)
              : null;

            const newEquipment: Equipment = {
              uid: equipmentId,
              brand: brand,
              model: model,
              type: payload.new.type || "Unknown Type",
              insuranceExpirationDate: payload.new.insurance_expiration_date
                ? new Date(payload.new.insurance_expiration_date).toISOString()
                : "",
              status: payload.new.status || "OPERATIONAL",
              remarks: payload.new.remarks || undefined,
              owner: payload.new.owner || "Unknown Owner",
              image_url: payload.new.image_url || undefined,
              inspectionDate: payload.new.inspection_date
                ? new Date(payload.new.inspection_date).toISOString()
                : undefined,
              plateNumber: payload.new.plate_number || undefined,
              originalReceiptUrl: payload.new.original_receipt_url || undefined,
              equipmentRegistrationUrl:
                payload.new.equipment_registration_url || undefined,
              thirdpartyInspectionImage:
                payload.new.thirdparty_inspection_image || undefined,
              pgpcInspectionImage:
                payload.new.pgpc_inspection_image || undefined,
              project:
                project && client
                  ? {
                      uid: project.uid,
                      name: project.name,
                      client: {
                        uid: client.uid,
                        name: client.name,
                        location: client.location ? {
                          uid: client.location.uid,
                          address: client.location.address,
                        } : {
                          uid: "unknown-location-id",
                          address: "Unknown Location",
                        },
                      },
                    }
                  : {
                      uid: "unknown-project-id",
                      name: "Unknown Project",
                      client: {
                        uid: "unknown-client-id",
                        name: "Unknown Client",
                        location: {
                          uid: "unknown-location-id",
                          address: "Unknown Location",
                        },
                      },
                    },
            };

            setEquipment((prev) => [newEquipment, ...prev]);
            setNewItemIds((prev) => new Set([...prev, equipmentId]));
          } else if (payload.eventType === "UPDATE") {
            setEquipment((prev) =>
              prev.map((item) => {
                if (item.uid === payload.new.id) {
                  return {
                    ...item,
                    brand: payload.new.brand || item.brand,
                    model: payload.new.model || item.model,
                    type: payload.new.type || item.type,
                    insuranceExpirationDate: payload.new
                      .insurance_expiration_date
                      ? new Date(
                          payload.new.insurance_expiration_date
                        ).toISOString()
                      : item.insuranceExpirationDate,
                    status: payload.new.status || item.status,
                    remarks: payload.new.remarks || item.remarks,
                    owner: payload.new.owner || item.owner,
                    image_url: payload.new.image_url || item.image_url,
                    inspectionDate: payload.new.inspection_date
                      ? new Date(payload.new.inspection_date).toISOString()
                      : item.inspectionDate,
                    plateNumber: payload.new.plate_number || item.plateNumber,
                    originalReceiptUrl:
                      payload.new.original_receipt_url ||
                      item.originalReceiptUrl,
                    equipmentRegistrationUrl:
                      payload.new.equipment_registration_url ||
                      item.equipmentRegistrationUrl,
                    thirdpartyInspectionImage:
                      payload.new.thirdparty_inspection_image ||
                      item.thirdpartyInspectionImage,
                    pgpcInspectionImage:
                      payload.new.pgpc_inspection_image ||
                      item.pgpcInspectionImage,
                  };
                }
                return item;
              })
            );

            toast.info(`Admin Updated Equipment`, {
              description: `${payload.new.brand} ${payload.new.model} information has been updated by an admin`,
              duration: 6000,
            });
          } else if (payload.eventType === "DELETE") {
            setEquipment((prev) =>
              prev.filter((item) => item.uid !== payload.old.id)
            );
            setNewItemIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(payload.old.id);
              return newSet;
            });
            toast.error("Admin Removed Equipment", {
              description: `${payload.old.brand} ${payload.old.model} has been successfully removed from the system by an admin`,
              duration: 6000,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(equipmentChannel);
    };
  }, [supabase, initialProjects, initialClients]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Equipment Management
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            View and filter all equipment across projects
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Add Equipment Button */}
          <EquipmentFormDialog
            trigger={
              <Button className="flex items-center justify-center gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Equipment</span>
                <span className="sm:hidden">Add</span>
              </Button>
            }
            onEquipmentAdded={handleEquipmentAdded}
          />

          {/* Export All Reports Button */}
          <AlertDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={exportingReports}
                className="flex items-center justify-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300 w-full sm:w-auto"
              >
                {exportingReports ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-600 border-t-transparent"></div>
                    <span className="hidden sm:inline">Exporting...</span>
                    <span className="sm:hidden">Export...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <AlertTriangle className="h-4 w-4 hidden sm:inline" />
                    <span className="hidden sm:inline">Export All Issues</span>
                    <span className="sm:hidden">Export</span>
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

      {/* Filters Section */}
      <SharedFilters
        clients={initialClients}
        locations={initialLocations}
        projects={availableProjects}
        filterState={filterState}
        onFilterChange={updateFilter}
        onClearFilters={clearFilters}
        hasActiveFilters={activeFilters}
        resultsCount={filteredEquipment.length}
        totalCount={totalEquipmentCount}
      />

      {/* Equipment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {paginationLoading
          ? Array.from({ length: itemsPerPage }).map((_, index) => (
              <EquipmentCardSkeleton key={`skeleton-${index}`} />
            ))
          : paginatedEquipment.map((item, index) => (
              <Card
                key={item.uid || `equipment-${index}`}
                className={`group cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                  newItemIds.has(item.uid)
                    ? "ring-2 ring-green-500 ring-opacity-50"
                    : ""
                }`}
                onClick={() => {
                  setSelectedEquipment(item);
                  setIsModalOpen(true);
                }}
              >
                <CardHeader className="pb-3 relative">
                  {/* Clean Main Content */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg font-semibold truncate text-foreground">
                        {item.brand} {item.model}
                      </CardTitle>
                      <CardDescription className="font-medium text-gray-600 text-xs">
                        {item.type}
                      </CardDescription>

                      {/* Status and Badges Row */}
                      <div className="flex flex-row flex-wrap gap-1 sm:gap-2 mt-2">
                        <Badge
                          className={`text-xs ${
                            item.status === "OPERATIONAL"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.status === "OPERATIONAL"
                            ? "✓ Active"
                            : "⚠ Inactive"}
                        </Badge>

                        {item.plateNumber && (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 text-xs"
                          >
                            <Car className="h-3 w-3" />
                            {item.plateNumber}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Beautiful Action Buttons - Appear on Hover on Desktop, Always Visible on Mobile */}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 transform sm:translate-y-1 sm:group-hover:translate-y-0">
                    {/* Edit Button - Blue Theme */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingEquipment(item);
                        setIsEditEquipmentOpen(true);
                      }}
                      className="h-9 w-9 p-0 bg-blue-500/90 hover:bg-blue-600 shadow-lg border border-blue-400/30 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110 hover:shadow-xl"
                      title="Edit Equipment"
                    >
                      <Wrench className="h-4 w-4 text-white" />
                    </Button>

                    {/* Issue Report Button - Red Theme */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEquipment(item);
                        setIsMaintenanceReportOpen(true);
                      }}
                      className="h-9 w-9 p-0 bg-red-500/90 hover:bg-red-600 shadow-lg border border-red-400/30 backdrop-blur-sm rounded-full transition-all duration-200 hover:scale-110 hover:shadow-xl"
                      title="Add Issue Report"
                    >
                      <ClipboardList className="h-4 w-4 text-white" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Equipment Image */}
                  {item.image_url && (
                    <div className="aspect-video bg-white rounded-md overflow-hidden relative">
                      <Image
                        src={item.image_url}
                        alt={`${item.brand} ${item.model} equipment image`}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                  )}

                  {/* Placeholder if no image */}
                  {!item.image_url && (
                    <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                      <Settings className="h-12 w-12 text-gray-400" />
                    </div>
                  )}

                  {/* Equipment Info Footer */}
                  <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between">
                      <span>Owner:</span>
                      <span className="font-medium">{item.owner}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Project:</span>
                      <span
                        className="font-medium truncate ml-2"
                        title={item.project.name}
                      >
                        {item.project.name}
                      </span>
                    </div>
                    {item.insuranceExpirationDate && (
                      <div className="flex justify-between">
                        <span>Expires:</span>
                        <span className="font-medium">
                          {new Date(
                            item.insuranceExpirationDate
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium mb-2">No equipment found</p>
            <p className="text-sm">
              {filterState.searchQuery
                ? `No equipment matches your search "${filterState.searchQuery}"`
                : "No equipment available to display"}
            </p>
          </div>
        </div>
      )}

      {/* Pagination - Mobile Optimized */}
      {totalEquipmentCount > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center gap-4">
          {/* Mobile-First Pagination */}
          <div className="flex flex-col sm:hidden items-center gap-3">
            {/* Simple Previous/Next for Mobile */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => previousPage()}
                disabled={!hasPreviousPage}
                className="h-10 px-4"
              >
                ← Previous
              </Button>

              <span className="text-sm font-medium px-3">
                {currentPage} of {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => nextPage()}
                disabled={!hasNextPage}
                className="h-10 px-4"
              >
                Next →
              </Button>
            </div>

            {/* Results count for mobile */}
            <div className="text-xs text-muted-foreground text-center">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalEquipmentCount)} of{" "}
              {totalEquipmentCount} items
            </div>
          </div>

          {/* Desktop Pagination */}
          <div className="hidden sm:flex flex-col items-center gap-4">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => previousPage()}
                    className={
                      !hasPreviousPage
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => goToPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }

                    if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    return null;
                  }
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => nextPage()}
                    className={
                      !hasNextPage
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>

            <div className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalEquipmentCount)} of{" "}
              {totalEquipmentCount} results
            </div>
          </div>
        </div>
      )}

      {/* Equipment Modal */}
      {selectedEquipment && (
        <EquipmentModal
          equipment={selectedEquipment}
          isOpen={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) {
              setSelectedEquipment(null);
            }
          }}
        />
      )}

      {/* Edit Equipment Modal */}
      {editingEquipment && (
        <EquipmentAddModal
          editEquipment={editingEquipment}
          isOpen={isEditEquipmentOpen}
          onOpenChange={(open) => {
            setIsEditEquipmentOpen(open);
            if (!open) {
              setEditingEquipment(null);
            }
          }}
          onEquipmentAdded={handleEquipmentAdded}
        />
      )}

      {/* Maintenance Report Modal */}
      {selectedEquipment && isMaintenanceReportOpen && (
        <MaintenanceReportModal
          equipment={selectedEquipment}
          isOpen={isMaintenanceReportOpen}
          onOpenChange={(open) => {
            setIsMaintenanceReportOpen(open);
            if (!open) {
              setSelectedEquipment(null);
            }
          }}
          onReportSubmitted={() => {
            toast.success("Maintenance report submitted successfully");
            setIsMaintenanceReportOpen(false);
            setSelectedEquipment(null);
          }}
        />
      )}
    </div>
  );
}

//equipment cards component
"use client";

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";

import { useAuth } from "@/app/context/AuthContext";
import {
  Car,
  CheckCircle,
  Edit,
  Eye,
  FileText,
  Plus,
  Settings,
  Shield,
  Trash2,
} from "lucide-react";
import NextImage from "next/image";
import { toast } from "sonner";
import EquipmentDeleteAlertDialog from "./AlertDialog";
import EquipmentModal from "./EquipmentModal";
import MaintenanceReportModal, {
  MaintenanceReport,
} from "./MaintenanceReportModal";

import ReportDeleteAlertDialog from "./ReportDeleteAlertDialog";
import ReportSelectionDialog from "./ReportSelection";
import ViewReportsModal from "./ViewReportsModal";
import AddEquipmentModal from "./EquipmentAddModal";

// Types based on your updated Prisma schema
interface Equipment {
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

interface Client {
  uid: string;
  name: string;
  location: {
    uid: string;
    address: string;
  };
}

interface Location {
  uid: string;
  address: string;
}

interface EquipmentCardsProps {
  equipments?: Equipment[];
  clients?: Client[];
  locations?: Location[];
  onEquipmentAdded: () => void;
}

const EquipmentCards = ({
  equipments = [],
  clients = [],
  locations = [],
  onEquipmentAdded,
}: EquipmentCardsProps) => {
  const { user } = useAuth();

  const isAdmin =
    (user?.role === "ADMIN" || user?.role === "SUPERADMIN") ?? false;

  const [filteredEquipments, setFilteredEquipments] =
    useState<Equipment[]>(equipments);
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [selectedEquipmentThatHasIssues, setSelectedEquipmentThatHasIssues] =
    useState<Equipment | null | "">(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isIssuesEnabled, setIsIssuesEnabled] = useState(false);
  const [deletingEquipmentId, setDeletingEquipmentId] = useState<string | null>(
    null
  );

  // Delete confirmation dialog states
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(
    null
  );
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);

  const [selectedReportForEdit, setSelectedReportForEdit] =
    useState<MaintenanceReport | null>(null);
  const [, setEquipmentReports] = useState<{
    [equipmentId: string]: MaintenanceReport[];
  }>({});
  const [loadingReports, setLoadingReports] = useState<{
    [equipmentId: string]: boolean;
  }>({});

  const [showReportSelection, setShowReportSelection] = useState(false);
  const [reportSelectionAction, setReportSelectionAction] = useState<
    "edit" | "delete"
  >("edit");
  const [currentEquipmentReports, setCurrentEquipmentReports] = useState<
    MaintenanceReport[]
  >([]);

  const [showViewReportsModal, setShowViewReportsModal] = useState(false);
  const [viewReportsEquipment, setViewReportsEquipment] =
    useState<Equipment | null>(null);
  const [viewReportsData, setViewReportsData] = useState<MaintenanceReport[]>(
    []
  );
  const [reportCounts, setReportCounts] = useState<{
    [equipmentId: string]: number;
  }>({});

  const [reportToDelete, setReportToDelete] =
    useState<MaintenanceReport | null>(null);
  const [showReportDeleteDialog, setShowReportDeleteDialog] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // Filter equipments based on selected client and location
  useEffect(() => {
    let filtered = equipments;

    if (selectedClient !== "all") {
      filtered = filtered.filter(
        (equipment) => equipment.project.client.uid === selectedClient
      );
    }

    if (selectedLocation !== "all") {
      filtered = filtered.filter(
        (equipment) => equipment.project.client.location.uid === selectedLocation
      );
    }

    setFilteredEquipments(filtered);
  }, [equipments, selectedClient, selectedLocation]);

  // Helper functions used only in cards view
  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const isExpiringSoon = (
    insuranceExpirationDate?: string,
    beforeMonths?: number
  ) => {
    const expiry = new Date(insuranceExpirationDate || "");
    const today = new Date();

    if (beforeMonths) {
      // Use the custom 'before' months if specified
      const warningDate = new Date(expiry);
      warningDate.setMonth(warningDate.getMonth() - beforeMonths);
      return today >= warningDate && today < expiry;
    } else {
      // Default to 30 days
      const daysDiff =
        (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 30 && daysDiff >= 0;
    }
  };

  const isExpired = (insuranceExpirationDate: string) => {
    const expiry = new Date(insuranceExpirationDate);
    const today = new Date();
    return expiry < today;
  };

  const getExpirationBadge = (
    insuranceExpirationDate?: string,
    beforeMonths?: number
  ) => {
    if (isExpired(insuranceExpirationDate || "")) {
      return (
        <Badge className="bg-red-500 text-white hover:bg-red-600">
          Expired
        </Badge>
      );
    } else if (isExpiringSoon(insuranceExpirationDate, beforeMonths)) {
      return (
        <Badge className="bg-orange-500 text-white hover:bg-orange-600">
          Expiring Soon
        </Badge>
      );
    }
    return null;
  };

  const getDocumentCount = (equipment: Equipment) => {
    let count = 0;
    if (equipment.image_url) count++;
    if (equipment.originalReceiptUrl) count++;
    if (equipment.equipmentRegistrationUrl) count++;
    if (equipment.thirdpartyInspectionImage) count++;
    if (equipment.pgpcInspectionImage) count++;

    // Add equipment parts count
    if (equipment.equipmentParts && equipment.equipmentParts.length > 0) {
      count += equipment.equipmentParts.length;
    }

    return count;
  };

  const getPartsCount = (equipment: Equipment) => {
    return equipment.equipmentParts ? equipment.equipmentParts.length : 0;
  };

  const getInspectionBadges = (equipment: Equipment) => {
    const badges = [];

    if (equipment.thirdpartyInspectionImage) {
      badges.push(
        <Badge
          key="thirdparty"
          variant="outline"
          className="flex items-center gap-1 text-orange-600 border-orange-200"
        >
          <Shield className="h-3 w-3" />
        </Badge>
      );
    }

    if (equipment.pgpcInspectionImage) {
      badges.push(
        <Badge
          key="pgpc"
          variant="outline"
          className="flex items-center gap-1 text-teal-600 border-teal-200"
        >
          <CheckCircle className="h-3 w-3" />
        </Badge>
      );
    }

    return badges;
  };

  const handleCardClick = (equipment: Equipment) => {
    if (!isEditMode) {
      setSelectedEquipment(equipment);
      setIsModalOpen(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent, equipment: Equipment) => {
    e.stopPropagation(); // Prevent card click
    setSelectedEquipment(equipment);
    setIsModalOpen(true);
  };

  const fetchEquipmentReports = async (equipmentId: string) => {
    if (loadingReports[equipmentId]) return; // Prevent multiple simultaneous requests

    setLoadingReports((prev) => ({ ...prev, [equipmentId]: true }));

    try {
      const response = await fetch(
        `/api/maintenance-reports?equipmentId=${equipmentId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch maintenance reports");
      }

      const reports = await response.json();
      setEquipmentReports((prev) => ({ ...prev, [equipmentId]: reports }));
      return reports;
    } catch (error) {
      console.error("Error fetching maintenance reports:", error);
      toast.error("Failed to fetch maintenance reports");
      return [];
    } finally {
      setLoadingReports((prev) => ({ ...prev, [equipmentId]: false }));
    }
  };

  const handleAddIssue = (e: React.MouseEvent, equipment: Equipment) => {
    e.stopPropagation();
    setSelectedEquipmentThatHasIssues(equipment);
    setShowMaintenanceModal(true);
  };

  // Implement the missing handler functions
  const handleEditIssue = async (e: React.MouseEvent, equipment: Equipment) => {
    e.stopPropagation();

    const reports = await fetchEquipmentReports(equipment.uid);

    if (!reports || reports.length === 0) {
      toast.info("No maintenance reports found for this equipment");
      return;
    }

    if (reports.length === 1) {
      // Single report - edit directly
      setSelectedReportForEdit(reports[0]);
      setSelectedEquipmentThatHasIssues(equipment);
      setShowMaintenanceModal(true);
    } else {
      // Multiple reports - show selection dialog
      setCurrentEquipmentReports(reports);
      setSelectedEquipmentThatHasIssues(equipment);
      setReportSelectionAction("edit");
      setShowReportSelection(true);
    }
  };

  const handleDeleteIssue = async (
    e: React.MouseEvent,
    equipment: Equipment
  ) => {
    e.stopPropagation();

    const reports = await fetchEquipmentReports(equipment.uid);

    if (!reports || reports.length === 0) {
      toast.info("No maintenance reports found for this equipment");
      return;
    }

    if (reports.length === 1) {
      // Single report - show delete confirmation dialog
      setReportToDelete(reports[0]);
      setShowReportDeleteDialog(true);
    } else {
      // Multiple reports - show selection dialog
      setCurrentEquipmentReports(reports);
      setSelectedEquipmentThatHasIssues(equipment);
      setReportSelectionAction("delete");
      setShowReportSelection(true);
    }
  };

  const deleteMaintenanceReport = async (report: MaintenanceReport) => {
    setDeletingReportId(report.uid);
    try {
      const response = await fetch(
        `/api/maintenance-reports/delete?reportId=${report.uid}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to delete maintenance report"
        );
      }

      toast.success("Maintenance report deleted successfully");

      // Refresh the reports for this equipment
      if (selectedEquipmentThatHasIssues) {
        const updatedReports = await fetchEquipmentReports(
          selectedEquipmentThatHasIssues.uid
        );

        // Update view reports data if modal is open
        if (
          showViewReportsModal &&
          viewReportsEquipment?.uid === selectedEquipmentThatHasIssues.uid
        ) {
          setViewReportsData(updatedReports);
        }
      }

      // Update report count
      if (report.equipmentId) {
        await fetchReportCount(report.equipmentId);
      }

      setShowReportSelection(false);
      setShowReportDeleteDialog(false);

      // Close view reports modal if there are no reports left
      if (showViewReportsModal && viewReportsData.length === 1) {
        setShowViewReportsModal(false);
      }
    } catch (error) {
      console.error("Error deleting maintenance report:", error);
      toast.error(
        `Failed to delete maintenance report: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setDeletingReportId(null);
      setReportToDelete(null);
    }
  };

  const handleSelectReportForEdit = (report: MaintenanceReport) => {
    setSelectedReportForEdit(report);
    setShowReportSelection(false);
    setShowMaintenanceModal(true);
  };

  const handleDeleteReportFromSelection = async (report: MaintenanceReport) => {
    setReportToDelete(report);
    setShowReportDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!equipmentToDelete) return;

    setDeletingEquipmentId(equipmentToDelete.uid);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(
        `/api/equipments?equipmentId=${equipmentToDelete.uid}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete equipment");
      }

      const result = await response.json();

      toast.success(
        `Equipment ${equipmentToDelete.brand} ${equipmentToDelete.model} deleted successfully`
      );

      // Show additional info if file deletion had issues
      if (
        result.fileDeletionStatus?.attempted &&
        !result.fileDeletionStatus.successful
      ) {
        toast.warning(
          `Equipment deleted, but some files couldn&apos;t be removed from storage: ${result.fileDeletionStatus.error}`
        );
      }

      onEquipmentAdded(); // Refresh the equipment list
    } catch (error) {
      console.error("Error deleting equipment:", error);
      toast.error(
        `Failed to delete equipment: ${
          error instanceof Error ? error.message : "Unknown error occurred"
        }`
      );
    } finally {
      setDeletingEquipmentId(null);
      setEquipmentToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setEquipmentToDelete(null);
  };

  const closeModal = (open: boolean) => {
    if (!open) {
      // Only clear selectedEquipment after the dialog has closed
      // Use setTimeout to wait for the closing animation
      setTimeout(() => {
        setSelectedEquipment(null);
      }, 200); // Adjust timing based on your dialog animation duration
    }
    setIsModalOpen(open);
  };

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setIsIssuesEnabled(false); // Disable issues when exiting edit mode
  };

  const toggleIssuesEnabled = () => {
    setIsIssuesEnabled(!isIssuesEnabled);
    setIsEditMode(false); // Disable edit mode when enabling issues
  };

  // Add this function to fetch report count for display
  const fetchReportCount = async (equipmentId: string) => {
    try {
      const response = await fetch(
        `/api/maintenance-reports?equipmentId=${equipmentId}`
      );
      if (response.ok) {
        const reports = await response.json();
        setReportCounts((prev) => ({
          ...prev,
          [equipmentId]: reports.length,
        }));
        return reports.length;
      }
    } catch (error) {
      console.error("Error fetching report count:", error);
    }
    return 0;
  };

  // Add this function to handle viewing reports
  const handleViewReports = async (
    e: React.MouseEvent,
    equipment: Equipment
  ) => {
    e.stopPropagation();

    const reports = await fetchEquipmentReports(equipment.uid);
    setViewReportsData(reports);
    setViewReportsEquipment(equipment);
    setShowViewReportsModal(true);

    // Ensure count is up to date
    await fetchReportCount(equipment.uid);
  };

  // Add this useEffect to fetch report counts for all equipment when component loads
  useEffect(() => {
    const fetchAllReportCounts = async () => {
      for (const equipment of filteredEquipments) {
        await fetchReportCount(equipment.uid);
      }
    };

    if (filteredEquipments.length > 0) {
      fetchAllReportCounts();
    }
  }, [filteredEquipments]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex flex-row gap-4 items-center">
          <div className="">
            <label className="text-sm font-medium mb-2 block">
              Filter by Client
            </label>
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients.map((client) => (
                  <SelectItem key={client.uid} value={client.uid}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="">
            <label className="text-sm font-medium mb-2 block">
              Filter by Location
            </label>
            <Select
              value={selectedLocation}
              onValueChange={setSelectedLocation}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Locations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map((location) => (
                  <SelectItem key={location.uid} value={location.uid}>
                    {location.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant={isIssuesEnabled ? "default" : "outline"}
              onClick={toggleIssuesEnabled}
              className={`${
                isIssuesEnabled ? "bg-blue-600 hover:bg-blue-700" : ""
              } dark:text-accent-foreground`}
            >
              <Plus className="h-2 w-2" />
              {isIssuesEnabled ? "Disable Issue" : "Enable Issue"}
            </Button>

            <Button
              variant={isEditMode ? "default" : "outline"}
              onClick={toggleEditMode}
              className={`${
                isEditMode ? "bg-blue-600 hover:bg-blue-700" : ""
              } dark:text-accent-foreground`}
            >
              <Edit className="w-4 h-4 mr-2" />
              {isEditMode ? "Exit Edit" : "Edit Mode"}
            </Button>

            <AddEquipmentModal
              onEquipmentAdded={onEquipmentAdded}
              editEquipment={null}
            />
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredEquipments.length} equipment
        {filteredEquipments.length !== 1 ? "s" : ""}
        {selectedClient !== "all" && (
          <span>
            {" "}
            • Client: {clients.find((c) => c.uid === selectedClient)?.name}
          </span>
        )}
        {selectedLocation !== "all" && (
          <span>
            {" "}
            • Location:{" "}
            {locations.find((l) => l.uid === selectedLocation)?.address}
          </span>
        )}
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredEquipments.map((equipment) => (
          <Card
            key={equipment.uid}
            className={`hover:shadow-lg transition-shadow ${
              !isEditMode ? "cursor-pointer" : ""
            } relative`}
            onClick={() => handleCardClick(equipment)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <CardTitle className="text-sm flex items-center justify-between gap-2">
                    <div className=" flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {equipment.brand} {equipment.model}
                    </div>
                    {!isIssuesEnabled && !isEditMode && (
                      <>
                        {reportCounts[equipment.uid] > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleViewReports(e, equipment)}
                            className="h-6 px-2 text-xs border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            {reportCounts[equipment.uid]} issue
                            {reportCounts[equipment.uid] !== 1 ? "s" : ""}
                          </Button>
                        )}
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="font-medium text-gray-600 text-xs">
                    {equipment.type}
                  </CardDescription>

                  {/* Status and Badges Row */}
                  <div className="flex flex-row flex-wrap gap-2">
                    <Badge className={getStatusColor(equipment.status)}>
                      {equipment.status}
                    </Badge>

                    {equipment.plateNumber && (
                      <Badge
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <Car className="h-3 w-3" />
                        {equipment.plateNumber}
                      </Badge>
                    )}

                    {getExpirationBadge(
                      equipment?.insuranceExpirationDate || "",
                      equipment.before
                    )}

                    {/* Inspection Badges Row */}
                    {getInspectionBadges(equipment).length > 0 && (
                      <div className="flex flex-row flex-wrap gap-2">
                        {getInspectionBadges(equipment)}
                      </div>
                    )}
                  </div>

                  {/* Document and Parts Count Badges */}
                  <div className="flex flex-wrap gap-2">
                    {getDocumentCount(equipment) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>
                          {getDocumentCount(equipment)} document
                          {getDocumentCount(equipment) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {getPartsCount(equipment) > 0 && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <Settings className="h-3 w-3" />
                        <span>
                          {getPartsCount(equipment)} part
                          {getPartsCount(equipment) !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* add issue */}
                {isIssuesEnabled && (
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={(e) => handleAddIssue(e, equipment)}
                      disabled={deletingEquipmentId === equipment.uid}
                      className="flex gap-1 items-center text-xs bg-chart-2 text-accent dark:text-accent-foreground hover:bg-chart-3"
                    >
                      <Plus className="h-2 w-2" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleEditIssue(e, equipment)}
                      disabled={deletingEquipmentId === equipment.uid}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => handleDeleteIssue(e, equipment)}
                      disabled={deletingEquipmentId === equipment.uid}
                    >
                      {deletingEquipmentId === equipment.uid ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
                {/* Edit and Delete Buttons */}
                {isEditMode && (
                  <div className="flex gap-2 ml-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleEditClick(e, equipment)}
                      disabled={deletingEquipmentId === equipment.uid}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => handleDeleteIssue(e, equipment)}
                      disabled={deletingEquipmentId === equipment.uid}
                    >
                      {deletingEquipmentId === equipment.uid ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Equipment Image */}
              {equipment.image_url && (
                <div className="aspect-video bg-white rounded-md overflow-hidden relative">
                  <NextImage
                    src={equipment.image_url}
                    alt={`${equipment.brand} ${equipment.model} equipment image`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              )}

              {/* Placeholder if no image */}
              {!equipment.image_url && (
                <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                  <Settings className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {/* Equipment Info Footer */}
              <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Owner:</span>
                  <span className="font-medium">{equipment.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span>Project:</span>
                  <span
                    className="font-medium truncate ml-2"
                    title={equipment.project.name}
                  >
                    {equipment.project.name}
                  </span>
                </div>
                {equipment.insuranceExpirationDate && (
                  <div className="flex justify-between">
                    <span>Expires:</span>
                    <span
                      className={`font-medium ${
                        isExpired(equipment.insuranceExpirationDate)
                          ? "text-red-600"
                          : isExpiringSoon(
                              equipment.insuranceExpirationDate,
                              equipment.before
                            )
                          ? "text-orange-600"
                          : ""
                      }`}
                    >
                      {new Date(
                        equipment.insuranceExpirationDate
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredEquipments.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No equipment found</h3>
            <p>Try adjusting your filters or check back later.</p>
          </div>
        </Card>
      )}

      {/* Equipment Modal */}
      <EquipmentModal
        isOpen={isModalOpen}
        onOpenChange={closeModal}
        equipment={selectedEquipment}
      />

      {/* Edit Equipment Modal */}
      {isEditMode && selectedEquipment && (
        <AddEquipmentModal
          onEquipmentAdded={() => {
            onEquipmentAdded();
            setIsModalOpen(false);
            setSelectedEquipment(null);
          }}
          editEquipment={selectedEquipment}
          isOpen={isModalOpen}
          onOpenChange={closeModal}
        />
      )}

      <MaintenanceReportModal
        isOpen={showMaintenanceModal}
        onOpenChange={setShowMaintenanceModal}
        equipment={selectedEquipmentThatHasIssues || null}
        locations={locations}
        editReport={selectedReportForEdit} // Pass the report to edit
        onReportSubmitted={() => {
          // Refresh data and close modal
          setShowMaintenanceModal(false);
          setSelectedEquipmentThatHasIssues(null);
          setSelectedReportForEdit(null);
          onEquipmentAdded(); // You might want to also refresh maintenance reports
        }}
      />

      {/* Delete Confirmation AlertDialog */}
      <EquipmentDeleteAlertDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        equipment={equipmentToDelete}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        isDeleting={deletingEquipmentId === equipmentToDelete?.uid}
      />

      <ReportSelectionDialog
        isOpen={showReportSelection}
        onOpenChange={setShowReportSelection}
        reports={currentEquipmentReports}
        onSelectReport={handleSelectReportForEdit}
        onDeleteReport={handleDeleteReportFromSelection}
        action={reportSelectionAction}
      />

      <ViewReportsModal
        isOpen={showViewReportsModal}
        onOpenChange={(open) => {
          if (!open) {
            // Refresh data when closing the modal
            if (viewReportsEquipment) {
              fetchEquipmentReports(viewReportsEquipment.uid);
              fetchReportCount(viewReportsEquipment.uid);
            }
          }
          setShowViewReportsModal(open);
        }}
        reports={viewReportsData}
        equipment={viewReportsEquipment}
        showActions={isAdmin}
        onEditReport={(report) => {
          setShowViewReportsModal(false);
          setSelectedReportForEdit(report);
          setSelectedEquipmentThatHasIssues(viewReportsEquipment);
          setShowMaintenanceModal(true);
        }}
        onDeleteReport={(report) => {
          setReportToDelete(report);
          setShowReportDeleteDialog(true);
        }}
      />
      <ReportDeleteAlertDialog
        isOpen={showReportDeleteDialog}
        onOpenChange={setShowReportDeleteDialog}
        report={reportToDelete}
        onConfirm={() => {
          if (reportToDelete) {
            deleteMaintenanceReport(reportToDelete);
          }
        }}
        onCancel={() => {
          setShowReportDeleteDialog(false);
          setReportToDelete(null);
        }}
        isDeleting={deletingReportId === reportToDelete?.uid}
      />
    </div>
  );
};

export default EquipmentCards;

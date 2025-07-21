"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarDays,
  User,
  Building2,
  MapPin,
  Car,
  FileText,
  Image,
  Receipt,
  ExternalLink,
  Shield,
  Edit,
  Wrench,
  X,
} from "lucide-react";
import { useVehiclesStore, selectSelectedVehicle, selectIsModalOpen, selectIsEditMode, selectIsMaintenanceModalOpen, selectSelectedMaintenanceReport } from "@/stores/vehiclesStore";
import { useVehiclesWithReferenceData, useUpdateVehicle, useDeleteVehicle } from "@/hooks/useVehiclesQuery";
import VehicleMaintenanceReportsModern from "./VehicleMaintenanceReportsModern";
import CreateVehicleModalModern from "./CreateVehicleModalModern";
import EditVehicleModalModern from "./EditVehicleModalModern";

export default function VehicleModalModern() {
  // Server state from TanStack Query
  const { vehicles, projects, locations, users, maintenanceReports } = useVehiclesWithReferenceData();
  
  // Client state from Zustand
  const selectedVehicleFromStore = useVehiclesStore(selectSelectedVehicle);
  const isModalOpen = useVehiclesStore(selectIsModalOpen);
  const isEditMode = useVehiclesStore(selectIsEditMode);
  
  // Get the most up-to-date vehicle data from TanStack Query cache
  const selectedVehicle = selectedVehicleFromStore 
    ? vehicles.find(v => v.id === selectedVehicleFromStore.id) || selectedVehicleFromStore
    : null;
  
  // Actions
  const { 
    setIsModalOpen, 
    setIsEditMode, 
    setSelectedVehicle,
    closeAllModals
  } = useVehiclesStore();

  // Mutations
  const updateVehicleMutation = useUpdateVehicle();
  const deleteVehicleMutation = useDeleteVehicle();

  // Helper functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
      : "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900 dark:text-red-300";
  };

  const isExpiringSoon = (expiryDate: string, beforeMonths: number) => {
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;
      
      const today = new Date();
      const warningDate = new Date(expiry);
      warningDate.setMonth(warningDate.getMonth() - beforeMonths);

      return today >= warningDate && today < expiry;
    } catch {
      return false;
    }
  };

  const isExpired = (expiryDate: string) => {
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;
      
      const today = new Date();
      return expiry < today;
    } catch {
      return false;
    }
  };

  const getNextInspectionDate = (lastInspection: string, beforeMonths: number) => {
    try {
      const lastDate = new Date(lastInspection);
      if (isNaN(lastDate.getTime())) return new Date();
      
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + beforeMonths);
      return nextDate;
    } catch {
      return new Date();
    }
  };

  const getFileNameFromUrl = (url: string) => {
    try {
      const urlPath = new URL(url).pathname;
      return urlPath.split("/").pop() || "Document";
    } catch {
      return "Document";
    }
  };

  const isImageFile = (url: string) => {
    const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];
    return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  const openFile = (url: string) => {
    window.open(url, "_blank");
  };

  const vehicleImages = (vehicle: any) => {
    if (!vehicle) return [];
    
    const images = [
      { url: vehicle.front_img_url, label: "Front View" },
      { url: vehicle.back_img_url, label: "Back View" },
      { url: vehicle.side1_img_url, label: "Left Side" },
      { url: vehicle.side2_img_url, label: "Right Side" },
    ].filter((img) => img.url);

    return images;
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleDelete = async () => {
    if (!selectedVehicle || !confirm("Are you sure you want to delete this vehicle? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteVehicleMutation.mutateAsync(selectedVehicle.id);
      closeAllModals();
    } catch (error) {
      console.error('Error deleting vehicle:', error);
    }
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  if (!selectedVehicle) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent
        className="max-w-[95%] max-h-[90vh] flex flex-col p-4"
        style={{ maxWidth: "1024px" }}
      >
        {/* Fixed Header */}
        <DialogHeader className="p-6 pb-0 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-6 w-6" />
                {selectedVehicle.brand} {selectedVehicle.model}
                <Badge className={getStatusColor(selectedVehicle.status)}>
                  {selectedVehicle.status}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {selectedVehicle.plate_number}
                </Badge>
              </DialogTitle>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleEdit} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={handleDelete} className="gap-2 text-red-600 hover:text-red-700">
                <X className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
          <p className="text-muted-foreground">{selectedVehicle.type}</p>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-none p-6 pt-6">
          <div className="space-y-6">
            {/* Vehicle Images Grid */}
            {vehicleImages(selectedVehicle).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Vehicle Photos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {vehicleImages(selectedVehicle).map((image, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="aspect-video bg-white rounded-md overflow-hidden">
                        <img
                          src={image.url}
                          alt={`${selectedVehicle.brand} ${selectedVehicle.model} - ${image.label}`}
                          className="w-full h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(image.url!)}
                        />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">
                          {image.label}
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => openFile(image.url!)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          View Full Size
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Vehicle Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Vehicle Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Owner:</span>
                    <span>{selectedVehicle.owner}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client:</span>
                    <span>{selectedVehicle.project?.client?.name || 'No client'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{selectedVehicle.project?.client?.location?.address || 'No location'}</span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Project:</span>
                    <span className="ml-2">{selectedVehicle.project?.name || 'No project'}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Plate Number:</span>
                    <span>{selectedVehicle.plate_number}</span>
                  </div>

                  {selectedVehicle.user && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Added by:</span>
                      <span>{selectedVehicle.user.full_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dates & Inspection</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Registration Expires:</span>
                    <span
                      className={`${
                        isExpired(selectedVehicle.expiry_date)
                          ? "text-red-600 font-semibold"
                          : isExpiringSoon(selectedVehicle.expiry_date, selectedVehicle.before)
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(selectedVehicle.expiry_date)}
                      {isExpired(selectedVehicle.expiry_date) && " (Expired)"}
                      {isExpiringSoon(selectedVehicle.expiry_date, selectedVehicle.before) &&
                        !isExpired(selectedVehicle.expiry_date) &&
                        " (Expiring Soon)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Last Inspection:</span>
                    <span>{formatDate(selectedVehicle.inspection_date)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Next Inspection Due:</span>
                    <span
                      className={`${
                        getNextInspectionDate(
                          selectedVehicle.inspection_date,
                          selectedVehicle.before
                        ) < new Date()
                          ? "text-red-600 font-semibold"
                          : getNextInspectionDate(
                              selectedVehicle.inspection_date,
                              selectedVehicle.before
                            ).getTime() -
                              new Date().getTime() <
                            30 * 24 * 60 * 60 * 1000
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(
                        getNextInspectionDate(
                          selectedVehicle.inspection_date,
                          selectedVehicle.before
                        ).toISOString()
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Inspection Frequency:</span>
                    <span>
                      Every {selectedVehicle.before} month
                      {selectedVehicle.before !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date Added:</span>
                    <span>{formatDate(selectedVehicle.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documents & Files</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Original Receipt */}
                {selectedVehicle.original_receipt_url && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Original Receipt (OR)</span>
                    </div>

                    {isImageFile(selectedVehicle.original_receipt_url) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={selectedVehicle.original_receipt_url}
                          alt="Original Receipt"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(selectedVehicle.original_receipt_url!)}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(selectedVehicle.original_receipt_url)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(selectedVehicle.original_receipt_url!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* Car Registration */}
                {selectedVehicle.car_registration_url && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Car Registration (CR)</span>
                    </div>

                    {isImageFile(selectedVehicle.car_registration_url) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={selectedVehicle.car_registration_url}
                          alt="Car Registration"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(selectedVehicle.car_registration_url!)}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(selectedVehicle.car_registration_url)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(selectedVehicle.car_registration_url!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* PGPC Inspection Image */}
                {selectedVehicle.pgpc_inspection_image && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">PGPC Inspection</span>
                    </div>

                    {isImageFile(selectedVehicle.pgpc_inspection_image) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={selectedVehicle.pgpc_inspection_image}
                          alt="PGPC Inspection"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(selectedVehicle.pgpc_inspection_image!)}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(selectedVehicle.pgpc_inspection_image)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(selectedVehicle.pgpc_inspection_image!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}
              </div>

              {/* Documents Summary */}
              <div className="flex flex-wrap gap-2">
                {selectedVehicle.original_receipt_url && (
                  <Badge variant="outline" className="text-xs">
                    <Receipt className="h-3 w-3 mr-1" />
                    OR Available
                  </Badge>
                )}
                {selectedVehicle.car_registration_url && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    CR Available
                  </Badge>
                )}
                {selectedVehicle.pgpc_inspection_image && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    PGPC Available
                  </Badge>
                )}
                {vehicleImages(selectedVehicle).length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    {vehicleImages(selectedVehicle).length} Photo
                    {vehicleImages(selectedVehicle).length !== 1 ? "s" : ""}
                  </Badge>
                )}
                {!selectedVehicle.original_receipt_url &&
                  !selectedVehicle.car_registration_url &&
                  !selectedVehicle.pgpc_inspection_image &&
                  vehicleImages(selectedVehicle).length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No documents or photos uploaded
                    </span>
                  )}
              </div>
            </div>

            {/* Remarks */}
            {selectedVehicle.remarks && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <p className="text-muted-foreground bg-muted p-3 rounded-md">
                  {selectedVehicle.remarks}
                </p>
              </div>
            )}

            {/* Maintenance Reports Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Maintenance Reports</h3>
              <VehicleMaintenanceReportsModern vehicleId={selectedVehicle.id} />
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Edit Modal */}
      {isEditMode && <EditVehicleModalModern />}
    </Dialog>
  );
}
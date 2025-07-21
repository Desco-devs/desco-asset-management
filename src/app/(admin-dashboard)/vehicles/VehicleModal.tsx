"use client";

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
} from "lucide-react";
import EditVehicleDialog from "./EditVehicleDialog";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import CreateMaintenanceReportDialog from "./CreateMaintenanceReportDialog";
import EditMaintenanceReportDialog from "./EditMaintenanceReportDialog";
import VehicleMaintenanceReportsList from "./VehicleMaintenanceReportsList";

// Vehicle interface matching our current structure
interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type: string;
  plate_number: string;
  inspection_date: string;
  before: number;
  expiry_date: string;
  status: 'OPERATIONAL' | 'NON_OPERATIONAL';
  remarks?: string;
  owner: string;
  created_at: string;
  // Images
  front_img_url?: string;
  back_img_url?: string;
  side1_img_url?: string;
  side2_img_url?: string;
  // Documents
  original_receipt_url?: string;
  car_registration_url?: string;
  pgpc_inspection_image?: string;
  // Relations
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
  user: {
    id: string;
    username: string;
    full_name: string;
  } | null;
}

interface VehicleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  projects?: Array<{
    id: string;
    name: string;
  }>;
  locations?: Array<{
    id: string;
    address: string;
  }>;
  users?: Array<{
    id: string;
    full_name: string;
  }>;
  initialMaintenanceReports?: any[];
}

const VehicleModal = ({ isOpen, onOpenChange, vehicle, projects, locations = [], users = [], initialMaintenanceReports = [] }: VehicleModalProps) => {
  const queryClient = useQueryClient();
  
  // Real-time vehicle state - updates instantly when vehicle is edited
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(vehicle);
  
  // Tab state for maintenance reports
  const [activeTab, setActiveTab] = useState<'details' | 'maintenance'>('details');
  
  // State for edit maintenance report dialog
  const [editingReport, setEditingReport] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // State to force refresh of maintenance reports
  const [maintenanceRefreshTrigger, setMaintenanceRefreshTrigger] = useState(0);

  // Sync with prop changes
  useEffect(() => {
    setCurrentVehicle(vehicle);
  }, [vehicle]);

  // Real-time subscription for this specific vehicle and its maintenance reports
  useEffect(() => {
    if (!currentVehicle) return;

    const supabase = createClient();
    
    const channel = supabase
      .channel(`vehicle-${currentVehicle.id}-modal`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'vehicles',
          filter: `id=eq.${currentVehicle.id}`
        },
        (payload) => {
          // Update the current vehicle with new data, preserving relations
          setCurrentVehicle(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              brand: payload.new.brand,
              model: payload.new.model,
              type: payload.new.type,
              plate_number: payload.new.plate_number,
              owner: payload.new.owner,
              status: payload.new.status,
              inspection_date: payload.new.inspection_date,
              expiry_date: payload.new.expiry_date,
              before: payload.new.before,
              remarks: payload.new.remarks,
              // Keep existing relations and file URLs
              front_img_url: payload.new.front_img_url || prev.front_img_url,
              back_img_url: payload.new.back_img_url || prev.back_img_url,
              side1_img_url: payload.new.side1_img_url || prev.side1_img_url,
              side2_img_url: payload.new.side2_img_url || prev.side2_img_url,
              original_receipt_url: payload.new.original_receipt_url || prev.original_receipt_url,
              car_registration_url: payload.new.car_registration_url || prev.car_registration_url,
              pgpc_inspection_image: payload.new.pgpc_inspection_image || prev.pgpc_inspection_image,
            };
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_vehicle_reports',
          filter: `vehicle_id=eq.${currentVehicle.id}`
        },
        (payload) => {
          // Force refresh of maintenance reports list by incrementing trigger
          setMaintenanceRefreshTrigger(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentVehicle?.id, activeTab]);

  // Helper functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const isExpiringSoon = (expiryDate: string, beforeMonths: number) => {
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;
      
      const today = new Date();
      const warningDate = new Date(expiry);
      warningDate.setMonth(warningDate.getMonth() - beforeMonths);

      return today >= warningDate && today < expiry;
    } catch (error) {
      return false;
    }
  };

  const isExpired = (expiryDate: string) => {
    try {
      const expiry = new Date(expiryDate);
      if (isNaN(expiry.getTime())) return false;
      
      const today = new Date();
      return expiry < today;
    } catch (error) {
      return false;
    }
  };

  const getNextInspectionDate = (
    lastInspection: string,
    beforeMonths: number
  ) => {
    try {
      const lastDate = new Date(lastInspection);
      // Check if date is valid
      if (isNaN(lastDate.getTime())) {
        return new Date(); // Return current date as fallback
      }
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + beforeMonths);
      return nextDate;
    } catch (error) {
      console.error('Error calculating next inspection date:', error);
      return new Date(); // Return current date as fallback
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
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".bmp",
      ".svg",
    ];
    return imageExtensions.some((ext) => url.toLowerCase().includes(ext));
  };

  const openFile = (url: string) => {
    window.open(url, "_blank");
  };

  const vehicleImages = (vehicle: Vehicle) => {
    const images = [
      { url: vehicle.front_img_url, label: "Front View" },
      { url: vehicle.back_img_url, label: "Back View" },
      { url: vehicle.side1_img_url, label: "Left Side" },
      { url: vehicle.side2_img_url, label: "Right Side" },
    ].filter((img) => img.url);

    return images;
  };

  if (!currentVehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95%] max-h-[90vh] flex flex-col p-4"
        style={{
          maxWidth: "1024px",
        }}
      >
        {/* Fixed Header */}
        <DialogHeader className="p-6 pb-0 flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="flex items-center gap-2">
                <Car className="h-6 w-6" />
                {currentVehicle.brand} {currentVehicle.model}
                <Badge className={getStatusColor(currentVehicle.status)}>
                  {currentVehicle.status}
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {currentVehicle.plate_number}
                </Badge>
              </DialogTitle>
            </div>
            
            {/* Edit Button */}
            {projects && projects.length > 0 && (
              <EditVehicleDialog
                vehicle={currentVehicle}
                projects={projects}
                trigger={
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Button>
                }
                onSuccess={() => {
                  // Invalidate React Query cache to refresh vehicle data
                  queryClient.invalidateQueries({ queryKey: ['vehicles-optimized'] });
                }}
              />
            )}
          </div>
          <p className="text-muted-foreground">{currentVehicle.type}</p>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b px-6 pt-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Car className="h-4 w-4 inline mr-2" />
            Vehicle Details
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wrench className="h-4 w-4 inline mr-2" />
            Maintenance Reports
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-none p-6 pt-6">
          {/* Vehicle Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
            {/* Vehicle Images Grid */}
            {vehicleImages(currentVehicle).length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Vehicle Photos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                  {vehicleImages(currentVehicle).map((image, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 space-y-2"
                    >
                      <div className="aspect-video bg-white rounded-md overflow-hidden">
                        <img
                          src={image.url}
                          alt={`${currentVehicle.brand} ${currentVehicle.model} - ${image.label}`}
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
                    <span>{currentVehicle.owner}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client:</span>
                    <span>{currentVehicle.project.client.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{currentVehicle.project.client.location.address}</span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Project:</span>
                    <span className="ml-2">{currentVehicle.project.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Plate Number:</span>
                    <span>{currentVehicle.plate_number}</span>
                  </div>

                  {currentVehicle.user && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Added by:</span>
                      <span>{currentVehicle.user.full_name}</span>
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
                        isExpired(currentVehicle.expiry_date)
                          ? "text-red-600 font-semibold"
                          : isExpiringSoon(currentVehicle.expiry_date, currentVehicle.before)
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(currentVehicle.expiry_date)}
                      {isExpired(currentVehicle.expiry_date) && " (Expired)"}
                      {isExpiringSoon(currentVehicle.expiry_date, currentVehicle.before) &&
                        !isExpired(currentVehicle.expiry_date) &&
                        " (Expiring Soon)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Last Inspection:</span>
                    <span>{formatDate(currentVehicle.inspection_date)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Next Inspection Due:</span>
                    <span
                      className={`${
                        getNextInspectionDate(
                          currentVehicle.inspection_date,
                          currentVehicle.before
                        ) < new Date()
                          ? "text-red-600 font-semibold"
                          : getNextInspectionDate(
                              currentVehicle.inspection_date,
                              currentVehicle.before
                            ).getTime() -
                              new Date().getTime() <
                            30 * 24 * 60 * 60 * 1000
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(
                        getNextInspectionDate(
                          currentVehicle.inspection_date,
                          currentVehicle.before
                        ).toISOString()
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Inspection Frequency:</span>
                    <span>
                      Every {currentVehicle.before} month
                      {currentVehicle.before !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Date Added:</span>
                    <span>{formatDate(currentVehicle.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documents & Files</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Original Receipt */}
                {currentVehicle.original_receipt_url && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">
                        Original Receipt (OR)
                      </span>
                    </div>

                    {isImageFile(currentVehicle.original_receipt_url) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={currentVehicle.original_receipt_url}
                          alt="Original Receipt"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(currentVehicle.original_receipt_url!)}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(currentVehicle.original_receipt_url)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(currentVehicle.original_receipt_url!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* Car Registration */}
                {currentVehicle.car_registration_url && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">
                        Car Registration (CR)
                      </span>
                    </div>

                    {isImageFile(currentVehicle.car_registration_url) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={currentVehicle.car_registration_url}
                          alt="Car Registration"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(currentVehicle.car_registration_url!)}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(currentVehicle.car_registration_url)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(currentVehicle.car_registration_url!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* PGPC Inspection Image */}
                {currentVehicle.pgpc_inspection_image && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">
                        PGPC Inspection
                      </span>
                    </div>

                    {isImageFile(currentVehicle.pgpc_inspection_image) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={currentVehicle.pgpc_inspection_image}
                          alt="PGPC Inspection"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openFile(currentVehicle.pgpc_inspection_image!)}
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(currentVehicle.pgpc_inspection_image)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(currentVehicle.pgpc_inspection_image!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}
              </div>

              {/* Documents Summary */}
              <div className="flex flex-wrap gap-2">
                {currentVehicle.original_receipt_url && (
                  <Badge variant="outline" className="text-xs">
                    <Receipt className="h-3 w-3 mr-1" />
                    OR Available
                  </Badge>
                )}
                {currentVehicle.car_registration_url && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    CR Available
                  </Badge>
                )}
                {currentVehicle.pgpc_inspection_image && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    PGPC Available
                  </Badge>
                )}
                {vehicleImages(currentVehicle).length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    {vehicleImages(currentVehicle).length} Photo
                    {vehicleImages(currentVehicle).length !== 1 ? "s" : ""}
                  </Badge>
                )}
                {!currentVehicle.original_receipt_url &&
                  !currentVehicle.car_registration_url &&
                  !currentVehicle.pgpc_inspection_image &&
                  vehicleImages(currentVehicle).length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No documents or photos uploaded
                    </span>
                  )}
              </div>
            </div>

            {/* Remarks */}
            {currentVehicle.remarks && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <p className="text-muted-foreground bg-gray-50 p-3 rounded-md">
                  {currentVehicle.remarks}
                </p>
              </div>
            )}
            </div>
          )}

          {/* Maintenance Reports Tab */}
          {activeTab === 'maintenance' && (
            <div className="space-y-6">
              {/* Header with Create Report Button */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Maintenance Reports</h3>
                  <p className="text-sm text-gray-600">Track vehicle issues, repairs, and maintenance history</p>
                </div>
                <CreateMaintenanceReportDialog
                  vehicleId={currentVehicle?.id || ''}
                  locations={locations.map(loc => ({
                    id: loc.id,
                    address: loc.address
                  }))}
                  users={users.map(user => ({
                    id: user.id,
                    full_name: user.full_name
                  }))}
                  onSuccess={() => {
                    // Refresh maintenance reports and invalidate React Query cache
                    setMaintenanceRefreshTrigger(prev => prev + 1);
                    // Invalidate vehicles cache to refresh the data
                    queryClient.invalidateQueries({ queryKey: ['vehicles-optimized'] });
                  }}
                />
              </div>

              {/* Maintenance Reports List */}
              <VehicleMaintenanceReportsList
                vehicleId={currentVehicle?.id || ''}
                refreshTrigger={maintenanceRefreshTrigger}
                initialUsers={users}
                initialLocations={locations}
                initialMaintenanceReports={initialMaintenanceReports}
                currentVehicle={currentVehicle ? {
                  brand: currentVehicle.brand,
                  model: currentVehicle.model,
                  plate_number: currentVehicle.plate_number
                } : undefined}
                onEditReport={(report) => {
                  setEditingReport({
                    id: report.id,
                    issue_description: report.issue_description,
                    remarks: report.remarks,
                    inspection_details: report.inspection_details,
                    action_taken: report.action_taken,
                    parts_replaced: report.parts_replaced,
                    priority: report.priority,
                    status: report.status,
                    downtime_hours: report.downtime_hours,
                    date_reported: report.date_reported,
                    date_repaired: report.date_repaired,
                    location_id: report.location.id,
                    repaired_by: report.repaired_user?.full_name
                  });
                  setIsEditDialogOpen(true);
                }}
              />
            </div>
          )}
        </div>

        {/* Edit Maintenance Report Dialog */}
        <EditMaintenanceReportDialog
          isOpen={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          vehicleId={currentVehicle?.id || ''}
          report={editingReport}
          locations={locations.map(loc => ({
            id: loc.id,
            address: loc.address
          }))}
          users={users.map(user => ({
            id: user.id,
            full_name: user.full_name
          }))}
          onSuccess={() => {
            // Refresh maintenance reports and invalidate React Query cache
            setMaintenanceRefreshTrigger(prev => prev + 1);
            queryClient.invalidateQueries({ queryKey: ['vehicles-optimized'] });
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default VehicleModal;
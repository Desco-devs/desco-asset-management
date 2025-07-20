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
} from "lucide-react";
import EditVehicleDialog from "./EditVehicleDialog";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";

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
}

const VehicleModal = ({ isOpen, onOpenChange, vehicle, projects }: VehicleModalProps) => {
  // 🔥 REAL-TIME VEHICLE STATE - updates instantly when vehicle is edited
  const [currentVehicle, setCurrentVehicle] = useState<Vehicle | null>(vehicle);

  // Sync with prop changes
  useEffect(() => {
    setCurrentVehicle(vehicle);
  }, [vehicle]);

  // 🔥 REAL-TIME SUBSCRIPTION for this specific vehicle
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
          console.log('🔥 MODAL REALTIME: Vehicle updated:', payload.new);
          
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
              // Keep existing relations and file URLs (they don't change in basic update)
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
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [currentVehicle?.id]);

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
              />
            )}
          </div>
          <p className="text-muted-foreground">{currentVehicle.type}</p>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-none p-6 pt-6">
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleModal;
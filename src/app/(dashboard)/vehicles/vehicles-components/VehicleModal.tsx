"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  User,
  Building2,
  MapPin,
  Car,
  FileText,
  Image,
} from "lucide-react";

// Vehicle interface (should match your main component)
interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number; // in months
  expiryDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  frontImgUrl?: string;
  backImgUrl?: string;
  side1ImgUrl?: string;
  side2ImgUrl?: string;
  originalReceiptUrl?: string;
  carRegistrationUrl?: string;
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

interface VehicleModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

const VehicleModal = ({ isOpen, onOpenChange, vehicle }: VehicleModalProps) => {
  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const isExpiringSoon = (expiryDate: string, beforeMonths: number) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const warningDate = new Date(expiry);
    warningDate.setMonth(warningDate.getMonth() - beforeMonths);

    return today >= warningDate && today < expiry;
  };

  const isExpired = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    return expiry < today;
  };

  const getNextInspectionDate = (
    lastInspection: string,
    beforeMonths: number
  ) => {
    const lastDate = new Date(lastInspection);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + beforeMonths);
    return nextDate;
  };

  const vehicleImages = (vehicle: Vehicle) => {
    const images = [
      { url: vehicle.frontImgUrl, label: "Front" },
      { url: vehicle.backImgUrl, label: "Back" },
      { url: vehicle.side1ImgUrl, label: "Side 1" },
      { url: vehicle.side2ImgUrl, label: "Side 2" },
    ].filter((img) => img.url);

    return images;
  };

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Fixed Header - no scrolling */}
        <DialogHeader className="p-6 pb-0 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-6 w-6" />
            {vehicle.brand} {vehicle.model}
            <Badge className={getStatusColor(vehicle.status)}>
              {vehicle.status}
            </Badge>
          </DialogTitle>
          <p className="text-muted-foreground">
            {vehicle.type} • {vehicle.plateNumber}
          </p>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-none p-6 pt-6">
          <div className="space-y-6">
            {/* Vehicle Images Grid */}
            {vehicleImages(vehicle).length > 0 && (
              <div className="grid grid-cols-2 gap-4">
                {vehicleImages(vehicle).map((image, index) => (
                  <div key={index} className="space-y-2">
                    <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={image.url}
                        alt={`${vehicle.brand} ${vehicle.model} - ${image.label}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-sm text-center text-muted-foreground">
                      {image.label}
                    </p>
                  </div>
                ))}
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
                    <span>{vehicle.owner}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client:</span>
                    <span>{vehicle.project.client.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{vehicle.project.client.location.address}</span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Project:</span>
                    <span className="ml-2">{vehicle.project.name}</span>
                  </div>
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
                        isExpired(vehicle.expiryDate)
                          ? "text-red-600 font-semibold"
                          : isExpiringSoon(vehicle.expiryDate, vehicle.before)
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(vehicle.expiryDate)}
                      {isExpired(vehicle.expiryDate) && " (Expired)"}
                      {isExpiringSoon(vehicle.expiryDate, vehicle.before) &&
                        !isExpired(vehicle.expiryDate) &&
                        " (Expiring Soon)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Last Inspection:</span>
                    <span>{formatDate(vehicle.inspectionDate)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Next Inspection Due:</span>
                    <span
                      className={`${
                        getNextInspectionDate(
                          vehicle.inspectionDate,
                          vehicle.before
                        ) < new Date()
                          ? "text-red-600 font-semibold"
                          : getNextInspectionDate(
                              vehicle.inspectionDate,
                              vehicle.before
                            ).getTime() -
                              new Date().getTime() <
                            30 * 24 * 60 * 60 * 1000
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(
                        getNextInspectionDate(
                          vehicle.inspectionDate,
                          vehicle.before
                        ).toISOString()
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Inspection Frequency:</span>
                    <span>
                      Every {vehicle.before} month
                      {vehicle.before !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Documents</h3>
              <div className="flex flex-wrap gap-2">
                {vehicle.originalReceiptUrl && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    OR Available
                  </Badge>
                )}
                {vehicle.carRegistrationUrl && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    CR Available
                  </Badge>
                )}
                {vehicleImages(vehicle).length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    {vehicleImages(vehicle).length} Photo
                    {vehicleImages(vehicle).length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </div>

            {/* Remarks */}
            {vehicle.remarks && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <p className="text-muted-foreground">{vehicle.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleModal;

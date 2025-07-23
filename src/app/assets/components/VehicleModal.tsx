"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  CalendarDays,
  Car,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  MapPin,
  User,
} from "lucide-react";
import Image from "next/image";

// Vehicle interface for assets page
interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate?: string;
  before?: number;
  expiryDate?: string;
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

const VehicleModal = ({
  isOpen,
  onOpenChange,
  vehicle,
}: VehicleModalProps) => {
  if (!vehicle) return null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  const getStatusColor = (s: string) =>
    s === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";

  const isExpiringSoon = (d: string, before?: number) => {
    if (!d) return false;
    const expiry = new Date(d);
    const today = new Date();
    const diff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diff <= (before || 30) && diff > 0;
  };

  const isExpired = (d: string) => {
    if (!d) return false;
    return new Date(d) < new Date();
  };

  const getDisplayImage = () => {
    return (
      vehicle.frontImgUrl ||
      vehicle.side1ImgUrl ||
      vehicle.side2ImgUrl ||
      vehicle.backImgUrl
    );
  };

  const getAllImages = () => {
    const images = [];
    if (vehicle.frontImgUrl) images.push({ url: vehicle.frontImgUrl, title: "Front View" });
    if (vehicle.backImgUrl) images.push({ url: vehicle.backImgUrl, title: "Back View" });
    if (vehicle.side1ImgUrl) images.push({ url: vehicle.side1ImgUrl, title: "Side View 1" });
    if (vehicle.side2ImgUrl) images.push({ url: vehicle.side2ImgUrl, title: "Side View 2" });
    return images;
  };

  const getDocuments = () => {
    const docs = [];
    if (vehicle.originalReceiptUrl) {
      docs.push({ url: vehicle.originalReceiptUrl, title: "Original Receipt" });
    }
    if (vehicle.carRegistrationUrl) {
      docs.push({ url: vehicle.carRegistrationUrl, title: "Car Registration" });
    }
    return docs;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {vehicle.brand} {vehicle.model}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Basic Info & Images */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Type:</span>
                <span>{vehicle.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Plate Number:</span>
                <span>{vehicle.plateNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Owner:</span>
                <span>{vehicle.owner}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Project:</span>
                <div className="flex flex-col">
                  {vehicle.project.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Client:</span>
                <div className="flex flex-col">
                  {vehicle.project.client.name}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location:</span>
                <div className="flex flex-col">
                  {vehicle.project.client.location.address}
                </div>
              </div>
            </div>

            {/* Vehicle Images */}
            {getAllImages().length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-semibold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Vehicle Images ({getAllImages().length})
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {getAllImages().map((img, index) => (
                    <div key={index} className="space-y-1">
                      <div className="aspect-video rounded-md overflow-hidden bg-white relative">
                        <Image
                          src={img.url}
                          alt={img.title}
                          fill
                          className="object-contain object-center"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        {img.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Dates & Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status & Inspection</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">Status:</span>
                <Badge className={getStatusColor(vehicle.status)}>
                  {vehicle.status}
                </Badge>
              </div>
              
              {vehicle.inspectionDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Inspection Date:</span>
                  <span>{formatDate(vehicle.inspectionDate)}</span>
                </div>
              )}

              {vehicle.expiryDate && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Expiry Date:</span>
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
                    {isExpired(vehicle.expiryDate)
                      ? " (Expired)"
                      : isExpiringSoon(vehicle.expiryDate, vehicle.before)
                      ? " (Expiring Soon)"
                      : ""}
                  </span>
                </div>
              )}

              {vehicle.before && (
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Alert Before:</span>
                  <span>{vehicle.before} days</span>
                </div>
              )}
            </div>

            {/* Documents */}
            {getDocuments().length > 0 && (
              <div className="space-y-3">
                <h4 className="text-md font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents ({getDocuments().length})
                </h4>
                <div className="space-y-2">
                  {getDocuments().map((doc, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="justify-start h-auto p-2"
                      onClick={() => window.open(doc.url, "_blank")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      <span className="flex-1 text-left">{doc.title}</span>
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Remarks */}
            {vehicle.remarks && (
              <div className="space-y-2">
                <h4 className="text-md font-semibold">Remarks</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {vehicle.remarks}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleModal;
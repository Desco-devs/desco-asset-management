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
  Settings,
  Image,
  FileText,
  Receipt,
  Car,
  ExternalLink,
  Shield,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Equipment interface (updated to match new schema with inspection images)
interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate: string;
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

interface EquipmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
}

const EquipmentModal = ({
  isOpen,
  onOpenChange,
  equipment,
}: EquipmentModalProps) => {
  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const isExpiringSoon = (insuranceExpirationDate: string) => {
    const expiry = new Date(insuranceExpirationDate);
    const today = new Date();
    const daysDiff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 30 && daysDiff >= 0;
  };

  const isExpired = (insuranceExpirationDate: string) => {
    const expiry = new Date(insuranceExpirationDate);
    const today = new Date();
    return expiry < today;
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

  if (!equipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-6xl max-h-[90vh] flex flex-col p-4"
        style={{
          maxWidth: "1024px",
        }}
      >
        {/* Fixed Header - no scrolling */}
        <DialogHeader className="p-6 pb-0 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {equipment.brand} {equipment.model}
            <Badge className={getStatusColor(equipment.status)}>
              {equipment.status}
            </Badge>
            {equipment.plateNumber && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Car className="h-3 w-3" />
                {equipment.plateNumber}
              </Badge>
            )}
          </DialogTitle>
          <p className="text-muted-foreground">{equipment.type}</p>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto scroll-none p-6 pt-6">
          <div className="space-y-6">
            {/* Equipment Image */}
            {equipment.image_url && (
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={equipment.image_url}
                      alt={`${equipment.brand} ${equipment.model}`}
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => openFile(equipment.image_url!)}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-1">
                    Click to view full size
                  </p>
                </div>
              </div>
            )}

            {/* Equipment Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Equipment Information</h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Owner:</span>
                    <span>{equipment.owner}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Client:</span>
                    <span>{equipment.project.client.name}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Location:</span>
                    <span>{equipment.project.client.location.address}</span>
                  </div>

                  <div className="text-sm">
                    <span className="font-medium">Project:</span>
                    <span className="ml-2">{equipment.project.name}</span>
                  </div>

                  {equipment.plateNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Plate Number:</span>
                      <span>{equipment.plateNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dates & Status</h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Insurance Expiration:</span>
                    <span
                      className={`${
                        isExpired(equipment.insuranceExpirationDate)
                          ? "text-red-600 font-semibold"
                          : isExpiringSoon(equipment.insuranceExpirationDate)
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(equipment.insuranceExpirationDate)}
                      {isExpired(equipment.insuranceExpirationDate) &&
                        " (Expired)"}
                      {isExpiringSoon(equipment.insuranceExpirationDate) &&
                        !isExpired(equipment.insuranceExpirationDate) &&
                        " (Expiring Soon)"}
                    </span>
                  </div>

                  {equipment.inspectionDate && (
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Last Inspection:</span>
                      <span>{formatDate(equipment.inspectionDate)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Documents & Files</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Equipment Image */}
                {equipment.image_url && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">
                        Equipment Image
                      </span>
                    </div>
                    <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={equipment.image_url}
                        alt="Equipment"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => openFile(equipment.image_url!)}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(equipment.image_url!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Full Size
                    </Button>
                  </div>
                )}

                {/* Original Receipt */}
                {equipment.originalReceiptUrl && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">
                        Original Receipt
                      </span>
                    </div>

                    {isImageFile(equipment.originalReceiptUrl) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={equipment.originalReceiptUrl}
                          alt="Original Receipt"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            openFile(equipment.originalReceiptUrl!)
                          }
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(equipment.originalReceiptUrl)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(equipment.originalReceiptUrl!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* Equipment Registration */}
                {equipment.equipmentRegistrationUrl && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">Registration</span>
                    </div>

                    {isImageFile(equipment.equipmentRegistrationUrl) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={equipment.equipmentRegistrationUrl}
                          alt="Equipment Registration"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            openFile(equipment.equipmentRegistrationUrl!)
                          }
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(
                              equipment.equipmentRegistrationUrl
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() =>
                        openFile(equipment.equipmentRegistrationUrl!)
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* Third-Party Inspection Image */}
                {equipment.thirdpartyInspectionImage && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">
                        Third-Party Inspection
                      </span>
                    </div>

                    {isImageFile(equipment.thirdpartyInspectionImage) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={equipment.thirdpartyInspectionImage}
                          alt="Third-Party Inspection"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            openFile(equipment.thirdpartyInspectionImage!)
                          }
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(
                              equipment.thirdpartyInspectionImage
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() =>
                        openFile(equipment.thirdpartyInspectionImage!)
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}

                {/* PGPC Inspection Image */}
                {equipment.pgpcInspectionImage && (
                  <div className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-teal-500" />
                      <span className="font-medium text-sm">
                        PGPC Inspection
                      </span>
                    </div>

                    {isImageFile(equipment.pgpcInspectionImage) ? (
                      <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={equipment.pgpcInspectionImage}
                          alt="PGPC Inspection"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() =>
                            openFile(equipment.pgpcInspectionImage!)
                          }
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                          <p className="text-xs text-gray-500 truncate px-2">
                            {getFileNameFromUrl(equipment.pgpcInspectionImage)}
                          </p>
                        </div>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => openFile(equipment.pgpcInspectionImage!)}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Open Document
                    </Button>
                  </div>
                )}
              </div>

              {/* Documents Summary */}
              <div className="flex flex-wrap gap-2">
                {equipment.image_url && (
                  <Badge variant="outline" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    Image Available
                  </Badge>
                )}
                {equipment.originalReceiptUrl && (
                  <Badge variant="outline" className="text-xs">
                    <Receipt className="h-3 w-3 mr-1" />
                    Receipt Available
                  </Badge>
                )}
                {equipment.equipmentRegistrationUrl && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    Registration Available
                  </Badge>
                )}
                {equipment.thirdpartyInspectionImage && (
                  <Badge variant="outline" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Third-Party Inspection
                  </Badge>
                )}
                {equipment.pgpcInspectionImage && (
                  <Badge variant="outline" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    PGPC Inspection
                  </Badge>
                )}
                {!equipment.image_url &&
                  !equipment.originalReceiptUrl &&
                  !equipment.equipmentRegistrationUrl &&
                  !equipment.thirdpartyInspectionImage &&
                  !equipment.pgpcInspectionImage && (
                    <span className="text-sm text-muted-foreground">
                      No documents uploaded
                    </span>
                  )}
              </div>
            </div>

            {/* Remarks */}
            {equipment.remarks && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <p className="text-muted-foreground bg-gray-50 p-3 rounded-md">
                  {equipment.remarks}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentModal;

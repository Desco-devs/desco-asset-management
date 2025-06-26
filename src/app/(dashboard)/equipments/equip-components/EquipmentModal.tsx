"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
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

// Equipment interface (updated to include `before` and `equipmentParts`)
interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  insuranceExpirationDate?: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  before?: number;
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

interface EquipmentModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null | '';
}

const EquipmentModal = ({
  isOpen,
  onOpenChange,
  equipment,
}: EquipmentModalProps) => {
  if (!equipment) return null;

  const formatDate = (d: string) => new Date(d).toLocaleDateString();

  const getStatusColor = (s: string) =>
    s === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";

  const isExpiringSoon = (d: string) => {
    const expiry = new Date(d),
      today = new Date();
    const diff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return diff <= 30 && diff >= 0;
  };

  const isExpired = (d: string) => new Date(d) < new Date();

  const getFileName = (url: string) => {
    try {
      return new URL(url).pathname.split("/").pop() || "Document";
    } catch {
      return "Document";
    }
  };

  const isImage = (url: string) =>
    [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"].some((ext) =>
      url.toLowerCase().endsWith(ext)
    );

  const openFile = (url: string) => window.open(url, "_blank");

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-full max-h-[90vh] p-0 flex flex-col dark:bg-primary"
        style={{
          maxWidth: "1024px",
        }}
      >
        <DialogHeader className="p-6 pb-0 border-b flex-shrink-0">
          <DialogTitle className="flex md:flex-row flex-col md:items-center items-start gap-2 md:text-lg text-base">
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
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scroll-none p-6 space-y-6">
          {/* Image Preview */}
          {equipment.image_url && (
            <div className="flex justify-center">
              <div className="w-full aspect-video rounded-md overflow-hidden relative">
                <img
                  src={equipment.image_url}
                  alt={`${equipment.brand} ${equipment.model}`}
                  className="w-full h-full object-contain cursor-pointer"
                  onClick={() => openFile(equipment.image_url!)}
                />
                <p className="text-xs text-center text-muted-foreground mt-1 absolute top-0">
                  Click to view full size
                </p>
              </div>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Equipment Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Owner:</span> {equipment.owner}
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Client:</span>{" "}
                  {equipment.project.client.name}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Location:</span>{" "}
                  {equipment.project.client.location.address}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">Project</Badge>{" "}
                  {equipment.project.name}
                </div>
              </div>
            </div>

            {/* Right: Dates & Status, including “before” */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Dates & Status</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  {/* rename this  from insurance expiration to PGPC Inspection */}
                  <span className="font-medium">PGPC Inspection:</span>
                  <span
                    className={`${
                      isExpired(equipment.insuranceExpirationDate || "")
                        ? "text-red-600 font-semibold"
                        : isExpiringSoon(
                            equipment.insuranceExpirationDate || ""
                          )
                        ? "text-orange-600 font-semibold"
                        : ""
                    }`}
                  >
                    {formatDate(equipment.insuranceExpirationDate || "")}
                    {isExpired(equipment.insuranceExpirationDate || "")
                      ? " (Expired)"
                      : isExpiringSoon(equipment.insuranceExpirationDate || "")
                      ? " (Expiring Soon)"
                      : ""}
                  </span>
                </div>

                {equipment.inspectionDate && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Last Inspection:</span>{" "}
                    {formatDate(equipment.inspectionDate)}
                  </div>
                )}

                {equipment.before != null && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Before (Months):</span>{" "}
                    {equipment.before}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documents & Files Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documents & Files</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Equipment Image */}
              {equipment.image_url && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Equipment Image</span>
                  </div>
                  <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={equipment.image_url}
                      alt="Equipment"
                      className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
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
                  {isImage(equipment.originalReceiptUrl) ? (
                    <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={equipment.originalReceiptUrl}
                        alt="Receipt"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => openFile(equipment.originalReceiptUrl!)}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500 px-2 truncate">
                        {getFileName(equipment.originalReceiptUrl)}
                      </p>
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

              {/* Registration */}
              {equipment.equipmentRegistrationUrl && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-sm">Registration</span>
                  </div>
                  {isImage(equipment.equipmentRegistrationUrl) ? (
                    <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={equipment.equipmentRegistrationUrl}
                        alt="Registration"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() =>
                          openFile(equipment.equipmentRegistrationUrl!)
                        }
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500 px-2 truncate">
                        {getFileName(equipment.equipmentRegistrationUrl)}
                      </p>
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

              {/* Third-Party Inspection */}
              {equipment.thirdpartyInspectionImage && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-orange-500" />
                    <span className="font-medium text-sm">
                      Third-Party Inspection
                    </span>
                  </div>
                  {isImage(equipment.thirdpartyInspectionImage) ? (
                    <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={equipment.thirdpartyInspectionImage}
                        alt="3rd Party"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() =>
                          openFile(equipment.thirdpartyInspectionImage!)
                        }
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500 px-2 truncate">
                        {getFileName(equipment.thirdpartyInspectionImage)}
                      </p>
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

              {/* PGPC Inspection */}
              {equipment.pgpcInspectionImage && (
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-teal-500" />
                    <span className="font-medium text-sm">PGPC Inspection</span>
                  </div>
                  {isImage(equipment.pgpcInspectionImage) ? (
                    <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={equipment.pgpcInspectionImage}
                        alt="PGPC"
                        className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                        onClick={() => openFile(equipment.pgpcInspectionImage!)}
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-xs text-gray-500 px-2 truncate">
                        {getFileName(equipment.pgpcInspectionImage)}
                      </p>
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

              {/* Equipment Parts */}
              {equipment.equipmentParts &&
                equipment.equipmentParts.length > 0 && (
                  <>
                    {equipment.equipmentParts.map((partUrl, index) => (
                      <div
                        key={`part-${index}`}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-indigo-500" />
                          <span className="font-medium text-sm">
                            Equipment Part {index + 1}
                          </span>
                        </div>
                        {isImage(partUrl) ? (
                          <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                            <img
                              src={partUrl}
                              alt={`Part ${index + 1}`}
                              className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition"
                              onClick={() => openFile(partUrl)}
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-50 rounded-md flex items-center justify-center">
                            <FileText className="h-8 w-8 text-gray-400 mb-2" />
                            <p className="text-xs text-gray-500 px-2 truncate">
                              {getFileName(partUrl)}
                            </p>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => openFile(partUrl)}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Open Document
                        </Button>
                      </div>
                    ))}
                  </>
                )}
            </div>

            {/* Remarks */}
            {equipment.remarks && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <p className="bg-gray-50 p-3 rounded-md text-sm text-muted-foreground">
                  {equipment.remarks}
                </p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter></DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentModal;
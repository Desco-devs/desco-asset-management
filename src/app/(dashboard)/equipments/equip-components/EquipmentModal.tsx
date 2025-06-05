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
} from "lucide-react";

// Equipment interface (should match your main component)
interface Equipment {
  uid: string;
  brand: string;
  model: string;
  type: string;
  expirationDate: string;
  status: "OPERATIONAL" | "NON_OPERATIONAL";
  remarks?: string;
  owner: string;
  image_url?: string;
  inspectionDate?: string;
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

  const isExpiringSoon = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    const daysDiff = (expiry.getTime() - today.getTime()) / (1000 * 3600 * 24);
    return daysDiff <= 30 && daysDiff >= 0;
  };

  const isExpired = (expirationDate: string) => {
    const expiry = new Date(expirationDate);
    const today = new Date();
    return expiry < today;
  };

  if (!equipment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        {/* Fixed Header - no scrolling */}
        <DialogHeader className="p-6 pb-0 flex-shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            {equipment.brand} {equipment.model}
            <Badge className={getStatusColor(equipment.status)}>
              {equipment.status}
            </Badge>
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
                      className="w-full h-full object-cover"
                    />
                  </div>
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
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Dates & Status</h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Expires:</span>
                    <span
                      className={`${
                        isExpired(equipment.expirationDate)
                          ? "text-red-600 font-semibold"
                          : isExpiringSoon(equipment.expirationDate)
                          ? "text-orange-600 font-semibold"
                          : ""
                      }`}
                    >
                      {formatDate(equipment.expirationDate)}
                      {isExpired(equipment.expirationDate) && " (Expired)"}
                      {isExpiringSoon(equipment.expirationDate) &&
                        !isExpired(equipment.expirationDate) &&
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

            {/* Documents */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Documents</h3>
              <div className="flex flex-wrap gap-2">
                {equipment.image_url && (
                  <Badge variant="outline" className="text-xs">
                    <Image className="h-3 w-3 mr-1" />
                    Image Available
                  </Badge>
                )}
              </div>
            </div>

            {/* Remarks */}
            {equipment.remarks && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">Remarks</h3>
                <p className="text-muted-foreground">{equipment.remarks}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EquipmentModal;

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
  Car,
  CheckCircle,
  Eye,
  FileText,
  Settings,
  Shield,
} from "lucide-react";
import { isExpiringSoon, isExpired } from "../utils/dateUtils";
import type { Equipment } from "@/types/assets";

interface EquipmentCardProps {
  equipment: Equipment;
  isNew?: boolean;
  reportCount?: number;
  onClick: () => void;
  onViewReports?: (e: React.MouseEvent) => void;
}

export default function EquipmentCard({
  equipment,
  isNew = false,
  reportCount = 0,
  onClick,
  onViewReports,
}: EquipmentCardProps) {
  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const getDocumentCount = (equipment: Equipment) => {
    let count = 0;
    if (equipment.image_url) count++;
    if (equipment.originalReceiptUrl) count++;
    if (equipment.equipmentRegistrationUrl) count++;
    if (equipment.thirdpartyInspectionImage) count++;
    if (equipment.pgpcInspectionImage) count++;
    return count;
  };

  const getInspectionBadges = (equipment: Equipment) => {
    const badges = [];
    if (equipment.thirdpartyInspectionImage) {
      badges.push(
        <Badge
          key={`thirdparty-${equipment.uid}`}
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
          key={`pgpc-${equipment.uid}`}
          variant="outline"
          className="flex items-center gap-1 text-green-600 border-green-200"
        >
          <CheckCircle className="h-3 w-3" />
        </Badge>
      );
    }
    return badges;
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] bg-card/50 backdrop-blur-sm border-border/50"
      onClick={onClick}
    >
      <CardHeader className="relative pb-2">
        {/* Insurance Expiry Badge */}
        {isExpired(equipment.insuranceExpirationDate) && (
          <Badge className="absolute top-3 right-3 bg-red-500 text-white hover:bg-red-600">
            EXPIRED
          </Badge>
        )}
        {!isExpired(equipment.insuranceExpirationDate) &&
          isExpiringSoon(equipment.insuranceExpirationDate) && (
            <Badge className="absolute top-3 right-3 bg-yellow-500 text-white hover:bg-yellow-600">
              EXPIRING
            </Badge>
          )}

        <div className="space-y-1">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {equipment.brand} {equipment.model}
            </div>
            {/* Issue Reports Button */}
            {reportCount > 0 && onViewReports && (
              <Button
                size="sm"
                variant="outline"
                onClick={onViewReports}
                className="h-6 px-2 text-xs border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400"
              >
                <Eye className="h-3 w-3 mr-1" />
                {reportCount} issue{reportCount !== 1 ? "s" : ""}
              </Button>
            )}
          </CardTitle>
          <CardDescription className="font-medium text-accent-foreground/70 text-xs">
            {equipment.type}
          </CardDescription>

          <div className="flex flex-row flex-wrap gap-2">
            <Badge className={getStatusColor(equipment.status)}>
              {equipment.status}
            </Badge>

            {isNew && (
              <Badge className="bg-blue-500 text-white hover:bg-blue-600 animate-pulse">
                NEW
              </Badge>
            )}

            {equipment.plateNumber && (
              <Badge
                variant="outline"
                className="flex items-center gap-1"
              >
                <Car className="h-3 w-3" />
                {equipment.plateNumber}
              </Badge>
            )}

            {getInspectionBadges(equipment).length > 0 && (
              <div className="flex flex-row flex-wrap gap-2">
                {getInspectionBadges(equipment)}
              </div>
            )}
          </div>

          {getDocumentCount(equipment) > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>
                {getDocumentCount(equipment)} document
                {getDocumentCount(equipment) !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {equipment.image_url ? (
          <div className="aspect-video rounded-md overflow-hidden bg-white">
            <img
              src={equipment.image_url}
              alt={`${equipment.brand} ${equipment.model}`}
              className="w-full h-full object-contain object-center"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-md flex items-center justify-center">
            <Settings className="h-12 w-12 text-gray-400" />
          </div>
        )}

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
          <div className="flex justify-between">
            <span>Client:</span>
            <span
              className="font-medium truncate ml-2"
              title={equipment.project.client.name}
            >
              {equipment.project.client.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Location:</span>
            <span
              className="font-medium truncate ml-2"
              title={equipment.project.client.location.address}
            >
              {equipment.project.client.location.address}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Insurance:</span>
            <span
              className={`font-medium ${
                isExpired(equipment.insuranceExpirationDate)
                  ? "text-red-600"
                  : isExpiringSoon(equipment.insuranceExpirationDate)
                  ? "text-yellow-600"
                  : ""
              }`}
            >
              {new Date(equipment.insuranceExpirationDate).toLocaleDateString()}
            </span>
          </div>
          {equipment.remarks && (
            <div className="pt-1">
              <span className="text-xs font-medium">Remarks:</span>
              <p className="text-xs mt-1 text-muted-foreground">
                {equipment.remarks}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
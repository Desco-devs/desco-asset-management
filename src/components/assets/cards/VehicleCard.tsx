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
import { Car, FileText, Eye } from "lucide-react";
import Image from "next/image";
import { isExpiringSoon, isExpired } from "../utils/dateUtils";
import type { Vehicle } from "@/types/assets";

interface VehicleCardProps {
  vehicle: Vehicle;
  isNew?: boolean;
  reportCount?: number;
  onClick: () => void;
  onViewReports?: (e: React.MouseEvent) => void;
}

export default function VehicleCard({
  vehicle,
  isNew = false,
  reportCount = 0,
  onClick,
  onViewReports,
}: VehicleCardProps) {
  const getStatusColor = (status: string) => {
    return status === "OPERATIONAL"
      ? "bg-green-100 text-green-800 hover:bg-green-200"
      : "bg-red-100 text-red-800 hover:bg-red-200";
  };

  const getDocumentCount = (vehicle: Vehicle) => {
    let count = 0;
    if (vehicle.frontImgUrl) count++;
    if (vehicle.backImgUrl) count++;
    if (vehicle.side1ImgUrl) count++;
    if (vehicle.side2ImgUrl) count++;
    if (vehicle.originalReceiptUrl) count++;
    if (vehicle.carRegistrationUrl) count++;
    return count;
  };

  const getDisplayImage = (vehicle: Vehicle) => {
    return (
      vehicle.frontImgUrl ||
      vehicle.side1ImgUrl ||
      vehicle.side2ImgUrl ||
      vehicle.backImgUrl
    );
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02] bg-card/50 backdrop-blur-sm border-border/50"
      onClick={onClick}
    >
      <CardHeader className="relative pb-2">
        {/* Inspection Expiry Badge */}
        {isExpired(vehicle.expiryDate) && (
          <Badge className="absolute top-3 right-3 bg-red-500 text-white hover:bg-red-600">
            EXPIRED
          </Badge>
        )}
        {!isExpired(vehicle.expiryDate) &&
          isExpiringSoon(vehicle.expiryDate, vehicle.before) && (
            <Badge className="absolute top-3 right-3 bg-yellow-500 text-white hover:bg-yellow-600">
              EXPIRING
            </Badge>
          )}

        <div className="space-y-1">
          <CardTitle className="text-sm flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {vehicle.brand} {vehicle.model}
            </div>
            {/* Maintenance Reports Button */}
            {reportCount > 0 && onViewReports && (
              <Button
                size="sm"
                variant="outline"
                onClick={onViewReports}
                className="h-6 px-2 text-xs border-red-300 text-red-600 hover:bg-red-100 hover:border-red-400"
              >
                <Eye className="h-3 w-3 mr-1" />
                {reportCount} report{reportCount !== 1 ? "s" : ""}
              </Button>
            )}
          </CardTitle>
          <CardDescription className="font-medium text-accent-foreground/70 text-xs">
            {vehicle.type}
          </CardDescription>

          <div className="flex flex-row flex-wrap gap-2">
            <Badge className={getStatusColor(vehicle.status)}>
              {vehicle.status}
            </Badge>

            {isNew && (
              <Badge className="bg-blue-500 text-white hover:bg-blue-600 animate-pulse">
                NEW
              </Badge>
            )}

            <Badge variant="outline" className="flex items-center gap-1">
              <Car className="h-3 w-3" />
              {vehicle.plateNumber}
            </Badge>
          </div>

          {getDocumentCount(vehicle) > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>
                {getDocumentCount(vehicle)} document
                {getDocumentCount(vehicle) !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {getDisplayImage(vehicle) ? (
          <div className="aspect-video rounded-md overflow-hidden bg-white relative">
            <Image
              src={getDisplayImage(vehicle)!}
              alt={`${vehicle.brand} ${vehicle.model}`}
              fill
              className="object-contain object-center"
            />
          </div>
        ) : (
          <div className="aspect-video rounded-md flex items-center justify-center">
            <Car className="h-12 w-12 text-gray-400" />
          </div>
        )}

        <div className="pt-2 border-t text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Owner:</span>
            <span className="font-medium">{vehicle.owner}</span>
          </div>
          <div className="flex justify-between">
            <span>Project:</span>
            <span
              className="font-medium truncate ml-2"
              title={vehicle.project.name}
            >
              {vehicle.project.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Client:</span>
            <span
              className="font-medium truncate ml-2"
              title={vehicle.project.client.name}
            >
              {vehicle.project.client.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Location:</span>
            <span
              className="font-medium truncate ml-2"
              title={vehicle.project.client.location.address}
            >
              {vehicle.project.client.location.address}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Inspection:</span>
            <span
              className={`font-medium ${
                isExpired(vehicle.expiryDate)
                  ? "text-red-600"
                  : isExpiringSoon(vehicle.expiryDate, vehicle.before)
                  ? "text-yellow-600"
                  : ""
              }`}
            >
              {new Date(vehicle.expiryDate).toLocaleDateString()}
            </span>
          </div>
          {vehicle.remarks && (
            <div className="pt-1">
              <span className="text-xs font-medium">Remarks:</span>
              <p className="text-xs mt-1 text-muted-foreground">
                {vehicle.remarks}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
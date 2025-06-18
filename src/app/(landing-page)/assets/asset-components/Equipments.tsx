"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Car, FileText, Shield, CheckCircle } from "lucide-react";
import EquipmentModal from "@/app/(dashboard)/equipments/equip-components/EquipmentModal";

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

export default function EquipmentViewer() {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchEquipments = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/equipments/getall");
        if (!response.ok) throw new Error("Failed to fetch equipments");
        const data = await response.json();
        setEquipments(data);
      } catch (error) {
        console.error("Error fetching equipments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEquipments();
  }, []);

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

  //   const getExpirationBadge = (insuranceExpirationDate: string) => {
  //     if (isExpired(insuranceExpirationDate)) {
  //       return (
  //         <Badge className="bg-red-500 text-white hover:bg-red-600">
  //           Expired
  //         </Badge>
  //       );
  //     } else if (isExpiringSoon(insuranceExpirationDate)) {
  //       return (
  //         <Badge className="bg-orange-500 text-white hover:bg-orange-600">
  //           Expiring Soon
  //         </Badge>
  //       );
  //     }
  //     return null;
  //   };

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
          key="thirdparty"
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
          key="pgpc"
          variant="outline"
          className="flex items-center gap-1 text-teal-600 border-teal-200"
        >
          <CheckCircle className="h-3 w-3" />
        </Badge>
      );
    }
    return badges;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading equipment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {equipments.map((equipment) => (
          <Card
            key={equipment.uid}
            className="hover:shadow-lg  cursor-pointer z-40 bg-chart-3/20"
            onClick={() => {
              setSelectedEquipment(equipment);
              setIsModalOpen(true);
            }}
          >
            <CardHeader className="pb-3">
              <div className="space-y-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {equipment.brand} {equipment.model}
                </CardTitle>
                <CardDescription className="font-medium text-accent-foreground/70 text-xs">
                  {equipment.type}
                </CardDescription>

                <div className="flex flex-row flex-wrap gap-2">
                  <Badge className={getStatusColor(equipment.status)}>
                    {equipment.status}
                  </Badge>

                  {equipment.plateNumber && (
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1"
                    >
                      <Car className="h-3 w-3" />
                      {equipment.plateNumber}
                    </Badge>
                  )}

                  {/* {getExpirationBadge(equipment.insuranceExpirationDate)} */}
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
                <div className="aspect-video  rounded-md overflow-hidden">
                  <img
                    src={equipment.image_url}
                    alt={`${equipment.brand} ${equipment.model}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video  rounded-md flex items-center justify-center">
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
                  <span>Expires:</span>
                  {/* <span
                    className={`font-medium ${
                      isExpired(equipment.insuranceExpirationDate)
                        ? "text-red-600"
                        : isExpiringSoon(equipment.insuranceExpirationDate)
                        ? "text-orange-600"
                        : ""
                    }`}
                  >
                    {new Date(
                      equipment.insuranceExpirationDate
                    ).toLocaleDateString()}
                  </span> */}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {equipments.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Settings className="h-12 w-12 mx-auto mb-4 " />
            <h3 className="text-lg font-medium mb-2">No equipment found</h3>
            <p>Check back later for equipment listings.</p>
          </div>
        </Card>
      )}

      <EquipmentModal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => setSelectedEquipment(null), 200);
          }
          setIsModalOpen(open);
        }}
        equipment={selectedEquipment}
      />
    </div>
  );
}

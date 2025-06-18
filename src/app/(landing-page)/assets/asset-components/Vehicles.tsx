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
import { Car, FileText } from "lucide-react";
import VehicleModal from "@/app/(dashboard)/vehicles/vehicles-components/VehicleModal";

interface Vehicle {
  uid: string;
  brand: string;
  model: string;
  type: string;
  plateNumber: string;
  inspectionDate: string;
  before: number;
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

export default function VehicleViewer() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/vehicles/getall");
        if (!response.ok) throw new Error("Failed to fetch vehicles");
        const data = await response.json();
        setVehicles(data);
      } catch (error) {
        console.error("Error fetching vehicles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading vehicles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <Card
            key={vehicle.uid}
            className="hover:shadow-lg transition-shadow cursor-pointer z-40 bg-chart-3/20"
            onClick={() => {
              setSelectedVehicle(vehicle);
              setIsModalOpen(true);
            }}
          >
            <CardHeader>
              <div className="space-y-1">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {vehicle.brand} {vehicle.model}
                </CardTitle>
                <CardDescription className="font-medium text-accent-foreground/70 text-xs">
                  {vehicle.type} • {vehicle.plateNumber}
                </CardDescription>
                <Badge className={getStatusColor(vehicle.status)}>
                  {vehicle.status}
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {vehicle.frontImgUrl ? (
                <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={vehicle.frontImgUrl}
                    alt={`${vehicle.brand} ${vehicle.model} - Front`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video bg-gray-100 rounded-md flex items-center justify-center">
                  <Car className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {vehicles.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No vehicles found</h3>
            <p>Check back later for vehicle listings.</p>
          </div>
        </Card>
      )}

      <VehicleModal
        isOpen={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setTimeout(() => setSelectedVehicle(null), 200);
          }
          setIsModalOpen(open);
        }}
        vehicle={selectedVehicle}
      />
    </div>
  );
}

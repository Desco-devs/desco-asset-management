"use client";
import * as React from "react";
import { AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import type { EquipmentData, VehicleData } from "@/types/dashboard";

interface AlertItem {
  id: string;
  type: "equipment" | "vehicle";
  name: string;
  alertType: "inspection_due" | "insurance_expiring" | "overdue_maintenance";
  dueDate: string;
  daysUntilDue: number;
  severity: "critical" | "warning" | "info";
  location?: string;
  project?: string;
}

interface MaintenanceAlertsProps {
  initialEquipmentData: EquipmentData[];
  initialVehicleData: VehicleData[];
}

export function MaintenanceAlerts({
  initialEquipmentData,
  initialVehicleData,
}: MaintenanceAlertsProps) {
  const [equipmentData, setEquipmentData] =
    React.useState<EquipmentData[]>(initialEquipmentData);
  const [vehicleData, setVehicleData] =
    React.useState<VehicleData[]>(initialVehicleData);
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const supabase = createClient();

  const calculateAlerts = React.useCallback(() => {
    const allAlerts: AlertItem[] = [];
    const now = new Date();

    // Check equipment for upcoming inspections and insurance expiration
    equipmentData?.forEach((item) => {
      const inspectionDate = item.inspection_date
        ? new Date(item.inspection_date)
        : null;
      const insuranceDate = item.inspection_date
        ? new Date(item.inspection_date)
        : null;

      if (inspectionDate) {
        const daysUntilInspection = Math.ceil(
          (inspectionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilInspection <= 30 && daysUntilInspection >= -7) {
          allAlerts.push({
            id: `${item.id}-inspection`,
            type: "equipment",
            name: `${item.brand} ${item.model}`,
            alertType: "inspection_due",
            dueDate: inspectionDate.toISOString(),
            daysUntilDue: daysUntilInspection,
            severity:
              daysUntilInspection < 0
                ? "critical"
                : daysUntilInspection <= 7
                ? "warning"
                : "info",
          });
        }
      }

      if (insuranceDate) {
        const daysUntilInsurance = Math.ceil(
          (insuranceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilInsurance <= 30 && daysUntilInsurance >= -7) {
          allAlerts.push({
            id: `${item.id}-insurance`,
            type: "equipment",
            name: `${item.brand} ${item.model}`,
            alertType: "insurance_expiring",
            dueDate: insuranceDate.toISOString(),
            daysUntilDue: daysUntilInsurance,
            severity:
              daysUntilInsurance < 0
                ? "critical"
                : daysUntilInsurance <= 7
                ? "warning"
                : "info",
          });
        }
      }
    });

    // Check vehicles for upcoming inspections and registration expiry
    vehicleData?.forEach((item) => {
      const inspectionDate = item.inspection_date
        ? new Date(item.inspection_date)
        : null;
      const expiryDate = item.inspection_date
        ? new Date(item.inspection_date)
        : null;

      if (inspectionDate) {
        const daysUntilInspection = Math.ceil(
          (inspectionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilInspection <= 30 && daysUntilInspection >= -7) {
          allAlerts.push({
            id: `${item.id}-inspection`,
            type: "vehicle",
            name: `${item.brand} ${item.model} (${item.plate_number})`,
            alertType: "inspection_due",
            dueDate: inspectionDate.toISOString(),
            daysUntilDue: daysUntilInspection,
            severity:
              daysUntilInspection < 0
                ? "critical"
                : daysUntilInspection <= 7
                ? "warning"
                : "info",
          });
        }
      }

      if (expiryDate) {
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry <= 30 && daysUntilExpiry >= -7) {
          allAlerts.push({
            id: `${item.id}-expiry`,
            type: "vehicle",
            name: `${item.brand} ${item.model} (${item.plate_number})`,
            alertType: "insurance_expiring",
            dueDate: expiryDate.toISOString(),
            daysUntilDue: daysUntilExpiry,
            severity:
              daysUntilExpiry < 0
                ? "critical"
                : daysUntilExpiry <= 7
                ? "warning"
                : "info",
          });
        }
      }
    });

    // Sort by severity and days until due
    const sortedAlerts = allAlerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }
      return a.daysUntilDue - b.daysUntilDue;
    });

    setAlerts(sortedAlerts.slice(0, 15)); // Show top 15 alerts
  }, [equipmentData, vehicleData]);

  React.useEffect(() => {
    calculateAlerts();
  }, [calculateAlerts]);

  React.useEffect(() => {
    const equipmentChannel = supabase
      .channel(`maintenance-equipment-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        (payload) => {
          try {
            if (!payload || typeof payload !== "object") {
              console.warn("Invalid payload received:", payload);
              return;
            }

            if (
              payload.eventType === "INSERT" &&
              payload.new &&
              typeof payload.new === "object"
            ) {
              setEquipmentData((prev) => [
                ...prev,
                payload.new as EquipmentData,
              ]);
            } else if (
              payload.eventType === "UPDATE" &&
              payload.new &&
              typeof payload.new === "object" &&
              payload.new.id
            ) {
              setEquipmentData((prev) =>
                prev.map((item) =>
                  item.id === payload.new.id
                    ? (payload.new as EquipmentData)
                    : item
                )
              );
            } else if (
              payload.eventType === "DELETE" &&
              payload.old &&
              typeof payload.old === "object" &&
              payload.old.id
            ) {
              setEquipmentData((prev) =>
                prev.filter((item) => item.id !== payload.old.id)
              );
            }
          } catch (error) {
            console.error(
              "Error handling equipment realtime event:",
              error,
              payload
            );
          }
        }
      )
      .subscribe();

    const vehicleChannel = supabase
      .channel(`maintenance-vehicles-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        (payload) => {
          try {
            if (!payload || typeof payload !== "object") {
              console.warn("Invalid payload received:", payload);
              return;
            }

            if (
              payload.eventType === "INSERT" &&
              payload.new &&
              typeof payload.new === "object"
            ) {
              setVehicleData((prev) => [...prev, payload.new as VehicleData]);
            } else if (
              payload.eventType === "UPDATE" &&
              payload.new &&
              typeof payload.new === "object" &&
              payload.new.id
            ) {
              setVehicleData((prev) =>
                prev.map((item) =>
                  item.id === payload.new.id
                    ? (payload.new as VehicleData)
                    : item
                )
              );
            } else if (
              payload.eventType === "DELETE" &&
              payload.old &&
              typeof payload.old === "object" &&
              payload.old.id
            ) {
              setVehicleData((prev) =>
                prev.filter((item) => item.id !== payload.old.id)
              );
            }
          } catch (error) {
            console.error(
              "Error handling vehicle realtime event:",
              error,
              payload
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(vehicleChannel);
    };
  }, [supabase]);

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const getAlertBadgeColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const formatDueDate = (daysUntilDue: number) => {
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue === 1) return "Due tomorrow";
    return `Due in ${daysUntilDue} days`;
  };

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case "inspection_due":
        return "Inspection Due";
      case "insurance_expiring":
        return "Insurance/Registration Expiring";
      case "overdue_maintenance":
        return "Overdue Maintenance";
      default:
        return "Alert";
    }
  };

  return (
    <Card className="h-[500px]">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Maintenance Alerts
          {alerts.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.filter((a) => a.severity === "critical").length +
                alerts.filter((a) => a.severity === "warning").length}
            </Badge>
          )}
        </CardTitle>
        {alerts.length > 0 && (
          <Button variant="outline" size="sm">
            View All
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[420px] px-6">
          <div className="space-y-3 py-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No maintenance alerts at this time
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  All equipment and vehicles are up to date
                </p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getAlertIcon(alert.severity)}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium leading-none">
                          {alert.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {getAlertTypeLabel(alert.alertType)}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getAlertBadgeColor(
                          alert.severity
                        )}`}
                      >
                        {formatDueDate(alert.daysUntilDue)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {alert.type.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Due: {new Date(alert.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

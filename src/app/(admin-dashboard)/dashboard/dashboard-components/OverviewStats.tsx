"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import type {
  OverviewStatsProps,
  StatsData,
} from "@/types/dashboard";
import {
  AlertTriangle,
  Building2,
  FolderOpen,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";


export function OverviewStats({
  initialData,
}: OverviewStatsProps) {
  const [stats, setStats] = useState<StatsData>(initialData);
  const supabase = createClient();
  
  

  useEffect(() => {
    const equipmentChannel = supabase
      .channel("equipment-overview-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const status = payload.new.status;
            setStats((prev) => ({
              ...prev,
              equipment: {
                total: prev.equipment.total + 1,
                operational:
                  status === "OPERATIONAL"
                    ? prev.equipment.operational + 1
                    : prev.equipment.operational,
                nonOperational:
                  status === "NON_OPERATIONAL"
                    ? prev.equipment.nonOperational + 1
                    : prev.equipment.nonOperational,
              },
            }));
          } else if (payload.eventType === "UPDATE") {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            if (oldStatus !== newStatus) {
              setStats((prev) => ({
                ...prev,
                equipment: {
                  total: prev.equipment.total,
                  operational:
                    newStatus === "OPERATIONAL"
                      ? prev.equipment.operational + 1
                      : prev.equipment.operational - 1,
                  nonOperational:
                    newStatus === "NON_OPERATIONAL"
                      ? prev.equipment.nonOperational + 1
                      : prev.equipment.nonOperational - 1,
                },
              }));
            }
          } else if (payload.eventType === "DELETE") {
            const status = payload.old.status;
            setStats((prev) => ({
              ...prev,
              equipment: {
                total: prev.equipment.total - 1,
                operational:
                  status === "OPERATIONAL"
                    ? prev.equipment.operational - 1
                    : prev.equipment.operational,
                nonOperational:
                  status === "NON_OPERATIONAL"
                    ? prev.equipment.nonOperational - 1
                    : prev.equipment.nonOperational,
              },
            }));
          }
        }
      )
      .subscribe();

    const vehicleChannel = supabase
      .channel("vehicles-overview-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const status = payload.new.status;
            setStats((prev) => ({
              ...prev,
              vehicles: {
                total: prev.vehicles.total + 1,
                operational:
                  status === "OPERATIONAL"
                    ? prev.vehicles.operational + 1
                    : prev.vehicles.operational,
                nonOperational:
                  status === "NON_OPERATIONAL"
                    ? prev.vehicles.nonOperational + 1
                    : prev.vehicles.nonOperational,
              },
            }));
          } else if (payload.eventType === "UPDATE") {
            const oldStatus = payload.old.status;
            const newStatus = payload.new.status;
            if (oldStatus !== newStatus) {
              setStats((prev) => ({
                ...prev,
                vehicles: {
                  total: prev.vehicles.total,
                  operational:
                    newStatus === "OPERATIONAL"
                      ? prev.vehicles.operational + 1
                      : prev.vehicles.operational - 1,
                  nonOperational:
                    newStatus === "NON_OPERATIONAL"
                      ? prev.vehicles.nonOperational + 1
                      : prev.vehicles.nonOperational - 1,
                },
              }));
            }
          } else if (payload.eventType === "DELETE") {
            const status = payload.old.status;
            setStats((prev) => ({
              ...prev,
              vehicles: {
                total: prev.vehicles.total - 1,
                operational:
                  status === "OPERATIONAL"
                    ? prev.vehicles.operational - 1
                    : prev.vehicles.operational,
                nonOperational:
                  status === "NON_OPERATIONAL"
                    ? prev.vehicles.nonOperational - 1
                    : prev.vehicles.nonOperational,
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(vehicleChannel);
    };
  }, [supabase]);



  useEffect(() => {
    // Subscribe to location changes
    const locationsChannel = supabase
      .channel("locations-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setStats((prev: StatsData) => ({
              ...prev,
              locations: prev.locations + 1,
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setStats((prev: StatsData) => ({
              ...prev,
              locations: Math.max(0, prev.locations - 1),
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to client changes
    const clientsChannel = supabase
      .channel("clients-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setStats((prev: StatsData) => ({
              ...prev,
              clients: prev.clients + 1,
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setStats((prev: StatsData) => ({
              ...prev,
              clients: Math.max(0, prev.clients - 1),
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to project changes
    const projectsChannel = supabase
      .channel("projects-overview")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            setStats((prev: StatsData) => ({
              ...prev,
              projects: prev.projects + 1,
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setStats((prev: StatsData) => ({
              ...prev,
              projects: Math.max(0, prev.projects - 1),
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to maintenance reports
    const maintenanceChannel = supabase
      .channel("maintenance-overview")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maintenance_equipment_reports",
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const status = payload.new.status;
            setStats((prev: StatsData) => ({
              ...prev,
              maintenanceReports: {
                ...prev.maintenanceReports,
                total: prev.maintenanceReports.total + 1,
                pending:
                  status === "REPORTED"
                    ? prev.maintenanceReports.pending + 1
                    : prev.maintenanceReports.pending,
                inProgress:
                  status === "IN_PROGRESS"
                    ? prev.maintenanceReports.inProgress + 1
                    : prev.maintenanceReports.inProgress,
              },
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            const status = payload.old.status;
            setStats((prev: StatsData) => ({
              ...prev,
              maintenanceReports: {
                ...prev.maintenanceReports,
                total: Math.max(0, prev.maintenanceReports.total - 1),
                pending:
                  status === "REPORTED"
                    ? Math.max(0, prev.maintenanceReports.pending - 1)
                    : prev.maintenanceReports.pending,
                inProgress:
                  status === "IN_PROGRESS"
                    ? Math.max(0, prev.maintenanceReports.inProgress - 1)
                    : prev.maintenanceReports.inProgress,
              },
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationsChannel);
      supabase.removeChannel(clientsChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(maintenanceChannel);
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Locations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.locations}</div>
            <p className="text-xs text-muted-foreground">Active locations</p>
          </CardContent>
        </Card>

        {/* Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.growth.newClientsThisWeek > 0
                ? `+${stats.growth.newClientsThisWeek} new this week`
                : "Total clients"}
            </p>
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
            <p className="text-xs text-muted-foreground">
              {stats.growth.newProjectsThisWeek > 0
                ? `+${stats.growth.newProjectsThisWeek} new this week`
                : "Active projects"}
            </p>
          </CardContent>
        </Card>

        {/* Vehicles */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.vehicles.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.vehicles.total > 0
                ? Math.round(
                    (stats.vehicles.operational / stats.vehicles.total) * 100
                  )
                : 0}
              % operational
            </p>
          </CardContent>
        </Card>

        {/* Equipment */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipment</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.equipment.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.equipment.total > 0
                ? Math.round(
                    (stats.equipment.operational / stats.equipment.total) * 100
                  )
                : 0}
              % operational
            </p>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.maintenanceReports.total}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.maintenanceReports.total === 0
                ? "All systems running smooth"
                : `${
                    stats.maintenanceReports.pending +
                    stats.maintenanceReports.inProgress
                  } active issues`}
            </p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

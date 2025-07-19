"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase";
import type {
  ClientData,
  EquipmentData,
  LocationData,
  MaintenanceReportData,
  OverviewStatsProps,
  ProjectData,
  StatsData,
  VehicleData,
} from "@/types/dashboard";
import {
  AlertTriangle,
  Building2,
  ExternalLink,
  FolderOpen,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DetailedDataItem =
  | LocationData
  | ClientData
  | ProjectData
  | EquipmentData
  | VehicleData
  | MaintenanceReportData;

export function OverviewStats({
  initialData,
  detailedData,
}: OverviewStatsProps) {
  const [stats, setStats] = useState<StatsData>(initialData);
  const [realtimeDetailedData, setRealtimeDetailedData] =
    useState(detailedData);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const equipmentChannel = supabase
      .channel(`equipment-overview-stats-${Date.now()}`)
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
      .channel(`vehicles-overview-stats-${Date.now()}`)
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

  const getViewAllRoute = (type: string) => {
    const routes: { [key: string]: string } = {
      locations: "/locations",
      clients: "/clients",
      projects: "/projects",
      equipment: "/equipments",
      vehicles: "/vehicles",
      maintenanceReports: "/maintenance-reports",
    };
    return routes[type] || "/dashboard";
  };

  const handleCardClick = (type: string) => {
    setSelectedView(selectedView === type ? null : type);
  };

  const renderDetailedView = () => {
    if (!selectedView) return null;

    const data =
      realtimeDetailedData[selectedView as keyof typeof realtimeDetailedData];

    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Recent{" "}
              {selectedView.charAt(0).toUpperCase() + selectedView.slice(1)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(getViewAllRoute(selectedView || ""))}
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View All
              </Button>
              <button
                onClick={() => setSelectedView(null)}
                className="text-sm text-muted-foreground hover:text-foreground ml-2"
              >
                ✕
              </button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            {data.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-muted-foreground mb-2">
                  {selectedView === "locations" && "📍 No locations found"}
                  {selectedView === "clients" && "🏢 No clients registered"}
                  {selectedView === "projects" && "📁 No projects created"}
                  {selectedView === "equipment" && "🔧 No equipment added"}
                  {selectedView === "vehicles" && "🚗 No vehicles registered"}
                  {selectedView === "maintenanceReports" &&
                    "✅ No maintenance reports"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedView === "locations" &&
                    "Create your first location to get started"}
                  {selectedView === "clients" &&
                    "Add your first client to begin managing projects"}
                  {selectedView === "projects" &&
                    "Start your first project to track assets"}
                  {selectedView === "equipment" &&
                    "Add equipment to start tracking your assets"}
                  {selectedView === "vehicles" &&
                    "Register vehicles to manage your fleet"}
                  {selectedView === "maintenanceReports" &&
                    "Great! No maintenance issues to report"}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {(data as DetailedDataItem[])
                  .slice(0, 5)
                  .map((item: DetailedDataItem, index: number) => (
                    <div
                      key={`${selectedView}-${item.id}-${index}`}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="font-medium text-base">
                        {selectedView === "locations" &&
                          (item as LocationData).address}
                        {selectedView === "clients" &&
                          (item as ClientData).name}
                        {selectedView === "projects" &&
                          (item as ProjectData).name}
                        {selectedView === "equipment" &&
                          `${(item as EquipmentData).brand} ${
                            (item as EquipmentData).model
                          }`}
                        {selectedView === "vehicles" &&
                          `${(item as VehicleData).brand} ${
                            (item as VehicleData).model
                          }`}
                        {selectedView === "maintenanceReports" &&
                          "Maintenance Report"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {selectedView === "locations" &&
                          `${
                            (item as LocationData).clients?.length || 0
                          } clients • ${new Date(
                            item.created_at
                          ).toLocaleDateString()}`}
                        {selectedView === "clients" &&
                          `${
                            (item as ClientData).projects?.length || 0
                          } projects • ${
                            (item as ClientData).location?.address ||
                            "No location"
                          }`}
                        {selectedView === "projects" &&
                          `${
                            ((item as ProjectData).equipments?.length || 0) +
                            ((item as ProjectData).vehicles?.length || 0)
                          } assets • ${
                            (item as ProjectData).client?.name || "No client"
                          }`}
                        {selectedView === "equipment" &&
                          `${(item as EquipmentData).type} • ${
                            (item as EquipmentData).status
                          } • ${(item as EquipmentData).owner}`}
                        {selectedView === "vehicles" &&
                          `${(item as VehicleData).plate_number} • ${
                            (item as VehicleData).status
                          } • ${(item as VehicleData).owner}`}
                        {selectedView === "maintenanceReports" &&
                          `${
                            (item as MaintenanceReportData).priority ||
                            "No priority"
                          } • ${
                            (item as MaintenanceReportData).status || "Unknown"
                          } • ${new Date(
                            (item as MaintenanceReportData).date_reported ||
                              item.created_at
                          ).toLocaleDateString()}`}
                      </div>
                    </div>
                  ))}
                {data.length > 5 && (
                  <div className="text-center py-3 text-sm text-muted-foreground bg-muted/30 rounded-lg">
                    ... and {data.length - 5} more items
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  useEffect(() => {
    // Subscribe to location changes
    const locationsChannel = supabase
      .channel(`locations-overview-${Date.now()}`)
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
      .channel(`clients-overview-${Date.now()}`)
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
      .channel(`projects-overview-${Date.now()}`)
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
      .channel(`maintenance-overview-${Date.now()}`)
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

    // Realtime subscriptions for detailed data (recent items)
    const detailedLocationsChannel = supabase
      .channel(`detailed-locations-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "locations" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            console.log("Location INSERT payload:", payload.new); // Debug log
            const createdAt = payload.new.created_at
              ? new Date(payload.new.created_at)
              : new Date();
            const newLocation: LocationData = {
              id: payload.new.id,
              address: payload.new.address || "No address provided",
              created_at: isNaN(createdAt.getTime()) ? new Date() : createdAt,
              clients: [],
            };
            setRealtimeDetailedData((prev) => ({
              ...prev,
              locations: [newLocation, ...prev.locations].slice(0, 10), // Keep only recent 10
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              locations: prev.locations.filter(
                (item) => item.id !== payload.old.id
              ),
            }));
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              locations: prev.locations.map((item) =>
                item.id === payload.new.id
                  ? { ...item, address: payload.new.address }
                  : item
              ),
            }));
          }
        }
      )
      .subscribe();

    const detailedClientsChannel = supabase
      .channel(`detailed-clients-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            console.log("Client INSERT payload:", payload.new); // Debug log
            const createdAt = payload.new.created_at
              ? new Date(payload.new.created_at)
              : new Date();
            const newClient: ClientData = {
              id: payload.new.id,
              name: payload.new.name || "Unknown Client",
              created_at: isNaN(createdAt.getTime()) ? new Date() : createdAt,
              location: undefined,
              projects: [],
            };
            setRealtimeDetailedData((prev) => ({
              ...prev,
              clients: [newClient, ...prev.clients].slice(0, 10),
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              clients: prev.clients.filter(
                (item) => item.id !== payload.old.id
              ),
            }));
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              clients: prev.clients.map((item) =>
                item.id === payload.new.id
                  ? { ...item, name: payload.new.name }
                  : item
              ),
            }));
          }
        }
      )
      .subscribe();

    const detailedProjectsChannel = supabase
      .channel(`detailed-projects-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const createdAt = payload.new.created_at
              ? new Date(payload.new.created_at)
              : new Date();
            const newProject: ProjectData = {
              id: payload.new.id,
              name: payload.new.name || "Unknown Project",
              created_at: isNaN(createdAt.getTime()) ? new Date() : createdAt,
              client: undefined,
              equipments: [],
              vehicles: [],
            };
            setRealtimeDetailedData((prev) => ({
              ...prev,
              projects: [newProject, ...prev.projects].slice(0, 10),
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              projects: prev.projects.filter(
                (item) => item.id !== payload.old.id
              ),
            }));
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              projects: prev.projects.map((item) =>
                item.id === payload.new.id
                  ? { ...item, name: payload.new.name }
                  : item
              ),
            }));
          }
        }
      )
      .subscribe();

    const detailedEquipmentChannel = supabase
      .channel(`detailed-equipment-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "equipment" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const createdAt = payload.new.created_at
              ? new Date(payload.new.created_at)
              : new Date();
            const newEquipment: EquipmentData = {
              id: payload.new.id,
              brand: payload.new.brand || "Unknown",
              model: payload.new.model || "Unknown",
              type: payload.new.type || "Unknown",
              status: payload.new.status || "OPERATIONAL",
              owner: payload.new.owner || "Unknown",
              created_at: isNaN(createdAt.getTime()) ? new Date() : createdAt,
            };
            setRealtimeDetailedData((prev) => ({
              ...prev,
              equipment: [newEquipment, ...prev.equipment].slice(0, 10),
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              equipment: prev.equipment.filter(
                (item) => item.id !== payload.old.id
              ),
            }));
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              equipment: prev.equipment.map((item) =>
                item.id === payload.new.id
                  ? {
                      ...item,
                      brand: payload.new.brand || item.brand,
                      model: payload.new.model || item.model,
                      status: payload.new.status || item.status,
                      owner: payload.new.owner || item.owner,
                    }
                  : item
              ),
            }));
          }
        }
      )
      .subscribe();

    const detailedVehiclesChannel = supabase
      .channel(`detailed-vehicles-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles" },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const createdAt = payload.new.created_at
              ? new Date(payload.new.created_at)
              : new Date();
            const newVehicle: VehicleData = {
              id: payload.new.id,
              brand: payload.new.brand || "Unknown",
              model: payload.new.model || "Unknown",
              type: payload.new.type || "Unknown",
              plate_number: payload.new.plate_number || "Unknown",
              status: payload.new.status || "OPERATIONAL",
              owner: payload.new.owner || "Unknown",
              created_at: isNaN(createdAt.getTime()) ? new Date() : createdAt,
            };
            setRealtimeDetailedData((prev) => ({
              ...prev,
              vehicles: [newVehicle, ...prev.vehicles].slice(0, 10),
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              vehicles: prev.vehicles.filter(
                (item) => item.id !== payload.old.id
              ),
            }));
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              vehicles: prev.vehicles.map((item) =>
                item.id === payload.new.id
                  ? {
                      ...item,
                      brand: payload.new.brand || item.brand,
                      model: payload.new.model || item.model,
                      type: payload.new.type || item.type,
                      plate_number:
                        payload.new.plate_number || item.plate_number,
                      status: payload.new.status || item.status,
                      owner: payload.new.owner || item.owner,
                    }
                  : item
              ),
            }));
          }
        }
      )
      .subscribe();

    const detailedMaintenanceChannel = supabase
      .channel(`detailed-maintenance-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maintenance_equipment_reports",
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const createdAt = payload.new.created_at
              ? new Date(payload.new.created_at)
              : new Date();
            const dateReported = payload.new.date_reported
              ? new Date(payload.new.date_reported)
              : createdAt;
            const newReport: MaintenanceReportData = {
              id: payload.new.id,
              issue_description:
                payload.new.issue_description || "No description",
              priority: payload.new.priority || "MEDIUM",
              status: payload.new.status || "REPORTED",
              date_reported: isNaN(dateReported.getTime())
                ? createdAt
                : dateReported,
              created_at: isNaN(createdAt.getTime()) ? new Date() : createdAt,
            };
            setRealtimeDetailedData((prev) => ({
              ...prev,
              maintenanceReports: [newReport, ...prev.maintenanceReports].slice(
                0,
                10
              ),
            }));
          } else if (payload.eventType === "DELETE" && payload.old) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              maintenanceReports: prev.maintenanceReports.filter(
                (item) => item.id !== payload.old.id
              ),
            }));
          } else if (payload.eventType === "UPDATE" && payload.new) {
            setRealtimeDetailedData((prev) => ({
              ...prev,
              maintenanceReports: prev.maintenanceReports.map((item) =>
                item.id === payload.new.id
                  ? {
                      ...item,
                      issue_description:
                        payload.new.issue_description || item.issue_description,
                      priority: payload.new.priority || item.priority,
                      status: payload.new.status || item.status,
                    }
                  : item
              ),
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
      supabase.removeChannel(detailedLocationsChannel);
      supabase.removeChannel(detailedClientsChannel);
      supabase.removeChannel(detailedProjectsChannel);
      supabase.removeChannel(detailedEquipmentChannel);
      supabase.removeChannel(detailedVehiclesChannel);
      supabase.removeChannel(detailedMaintenanceChannel);
    };
  }, [supabase]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Locations */}
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedView === "locations" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleCardClick("locations")}
        >
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
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedView === "clients" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleCardClick("clients")}
        >
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
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedView === "projects" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleCardClick("projects")}
        >
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
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedView === "vehicles" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleCardClick("vehicles")}
        >
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
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedView === "equipment" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleCardClick("equipment")}
        >
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
        <Card
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedView === "maintenanceReports" ? "ring-2 ring-primary" : ""
          }`}
          onClick={() => handleCardClick("maintenanceReports")}
        >
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

      {/* Detailed View */}
      {renderDetailedView()}
    </div>
  );
}

"use client";
import * as React from "react";
import { Building2, Users, FolderOpen, Truck, Wrench, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsData {
  locations: number;
  clients: number;
  projects: number;
  vehicles: { total: number; operational: number; nonOperational: number };
  equipment: { total: number; operational: number; nonOperational: number };
  maintenanceReports: { total: number; pending: number; inProgress: number };
}

export function OverviewStats() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<StatsData | null>(null);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        const [
          locationsRes,
          clientsRes,
          projectsRes,
          vehiclesRes,
          equipmentRes,
          maintenanceRes
        ] = await Promise.all([
          fetch("/api/locations/getall"),
          fetch("/api/clients/getall"),
          fetch("/api/projects/getall"),
          fetch("/api/vehicles/count"),
          fetch("/api/equipments/count"),
          fetch("/api/maintenance-reports")
        ]);

        const [
          locationsData,
          clientsData,
          projectsData,
          vehiclesData,
          equipmentData,
          maintenanceData
        ] = await Promise.all([
          locationsRes.json(),
          clientsRes.json(),
          projectsRes.json(),
          vehiclesRes.json(),
          equipmentRes.json(),
          maintenanceRes.json()
        ]);

        setStats({
          locations: locationsData?.length || 0,
          clients: clientsData?.length || 0,
          projects: projectsData?.length || 0,
          vehicles: {
            total: (vehiclesData.OPERATIONAL || 0) + (vehiclesData.NON_OPERATIONAL || 0),
            operational: vehiclesData.OPERATIONAL || 0,
            nonOperational: vehiclesData.NON_OPERATIONAL || 0
          },
          equipment: {
            total: (equipmentData.OPERATIONAL || 0) + (equipmentData.NON_OPERATIONAL || 0),
            operational: equipmentData.OPERATIONAL || 0,
            nonOperational: equipmentData.NON_OPERATIONAL || 0
          },
          maintenanceReports: {
            total: maintenanceData?.length || 0,
            pending: maintenanceData?.filter((r: any) => r.status === 'REPORTED')?.length || 0,
            inProgress: maintenanceData?.filter((r: any) => r.status === 'IN_PROGRESS')?.length || 0
          }
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch statistics");
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-6 bg-gray-200 rounded w-16 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            {error || "Failed to load dashboard statistics"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
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
          <p className="text-xs text-muted-foreground">Total clients</p>
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
          <p className="text-xs text-muted-foreground">Active projects</p>
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
            {stats.vehicles.operational} operational, {stats.vehicles.nonOperational} non-op
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
            {stats.equipment.operational} operational, {stats.equipment.nonOperational} non-op
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
          <div className="text-2xl font-bold">{stats.maintenanceReports.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.maintenanceReports.pending + stats.maintenanceReports.inProgress} active reports
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
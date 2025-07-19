"use client";
import { useState, useEffect } from "react";
import { Building2, Users, FolderOpen, Truck, Wrench, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAssetCounts } from "@/hooks/useAssetCounts";
import type { 
  StatsData, 
  OverviewStatsProps, 
  LocationData,
  ClientData,
  ProjectData,
  EquipmentData,
  VehicleData,
  MaintenanceReportData
} from "@/types/dashboard";

type DetailedDataItem = LocationData | ClientData | ProjectData | EquipmentData | VehicleData | MaintenanceReportData;

export function OverviewStats({ initialData, detailedData }: OverviewStatsProps) {
  const [stats, setStats] = useState<StatsData>(initialData);
  const [selectedView, setSelectedView] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Use shared asset counts hook
  const assetCounts = useAssetCounts({
    equipment: { 
      OPERATIONAL: initialData.equipment.operational, 
      NON_OPERATIONAL: initialData.equipment.nonOperational 
    },
    vehicles: { 
      OPERATIONAL: initialData.vehicles.operational, 
      NON_OPERATIONAL: initialData.vehicles.nonOperational 
    }
  });

  // Update stats when asset counts change
  useEffect(() => {
    setStats((prev: StatsData) => ({
      ...prev,
      equipment: {
        total: assetCounts.equipment.OPERATIONAL + assetCounts.equipment.NON_OPERATIONAL,
        operational: assetCounts.equipment.OPERATIONAL,
        nonOperational: assetCounts.equipment.NON_OPERATIONAL
      },
      vehicles: {
        total: assetCounts.vehicles.OPERATIONAL + assetCounts.vehicles.NON_OPERATIONAL,
        operational: assetCounts.vehicles.OPERATIONAL,
        nonOperational: assetCounts.vehicles.NON_OPERATIONAL
      }
    }));
  }, [assetCounts]);

  const getViewAllRoute = (type: string) => {
    const routes: { [key: string]: string } = {
      locations: '/locations',
      clients: '/clients', 
      projects: '/projects',
      equipment: '/equipments',
      vehicles: '/vehicles',
      maintenanceReports: '/maintenance-reports'
    };
    return routes[type] || '/dashboard';
  };

  const handleCardClick = (type: string) => {
    setSelectedView(selectedView === type ? null : type);
  };

  const renderDetailedView = () => {
    if (!selectedView) return null;

    const data = detailedData[selectedView as keyof typeof detailedData];
    
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent {selectedView.charAt(0).toUpperCase() + selectedView.slice(1)}</span>
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                variant="outline"
                onClick={() => router.push(getViewAllRoute(selectedView || ''))}
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
                  {selectedView === 'locations' && '📍 No locations found'}
                  {selectedView === 'clients' && '🏢 No clients registered'}
                  {selectedView === 'projects' && '📁 No projects created'}
                  {selectedView === 'equipment' && '🔧 No equipment added'}
                  {selectedView === 'vehicles' && '🚗 No vehicles registered'}
                  {selectedView === 'maintenanceReports' && '✅ No maintenance reports'}
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedView === 'locations' && 'Create your first location to get started'}
                  {selectedView === 'clients' && 'Add your first client to begin managing projects'}
                  {selectedView === 'projects' && 'Start your first project to track assets'}
                  {selectedView === 'equipment' && 'Add equipment to start tracking your assets'}
                  {selectedView === 'vehicles' && 'Register vehicles to manage your fleet'}
                  {selectedView === 'maintenanceReports' && 'Great! No maintenance issues to report'}
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {(data as DetailedDataItem[]).slice(0, 5).map((item: DetailedDataItem) => (
                <div key={item.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="font-medium text-base">
                    {selectedView === 'locations' && (item as LocationData).address}
                    {selectedView === 'clients' && (item as ClientData).name}
                    {selectedView === 'projects' && (item as ProjectData).name}
                    {selectedView === 'equipment' && `${(item as EquipmentData).brand} ${(item as EquipmentData).model}`}
                    {selectedView === 'vehicles' && `${(item as VehicleData).brand} ${(item as VehicleData).model}`}
                    {selectedView === 'maintenanceReports' && 'Maintenance Report'}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    {selectedView === 'locations' && `${(item as LocationData).clients?.length || 0} clients • ${new Date(item.created_at).toLocaleDateString()}`}
                    {selectedView === 'clients' && `${(item as ClientData).projects?.length || 0} projects • ${(item as ClientData).location?.address || 'No location'}`}
                    {selectedView === 'projects' && `${((item as ProjectData).equipments?.length || 0) + ((item as ProjectData).vehicles?.length || 0)} assets • ${(item as ProjectData).client?.name || 'No client'}`}
                    {selectedView === 'equipment' && `${(item as EquipmentData).type} • ${(item as EquipmentData).status} • ${(item as EquipmentData).owner}`}
                    {selectedView === 'vehicles' && `${(item as VehicleData).plate_number} • ${(item as VehicleData).status} • ${(item as VehicleData).owner}`}
                    {selectedView === 'maintenanceReports' && `${(item as MaintenanceReportData).priority || 'No priority'} • ${(item as MaintenanceReportData).status || 'Unknown'} • ${new Date((item as MaintenanceReportData).date_reported || item.created_at).toLocaleDateString()}`}
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
    // Subscribe to real-time changes
    const locationsChannel = supabase
      .channel('locations-stats-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => {
        setStats((prev: StatsData) => ({ ...prev, locations: prev.locations + (Math.random() > 0.5 ? 1 : -1) }));
        toast.info('Location data updated');
      })
      .subscribe();

    const clientsChannel = supabase
      .channel('clients-stats-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        setStats((prev: StatsData) => ({ ...prev, clients: prev.clients + (Math.random() > 0.5 ? 1 : -1) }));
        toast.info('Client data updated');
      })
      .subscribe();

    const projectsChannel = supabase
      .channel('projects-stats-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        setStats((prev: StatsData) => ({ ...prev, projects: prev.projects + (Math.random() > 0.5 ? 1 : -1) }));
        toast.info('Project data updated');
      })
      .subscribe();


    const maintenanceChannel = supabase
      .channel('maintenance-stats-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'maintenance_equipment_reports' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const status = payload.new.status;
          setStats((prev: StatsData) => ({
            ...prev,
            maintenanceReports: {
              ...prev.maintenanceReports,
              total: prev.maintenanceReports.total + 1,
              pending: status === 'REPORTED' ? prev.maintenanceReports.pending + 1 : prev.maintenanceReports.pending,
              inProgress: status === 'IN_PROGRESS' ? prev.maintenanceReports.inProgress + 1 : prev.maintenanceReports.inProgress
            }
          }));
        } else if (payload.eventType === 'DELETE') {
          const status = payload.old.status;
          setStats((prev: StatsData) => ({
            ...prev,
            maintenanceReports: {
              ...prev.maintenanceReports,
              total: prev.maintenanceReports.total - 1,
              pending: status === 'REPORTED' ? prev.maintenanceReports.pending - 1 : prev.maintenanceReports.pending,
              inProgress: status === 'IN_PROGRESS' ? prev.maintenanceReports.inProgress - 1 : prev.maintenanceReports.inProgress
            }
          }));
        }
        toast.info('Maintenance reports updated');
      })
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
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${selectedView === 'locations' ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleCardClick('locations')}
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
        className={`cursor-pointer transition-all hover:shadow-md ${selectedView === 'clients' ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleCardClick('clients')}
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
              : "Total clients"
            }
          </p>
        </CardContent>
      </Card>

      {/* Projects */}
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${selectedView === 'projects' ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleCardClick('projects')}
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
              : "Active projects"
            }
          </p>
        </CardContent>
      </Card>

      {/* Vehicles */}
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${selectedView === 'vehicles' ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleCardClick('vehicles')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Vehicles</CardTitle>
          <Truck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.vehicles.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.vehicles.total > 0 ? Math.round((stats.vehicles.operational / stats.vehicles.total) * 100) : 0}% operational
          </p>
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${selectedView === 'equipment' ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleCardClick('equipment')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Equipment</CardTitle>
          <Wrench className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.equipment.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.equipment.total > 0 ? Math.round((stats.equipment.operational / stats.equipment.total) * 100) : 0}% operational
          </p>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${selectedView === 'maintenanceReports' ? 'ring-2 ring-primary' : ''}`}
        onClick={() => handleCardClick('maintenanceReports')}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.maintenanceReports.total}</div>
          <p className="text-xs text-muted-foreground">
            {stats.maintenanceReports.total === 0 
              ? "All systems running smooth" 
              : `${stats.maintenanceReports.pending + stats.maintenanceReports.inProgress} active issues`
            }
          </p>
        </CardContent>
      </Card>
      </div>
      
      {/* Detailed View */}
      {renderDetailedView()}
    </div>
  );
}
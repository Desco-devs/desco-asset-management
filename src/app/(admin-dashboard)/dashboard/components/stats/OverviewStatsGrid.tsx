"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useOverviewStats, 
  useSelectedTimeRange,
  useDashboardStore
} from "@/stores/dashboard-store";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  FolderOpen, 
  Truck, 
  Wrench, 
  ClipboardList,
  TrendingUp,
  TrendingDown
} from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  className?: string;
}

function MetricCard({ title, value, icon, trend, subtitle, className }: MetricCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 text-emerald-500 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <Badge 
              variant={trend.isPositive ? "default" : "destructive"}
              className="text-xs"
            >
              +{trend.value} {trend.label || "this week"}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewStatsGrid() {
  const overviewStats = useOverviewStats();
  const selectedTimeRange = useSelectedTimeRange();
  const setSelectedTimeRange = useDashboardStore(state => state.setSelectedTimeRange);

  if (!overviewStats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const {
    locations,
    clients,
    projects,
    vehicles,
    equipment,
    maintenanceReports,
    growth
  } = overviewStats;

  return (
    <div className="space-y-4">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Time Range:</span>
        <div className="flex gap-1">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedTimeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Core Business Metrics */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Business Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Locations"
            value={locations}
            icon={<Building2 className="h-4 w-4" />}
          />
          <MetricCard
            title="Clients"
            value={clients}
            icon={<Users className="h-4 w-4" />}
            trend={{
              value: growth.newClientsThisWeek,
              isPositive: growth.newClientsThisWeek > 0,
              label: "new this week"
            }}
          />
          <MetricCard
            title="Projects"
            value={projects}
            icon={<FolderOpen className="h-4 w-4" />}
            trend={{
              value: growth.newProjectsThisWeek,
              isPositive: growth.newProjectsThisWeek > 0,
              label: "new this week"
            }}
          />
          <MetricCard
            title="Maintenance Reports"
            value={maintenanceReports.total}
            icon={<ClipboardList className="h-4 w-4" />}
            subtitle={`${maintenanceReports.pending} pending, ${maintenanceReports.inProgress} in progress`}
          />
        </div>
      </div>

      {/* Asset Overview */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Fleet Assets</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total Vehicles"
            value={vehicles.total}
            icon={<Truck className="h-4 w-4" />}
            subtitle={`${vehicles.operational} operational, ${vehicles.nonOperational} non-operational`}
            trend={{
              value: growth.newVehiclesThisWeek,
              isPositive: growth.newVehiclesThisWeek > 0,
              label: "new this week"
            }}
          />
          <MetricCard
            title="Total Equipment"
            value={equipment.total}
            icon={<Wrench className="h-4 w-4" />}
            subtitle={`${equipment.operational} operational, ${equipment.nonOperational} non-operational`}
            trend={{
              value: growth.newEquipmentThisWeek,
              isPositive: growth.newEquipmentThisWeek > 0,
              label: "new this week"
            }}
          />
          <MetricCard
            title="Fleet Operational Rate"
            value={`${Math.round(
              ((vehicles.operational + equipment.operational) / 
               (vehicles.total + equipment.total)) * 100
            )}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            subtitle="Combined operational percentage"
          />
          <MetricCard
            title="Total Assets"
            value={vehicles.total + equipment.total}
            icon={<Building2 className="h-4 w-4" />}
            subtitle="All vehicles and equipment"
          />
        </div>
      </div>
    </div>
  );
}
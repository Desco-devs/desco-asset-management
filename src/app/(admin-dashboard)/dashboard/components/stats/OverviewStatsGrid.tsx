"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useOverviewStats, 
  useSelectedTimeRange,
  useDashboardStore
} from "@/stores/dashboard-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  FolderOpen, 
  Truck, 
  Wrench, 
  ClipboardList,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    <Card className={cn("transition-all duration-200 hover:shadow-md touch-manipulation", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 sm:pb-2">
        <CardTitle className="text-sm sm:text-base font-medium text-muted-foreground leading-tight">
          {title}
        </CardTitle>
        <div className="text-muted-foreground flex-shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
            {React.cloneElement(icon as React.ReactElement, { 
              className: "h-4 w-4 sm:h-5 sm:w-5" 
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl sm:text-3xl font-bold mb-2 leading-tight">{value}</div>
        {subtitle && (
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 leading-relaxed">
            {subtitle}
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-2">
            {trend.isPositive ? (
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
            )}
            <Badge 
              variant={trend.isPositive ? "default" : "destructive"}
              className="text-xs font-medium"
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
  
  // Mobile collapsible state
  const [businessExpanded, setBusinessExpanded] = useState(true);
  const [assetsExpanded, setAssetsExpanded] = useState(false);

  if (!overviewStats) {
    return (
      <div className="space-y-4">
        {/* Loading state with collapsible structure */}
        <div className="animate-pulse">
          <div className="h-12 bg-muted rounded-lg mb-4"></div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
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

  // Calculate key summary stats for collapsed view
  const totalAssets = vehicles.total + equipment.total;
  const operationalRate = totalAssets > 0 
    ? Math.round(((vehicles.operational + equipment.operational) / totalAssets) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Mobile-friendly time range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 px-1 sm:px-0">
        <span className="text-sm font-medium text-muted-foreground text-left">
          Time Range:
        </span>
        <div className="flex gap-2 justify-start">
          {(['week', 'month', 'year'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setSelectedTimeRange(range)}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation min-h-[44px] ${
                selectedTimeRange === range
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 active:bg-muted/90'
              }`}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Summary Cards for Mobile */}
      <div className="block lg:hidden">
        <div className="grid gap-3 grid-cols-2">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Operations</span>
              </div>
              <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
                {locations + clients + projects}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Active operations
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Assets</span>
              </div>
              <div className="text-lg font-bold text-emerald-900 dark:text-emerald-100">
                {operationalRate}%
              </div>
              <div className="text-xs text-emerald-600 dark:text-emerald-400">
                Operational rate
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Operations Overview Section */}
      <Card>
        <CardHeader 
          className="pb-3 cursor-pointer transition-colors hover:bg-muted/50 lg:cursor-default lg:hover:bg-transparent"
          onClick={() => setBusinessExpanded(!businessExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
              <CardTitle className="text-base font-semibold truncate">
                Operations Overview
              </CardTitle>
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {locations + clients + projects + maintenanceReports.total}
              </Badge>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden h-8 w-8 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setBusinessExpanded(!businessExpanded);
              }}
            >
              {businessExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        
        {(businessExpanded || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <CardContent className="pt-0">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Site Locations"
                value={locations}
                icon={<Building2 className="h-4 w-4" />}
              />
              <MetricCard
                title="Energy Clients"
                value={clients}
                icon={<Users className="h-4 w-4" />}
                trend={{
                  value: growth.newClientsThisWeek,
                  isPositive: growth.newClientsThisWeek > 0,
                  label: "new this week"
                }}
              />
              <MetricCard
                title="Active Projects"
                value={projects}
                icon={<FolderOpen className="h-4 w-4" />}
                trend={{
                  value: growth.newProjectsThisWeek,
                  isPositive: growth.newProjectsThisWeek > 0,
                  label: "new this week"
                }}
              />
              <MetricCard
                title="Service Reports"
                value={maintenanceReports.total}
                icon={<ClipboardList className="h-4 w-4" />}
                subtitle={`${maintenanceReports.pending} pending, ${maintenanceReports.inProgress} in progress`}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Energy Assets Section */}
      <Card>
        <CardHeader 
          className="pb-3 cursor-pointer transition-colors hover:bg-muted/50 lg:cursor-default lg:hover:bg-transparent"
          onClick={() => setAssetsExpanded(!assetsExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Truck className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <CardTitle className="text-base font-semibold truncate">
                Energy Assets
              </CardTitle>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {totalAssets} total
                </Badge>
                <Badge 
                  variant={operationalRate >= 80 ? "default" : operationalRate >= 60 ? "secondary" : "destructive"} 
                  className="text-xs hidden sm:inline-flex"
                >
                  {operationalRate}% operational
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="lg:hidden h-8 w-8 p-0 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setAssetsExpanded(!assetsExpanded);
              }}
            >
              {assetsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
          {/* Mobile operational rate badge */}
          <div className="sm:hidden mt-2">
            <Badge 
              variant={operationalRate >= 80 ? "default" : operationalRate >= 60 ? "secondary" : "destructive"} 
              className="text-xs"
            >
              {operationalRate}% operational
            </Badge>
          </div>
        </CardHeader>
        
        {(assetsExpanded || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <CardContent className="pt-0">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Service Vehicles"
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
                title="Field Equipment"
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
                title="Asset Availability"
                value={`${operationalRate}%`}
                icon={<TrendingUp className="h-4 w-4" />}
                subtitle="Combined operational percentage"
              />
              <MetricCard
                title="Total Assets"
                value={totalAssets}
                icon={<Building2 className="h-4 w-4" />}
                subtitle="All vehicles and equipment"
              />
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
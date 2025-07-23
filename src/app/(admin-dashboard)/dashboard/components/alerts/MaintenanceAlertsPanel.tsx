"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  useMaintenanceAlerts, 
  useAlertsExpanded,
  useDashboardStore,
  useCriticalAlertsCount
} from "@/stores/dashboard-store";
import { 
  AlertTriangle, 
  Wrench, 
  Truck, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig = {
  critical: {
    color: "destructive",
    icon: AlertCircle,
    bgColor: "bg-red-50 dark:bg-red-950/20",
    borderColor: "border-red-200 dark:border-red-800",
  },
  high: {
    color: "destructive",
    icon: AlertTriangle,
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  medium: {
    color: "secondary",
    icon: Clock,
    bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
  },
  low: {
    color: "outline",
    icon: Clock,
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
    borderColor: "border-gray-200 dark:border-gray-800",
  },
} as const;

interface AlertItemProps {
  alert: {
    id: string;
    type: 'equipment' | 'vehicle';
    name: string;
    status: string;
    lastMaintenance?: string;
    nextMaintenance?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
  };
}

function AlertItem({ alert }: AlertItemProps) {
  const config = priorityConfig[alert.priority];
  const Icon = config.icon;
  const AssetIcon = alert.type === 'equipment' ? Wrench : Truck;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div 
      className={cn(
        "p-3 rounded-lg border transition-colors",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="flex items-center gap-1">
            <Icon className={cn(
              "h-4 w-4",
              alert.priority === 'critical' ? "text-red-600" :
              alert.priority === 'high' ? "text-orange-600" :
              alert.priority === 'medium' ? "text-yellow-600" :
              "text-gray-600"
            )} />
            <AssetIcon className="h-3 w-3 text-muted-foreground" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-sm truncate">{alert.name}</p>
              <Badge variant={config.color as any} className="text-xs">
                {alert.priority}
              </Badge>
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              {alert.message}
            </p>
            
            {(alert.lastMaintenance || alert.nextMaintenance) && (
              <div className="text-xs text-muted-foreground space-y-1">
                {alert.lastMaintenance && (
                  <div>Last: {formatDate(alert.lastMaintenance)}</div>
                )}
                {alert.nextMaintenance && (
                  <div>Next: {formatDate(alert.nextMaintenance)}</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MaintenanceAlertsPanel() {
  const alerts = useMaintenanceAlerts();
  const alertsExpanded = useAlertsExpanded();
  const toggleAlertsExpanded = useDashboardStore(state => state.toggleAlertsExpanded);
  const criticalAlertsCount = useCriticalAlertsCount();

  // Sort alerts by priority (critical first)
  const sortedAlerts = React.useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...alerts].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [alerts]);

  // Show limited alerts when collapsed
  const displayAlerts = alertsExpanded ? sortedAlerts : sortedAlerts.slice(0, 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-medium">
              Maintenance Alerts
            </CardTitle>
            {criticalAlertsCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalAlertsCount} critical
              </Badge>
            )}
          </div>
          {alerts.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAlertsExpanded}
              className="h-8 px-2"
            >
              {alertsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No maintenance alerts</p>
            <p className="text-xs">All assets are up to date</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
            
            {!alertsExpanded && sortedAlerts.length > 3 && (
              <div className="text-center pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleAlertsExpanded}
                  className="text-xs text-muted-foreground"
                >
                  +{sortedAlerts.length - 3} more alerts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
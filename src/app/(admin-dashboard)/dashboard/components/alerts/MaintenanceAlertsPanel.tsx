"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  useAlertsExpanded,
  useDashboardUIStore
} from "@/stores/dashboardUIStore";
import { useDashboardData } from "@/hooks/useDashboardData";
import { 
  AlertTriangle, 
  Wrench, 
  Truck, 
  Clock, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Bell,
  Loader2
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
    alertType?: 'active_maintenance' | 'non_operational' | 'overdue' | 'insurance_expiry';
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
        "p-3 sm:p-4 rounded-lg border transition-colors touch-manipulation active:scale-[0.98]",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1">
            <Icon className={cn(
              "h-4 w-4 sm:h-5 sm:w-5",
              alert.priority === 'critical' ? "text-red-600" :
              alert.priority === 'high' ? "text-orange-600" :
              alert.priority === 'medium' ? "text-yellow-600" :
              "text-gray-600"
            )} />
            <AssetIcon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="font-medium text-sm sm:text-base leading-tight">{alert.name}</p>
            <Badge variant={config.color as "destructive" | "secondary" | "outline"} className="text-xs flex-shrink-0">
              {alert.priority}
            </Badge>
          </div>
          
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 leading-relaxed">
            {alert.message}
          </p>
          
          {(alert.lastMaintenance || alert.nextMaintenance) && (
            <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
              {alert.lastMaintenance && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Last:</span>
                  <span>{formatDate(alert.lastMaintenance)}</span>
                </div>
              )}
              {alert.nextMaintenance && (
                <div className="flex items-center gap-1">
                  <span className="font-medium">Next:</span>
                  <span>{formatDate(alert.nextMaintenance)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Skeleton loader component
function AlertSkeleton() {
  return (
    <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="flex items-center gap-1">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MaintenanceAlertsPanelProps {
  alerts?: Array<{
    id: string;
    type: 'equipment' | 'vehicle';
    name: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    alertType?: 'active_maintenance' | 'non_operational' | 'overdue' | 'insurance_expiry';
  }>;
}

export function MaintenanceAlertsPanel() {
  const alertsExpanded = useAlertsExpanded();
  const setAlertsExpanded = useDashboardUIStore(state => state.setAlertsExpanded);
  const selectedTimeRange = 'month'; // Default to month for now
  const { data } = useDashboardData(selectedTimeRange);
  const alerts = data?.maintenanceAlerts || [];
  const criticalAlertsCount = alerts.filter(alert => alert.priority === 'critical').length;
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const itemsPerPage = 10;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Icon mapping for tabs
  const getTabIcon = (tabId: string) => {
    const iconMap = {
      'all': Bell,
      'active_maintenance': Wrench,
      'non_operational': AlertTriangle,
      'overdue': Clock,
      'insurance_expiry': AlertCircle
    };
    return iconMap[tabId as keyof typeof iconMap] || Bell;
  };

  // Tab configuration
  const tabConfig = React.useMemo(() => [
    { 
      id: 'all', 
      label: 'All Alerts', 
      filter: () => true
    },
    { 
      id: 'active_maintenance', 
      label: 'Active Reports', 
      filter: (alert: { alertType?: string }) => alert.alertType === 'active_maintenance'
    },
    { 
      id: 'non_operational', 
      label: 'Non-Operational', 
      filter: (alert: { alertType?: string }) => alert.alertType === 'non_operational'
    },
    { 
      id: 'overdue', 
      label: 'Overdue', 
      filter: (alert: { alertType?: string }) => alert.alertType === 'overdue'
    },
    { 
      id: 'insurance_expiry', 
      label: 'Insurance', 
      filter: (alert: { alertType?: string }) => alert.alertType === 'insurance_expiry'
    }
  ], []);

  // Filter alerts by active tab
  const filteredAlerts = React.useMemo(() => {
    const activeConfig = tabConfig.find(tab => tab.id === activeTab);
    if (!activeConfig) return alerts;
    return alerts.filter(activeConfig.filter);
  }, [alerts, activeTab, tabConfig]);

  // Sort filtered alerts by priority (critical first)
  const sortedAlerts = React.useMemo(() => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...filteredAlerts].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [filteredAlerts]);

  // Calculate pagination
  const totalPages = Math.ceil(sortedAlerts.length / itemsPerPage);
  const hasMoreAlerts = currentPage < totalPages;
  const displayAlerts = sortedAlerts.slice(0, currentPage * itemsPerPage);
  
  // Initial display logic for collapsed state
  const mobileDisplayLimit = 2;
  const desktopDisplayLimit = 3;
  const initialDisplayLimit = typeof window !== 'undefined' && window.innerWidth < 768 ? mobileDisplayLimit : desktopDisplayLimit;
  const collapsedDisplayAlerts = sortedAlerts.slice(0, initialDisplayLimit);
  
  // Final display alerts based on expanded state
  const finalDisplayAlerts = alertsExpanded ? displayAlerts : collapsedDisplayAlerts;
  
  // Load more function
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreAlerts) return;
    
    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setCurrentPage(prev => prev + 1);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreAlerts]);
  
  
  // Reset pagination when alerts change, component collapses, or tab changes
  useEffect(() => {
    if (!alertsExpanded) {
      setCurrentPage(1);
      setIsLoadingMore(false);
    }
  }, [alertsExpanded]);
  
  // Reset pagination when tab changes
  useEffect(() => {
    setCurrentPage(1);
    setIsLoadingMore(false);
  }, [activeTab]);
  
  // Optional: Auto-scroll to new content when loading more
  useEffect(() => {
    if (!isLoadingMore && currentPage > 1 && scrollContainerRef.current) {
      const newItemsStart = (currentPage - 1) * itemsPerPage;
      const alertElements = scrollContainerRef.current.querySelectorAll('[data-alert-index]');
      const targetElement = alertElements[newItemsStart - 1]; // Last item from previous page
      
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [isLoadingMore, currentPage]);

  return (
    <Card>
      <CardHeader 
        className="pb-3 cursor-pointer transition-colors hover:bg-muted/50 lg:cursor-default lg:hover:bg-transparent"
        onClick={() => alerts.length > initialDisplayLimit && setAlertsExpanded(!alertsExpanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Bell className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <CardTitle className="text-base font-semibold truncate">
              Service Alerts
            </CardTitle>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Badge variant="secondary" className="text-xs">
                {alerts.length}
              </Badge>
              {criticalAlertsCount > 0 && (
                <Badge variant="destructive" className="text-xs animate-pulse hidden sm:inline-flex">
                  {criticalAlertsCount} critical
                </Badge>
              )}
            </div>
          </div>
          {alerts.length > initialDisplayLimit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setAlertsExpanded(!alertsExpanded);
              }}
              className="h-8 w-8 p-0 touch-manipulation flex-shrink-0"
            >
              {alertsExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
        {/* Mobile critical alerts badge */}
        {criticalAlertsCount > 0 && (
          <div className="sm:hidden mt-2">
            <Badge variant="destructive" className="text-xs animate-pulse">
              {criticalAlertsCount} critical alerts
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="pt-0">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No service alerts</p>
            <p className="text-xs">All assets are operational</p>
          </div>
        ) : (
          <Tabs value={alertsExpanded ? activeTab : 'all'} onValueChange={alertsExpanded ? setActiveTab : undefined} className="w-full">
            {/* Show tabs only when expanded */}
            {alertsExpanded && (
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4">
                {tabConfig.map((tab) => {
                  const Icon = getTabIcon(tab.id);
                  const count = tab.id === 'all' ? alerts.length : alerts.filter(tab.filter).length;
                  
                  return (
                    <TabsTrigger key={tab.id} value={tab.id} className="text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                      <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                      <Badge variant="secondary" className="text-xs ml-1 sm:ml-0">
                        {count}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            )}
            
            <div className="space-y-3" ref={scrollContainerRef}>
              {finalDisplayAlerts.map((alert, index) => (
                <div key={alert.id} data-alert-index={index}>
                  <AlertItem alert={alert} />
                </div>
              ))}
              
              {/* Loading skeletons */}
              {isLoadingMore && (
                <>
                  {Array.from({ length: 3 }, (_, i) => (
                    <AlertSkeleton key={`skeleton-${i}`} />
                  ))}
                </>
              )}
              
              {/* Show more button for collapsed state */}
              {!alertsExpanded && sortedAlerts.length > initialDisplayLimit && (
                <div className="text-center pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAlertsExpanded(!alertsExpanded)}
                    className="text-xs text-muted-foreground hover:text-foreground touch-manipulation min-h-[44px] px-4"
                  >
                    <ChevronDown className="h-4 w-4 mr-1" />
                    {sortedAlerts.length - initialDisplayLimit} more alerts
                  </Button>
                </div>
              )}
              
              {/* Load more button for expanded state */}
              {alertsExpanded && hasMoreAlerts && (
                <div className="text-center pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="text-sm touch-manipulation min-h-[44px] px-6"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-2" />
                        Load More ({sortedAlerts.length - displayAlerts.length} remaining)
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {/* End of results indicator */}
              {alertsExpanded && !hasMoreAlerts && displayAlerts.length > initialDisplayLimit && (
                <div className="text-center pt-4 border-t">
                  <p className="text-xs text-muted-foreground">
                    All {sortedAlerts.length} alerts loaded
                  </p>
                </div>
              )}
            </div>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
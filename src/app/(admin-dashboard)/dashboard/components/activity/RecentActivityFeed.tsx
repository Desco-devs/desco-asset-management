"use client";

import React, { useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/hooks/useDashboardData";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Wrench, 
  Truck, 
  Building2, 
  Users, 
  FolderOpen,
  ClipboardList,
  Clock,
  Activity,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle,
  AlertTriangle,
  Settings,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const activityConfig = {
  equipment: {
    icon: Wrench,
    color: "bg-blue-500",
  },
  vehicle: {
    icon: Truck,
    color: "bg-green-500",
  },
  project: {
    icon: FolderOpen,
    color: "bg-purple-500",
  },
  client: {
    icon: Users,
    color: "bg-orange-500",
  },
  location: {
    icon: Building2,
    color: "bg-indigo-500",
  },
  maintenance: {
    icon: ClipboardList,
    color: "bg-red-500",
  },
} as const;

const actionConfig = {
  created: {
    icon: Plus,
    label: 'Created',
    color: 'text-green-600',
  },
  updated: {
    icon: Edit,
    label: 'Updated',
    color: 'text-blue-600',
  },
  deleted: {
    icon: Trash2,
    label: 'Deleted',
    color: 'text-red-600',
  },
  reported: {
    icon: ClipboardList,
    label: 'Reported',
    color: 'text-orange-600',
  },
  started: {
    icon: Play,
    label: 'Started',
    color: 'text-blue-600',
  },
  completed: {
    icon: CheckCircle,
    label: 'Completed',
    color: 'text-green-600',
  },
  repaired: {
    icon: Settings,
    label: 'Repaired',
    color: 'text-green-600',
  },
  breakdown: {
    icon: AlertTriangle,
    label: 'Breakdown',
    color: 'text-red-600',
  },
  cancelled: {
    icon: X,
    label: 'Cancelled',
    color: 'text-gray-600',
  },
} as const;

interface ActivityItemProps {
  activity: {
    id: string;
    type: 'equipment' | 'vehicle' | 'project' | 'client' | 'location' | 'maintenance';
    action: 'created' | 'updated' | 'deleted' | 'reported' | 'started' | 'completed' | 'repaired' | 'breakdown' | 'cancelled';
    description: string;
    timestamp: string;
    user: string;
  };
}

function ActivityItem({ activity }: ActivityItemProps) {
  const typeConfig = activityConfig[activity.type];
  const actionConfigItem = actionConfig[activity.action as keyof typeof actionConfig] || {
    icon: Edit,
    label: 'Unknown',
    color: 'text-gray-600'
  };
  
  const TypeIcon = typeConfig?.icon || Activity;
  const ActionIcon = actionConfigItem.icon;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg hover:bg-muted/50 transition-colors touch-manipulation active:scale-[0.98]">
      {/* Activity Icon */}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full text-white flex-shrink-0 shadow-sm",
        typeConfig?.color || "bg-gray-500"
      )}>
        <TypeIcon className="h-4 w-4 sm:h-5 sm:w-5" />
      </div>
      
      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <ActionIcon className={cn("h-3 w-3 sm:h-4 sm:w-4", actionConfigItem?.color || 'text-gray-600')} />
          <Badge variant="outline" className="text-xs">
            {actionConfigItem?.label || 'Unknown'}
          </Badge>
        </div>
        
        <p className="text-sm sm:text-base text-foreground mb-1 leading-relaxed">
          {activity.description}
        </p>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
          <span className="font-medium">by {activity.user}</span>
          <span className="hidden sm:inline">•</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(activity.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton loader component for activities
function ActivitySkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg">
      <Skeleton className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-3 rounded" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

interface RecentActivityFeedProps {
  activities?: Array<{
    id: string;
    type: string;
    action: string;
    description: string;
    timestamp: string;
    user: string;
    status?: string;
    priority?: string;
  }>;
}

export function RecentActivityFeed() {
  const selectedTimeRange = 'month'; // Default to month for now
  const { data } = useDashboardData(selectedTimeRange);
  const activities = data?.recentActivity || [];
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const itemsPerPage = 10;
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Calculate pagination
  const totalPages = Math.ceil(activities.length / itemsPerPage);
  const hasMoreActivities = currentPage < totalPages;
  const displayActivities = activities.slice(0, currentPage * itemsPerPage);
  
  // Initial display logic for collapsed state
  const mobileDisplayLimit = 3;
  const desktopDisplayLimit = 5;
  const initialDisplayLimit = typeof window !== 'undefined' && window.innerWidth < 768 ? mobileDisplayLimit : desktopDisplayLimit;
  const collapsedDisplayActivities = activities.slice(0, initialDisplayLimit);
  
  // Final display activities based on expanded state
  const finalDisplayActivities = isExpanded ? displayActivities : collapsedDisplayActivities;

  // Load more function
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMoreActivities) return;
    
    setIsLoadingMore(true);
    
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    setCurrentPage(prev => prev + 1);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMoreActivities]);

  // Reset pagination when component collapses
  React.useEffect(() => {
    if (!isExpanded) {
      setCurrentPage(1);
      setIsLoadingMore(false);
    }
  }, [isExpanded]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader 
        className="pb-3 cursor-pointer transition-colors hover:bg-muted/50 lg:cursor-default lg:hover:bg-transparent flex-shrink-0"
        onClick={() => activities.length > initialDisplayLimit && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Activity className="h-5 w-5 text-teal-500 flex-shrink-0" />
            <CardTitle className="text-base font-semibold truncate">
              Recent Activity
            </CardTitle>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {activities.length}
            </Badge>
          </div>
          {activities.length > initialDisplayLimit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="h-8 w-8 p-0 touch-manipulation flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col justify-center">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Activity will appear here as changes are made</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 space-y-1 overflow-hidden" ref={scrollContainerRef}>
              {finalDisplayActivities.map((activity, index) => (
                <div key={activity.id} data-activity-index={index}>
                  <ActivityItem activity={activity} />
                </div>
              ))}
              
              {/* Loading skeletons */}
              {isLoadingMore && (
                <>
                  {Array.from({ length: 3 }, (_, i) => (
                    <ActivitySkeleton key={`skeleton-${i}`} />
                  ))}
                </>
              )}
            </div>
            
            {/* Show more button for collapsed state */}
            {!isExpanded && activities.length > initialDisplayLimit && (
              <div className="text-center pt-3 border-t mt-3 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(true)}
                  className="text-xs text-muted-foreground hover:text-foreground touch-manipulation min-h-[44px] px-4"
                >
                  <ChevronDown className="h-4 w-4 mr-1" />
                  {activities.length - initialDisplayLimit} more activities
                </Button>
              </div>
            )}
            
            {/* Load more button for expanded state */}
            {isExpanded && hasMoreActivities && (
              <div className="text-center pt-4 border-t mt-3 flex-shrink-0">
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
                      Load More ({activities.length - displayActivities.length} remaining)
                    </>
                  )}
                </Button>
              </div>
            )}
            
            {/* End of results indicator */}
            {isExpanded && !hasMoreActivities && displayActivities.length > initialDisplayLimit && (
              <div className="text-center pt-4 border-t mt-3 flex-shrink-0">
                <p className="text-xs text-muted-foreground">
                  All {activities.length} activities loaded
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
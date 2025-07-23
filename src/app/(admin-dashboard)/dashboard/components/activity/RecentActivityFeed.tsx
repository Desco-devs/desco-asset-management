"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRecentActivity } from "@/stores/dashboard-store";
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
  Clock
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
} as const;

interface ActivityItemProps {
  activity: {
    id: string;
    type: 'equipment' | 'vehicle' | 'project' | 'client' | 'location' | 'maintenance';
    action: 'created' | 'updated' | 'deleted' | 'reported';
    description: string;
    timestamp: string;
    user: string;
  };
}

function ActivityItem({ activity }: ActivityItemProps) {
  const typeConfig = activityConfig[activity.type];
  const actionConfigItem = actionConfig[activity.action];
  
  const TypeIcon = typeConfig.icon;
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
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Activity Icon */}
      <div className={cn(
        "flex items-center justify-center w-8 h-8 rounded-full text-white flex-shrink-0",
        typeConfig.color
      )}>
        <TypeIcon className="h-4 w-4" />
      </div>
      
      {/* Activity Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <ActionIcon className={cn("h-3 w-3", actionConfigItem.color)} />
          <Badge variant="outline" className="text-xs">
            {actionConfigItem.label}
          </Badge>
        </div>
        
        <p className="text-sm text-foreground mb-1">
          {activity.description}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>by {activity.user}</span>
          <span>•</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(activity.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RecentActivityFeed() {
  const activities = useRecentActivity();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
      </CardHeader>
      
      <CardContent className="p-0">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground px-6">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs">Activity will appear here as changes are made</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
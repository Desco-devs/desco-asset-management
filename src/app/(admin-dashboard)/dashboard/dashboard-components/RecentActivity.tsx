"use client";
import { useState, useEffect } from "react";
import { Calendar, Plus, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase";
import { toast } from "sonner";
import type { ActivityItem, RecentActivityProps } from "@/types/dashboard";

export function RecentActivity({ initialData }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialData);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to equipment changes
    const equipmentChannel = supabase
      .channel('equipment-recent-activity-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'equipment' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'equipment',
          action: 'created',
          title: `${payload.new.brand} ${payload.new.model}`,
          description: `New ${payload.new.type} equipment added`,
          timestamp: payload.new.created_at,
          status: payload.new.status
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 10));
        toast.success('New equipment activity');
      })
      .subscribe();

    // Subscribe to vehicle changes
    const vehicleChannel = supabase
      .channel('vehicle-recent-activity-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vehicles' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'vehicle',
          action: 'created',
          title: `${payload.new.brand} ${payload.new.model}`,
          description: `Vehicle ${payload.new.plate_number} registered`,
          timestamp: payload.new.created_at,
          status: payload.new.status
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 10));
        toast.success('New vehicle activity');
      })
      .subscribe();

    // Subscribe to project changes
    const projectChannel = supabase
      .channel('project-recent-activity-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'project',
          action: 'created',
          title: payload.new.name,
          description: 'New project created',
          timestamp: payload.new.created_at
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 10));
        toast.success('New project activity');
      })
      .subscribe();

    // Subscribe to client changes
    const clientChannel = supabase
      .channel('client-recent-activity-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'client',
          action: 'created',
          title: payload.new.name,
          description: 'New client registered',
          timestamp: payload.new.created_at
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 10));
        toast.success('New client activity');
      })
      .subscribe();

    // Subscribe to maintenance changes
    const maintenanceChannel = supabase
      .channel('maintenance-recent-activity-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_equipment_reports' }, (payload) => {
        const newActivity: ActivityItem = {
          id: payload.new.id,
          type: 'maintenance',
          action: 'reported',
          title: 'Maintenance Report',
          description: payload.new.issue_description.substring(0, 50) + '...',
          timestamp: payload.new.date_reported,
          status: payload.new.status,
          priority: payload.new.priority
        };
        setActivities(prev => [newActivity, ...prev].slice(0, 10));
        toast.error('New maintenance report');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(equipmentChannel);
      supabase.removeChannel(vehicleChannel);
      supabase.removeChannel(projectChannel);
      supabase.removeChannel(clientChannel);
      supabase.removeChannel(maintenanceChannel);
    };
  }, [supabase]);

  const getActivityIcon = (action: string) => {
    if (action === 'reported') return <AlertCircle className="h-4 w-4" />;
    if (action === 'created') return <Plus className="h-4 w-4" />;
    return <Settings className="h-4 w-4" />;
  };

  const getActivityColor = (type: string, status?: string, priority?: string) => {
    if (type === 'maintenance') {
      if (priority === 'HIGH') return 'text-red-600 bg-red-50';
      if (priority === 'MEDIUM') return 'text-yellow-600 bg-yellow-50';
      return 'text-blue-600 bg-blue-50';
    }
    if (status === 'NON_OPERATIONAL') return 'text-red-600 bg-red-50';
    return 'text-green-600 bg-green-50';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return time.toLocaleDateString();
  };


  return (
    <Card className="h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px] px-6">
          <div className="space-y-4 py-4">
            {activities.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No recent activity found
              </div>
            ) : (
              activities.map((activity, index) => (
                <div key={`${activity.type}-${activity.id}-${activity.timestamp}-${index}`} className="flex items-start space-x-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getActivityColor(activity.type, activity.status, activity.priority)}`}>
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {activity.title}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    <div className="flex gap-1">
                      {activity.status && (
                        <Badge variant="outline" className="text-xs">
                          {activity.status.replace('_', ' ')}
                        </Badge>
                      )}
                      {activity.priority && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            activity.priority === 'HIGH' ? 'border-red-200 text-red-700' :
                            activity.priority === 'MEDIUM' ? 'border-yellow-200 text-yellow-700' :
                            'border-blue-200 text-blue-700'
                          }`}
                        >
                          {activity.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
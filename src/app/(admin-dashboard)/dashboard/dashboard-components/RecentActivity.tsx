"use client";
import { useState, useEffect } from "react";
import { Calendar, Plus, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createClient } from "@/lib/supabase";
import type { ActivityItem, RecentActivityProps } from "@/types/dashboard";

export function RecentActivity({ initialData }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialData);
  const [isClient, setIsClient] = useState(false);
  const supabase = createClient();

  // Ensure client-side rendering for time-sensitive content
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Set up realtime subscriptions after ensuring auth
    const setupRealtimeSubscriptions = async () => {
      // Get current session to ensure we're authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.access_token) {
        console.warn('No active session or access token for realtime subscriptions');
        return;
      }

      // Explicitly set the access token for realtime
      await supabase.realtime.setAuth(session.access_token);

      // Subscribe to equipment changes
      const equipmentChannel = supabase
        .channel('equipment-changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'equipment' 
        }, (payload) => {
          console.log("🔥 Equipment payload:", payload);
          
          if (payload.new && Object.keys(payload.new).length > 0) {
            const newEquipment = payload.new;
            
            const newActivity: ActivityItem = {
              id: newEquipment.id,
              type: 'equipment',
              action: 'created',
              title: `${newEquipment.brand} ${newEquipment.model}`,
              description: `New ${newEquipment.type} added`,
              timestamp: new Date().toISOString(), // Use current local time for realtime events
              status: newEquipment.status || 'OPERATIONAL'
            };
            
            setActivities(prev => [newActivity, ...prev].slice(0, 10));
          }
        })
        .subscribe();

      // Subscribe to vehicle changes
      const vehicleChannel = supabase
        .channel('vehicle-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vehicles' }, (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
          const newVehicle = payload.new;
          
          // Generate a meaningful title
          let title = "New Vehicle";
          if (newVehicle.brand && newVehicle.model) {
            title = `${newVehicle.brand} ${newVehicle.model}`;
          } else if (newVehicle.brand) {
            title = newVehicle.brand;
          } else if (newVehicle.model) {
            title = newVehicle.model;
          } else if (newVehicle.plate_number) {
            title = newVehicle.plate_number;
          }
          
          const newActivity: ActivityItem = {
            id: newVehicle.id,
            type: 'vehicle',
            action: 'created',
            title: title,
            description: `Vehicle ${newVehicle.plate_number || 'Unknown'} registered`,
            timestamp: new Date().toISOString(),
            status: newVehicle.status || 'OPERATIONAL'
          };
          
          setActivities(prev => [newActivity, ...prev].slice(0, 10));
        }
      })
      .subscribe();

      // Subscribe to project changes
      const projectChannel = supabase
        .channel('project-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'projects' }, (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
          const newProject = payload.new;
          
          const newActivity: ActivityItem = {
            id: newProject.id,
            type: 'project',
            action: 'created',
            title: newProject.name || 'New Project',
            description: 'New project created',
            timestamp: new Date().toISOString()
          };
          
          setActivities(prev => [newActivity, ...prev].slice(0, 10));
        }
      })
      .subscribe();

      // Subscribe to client changes
      const clientChannel = supabase
        .channel('client-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'clients' }, (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
          const newClient = payload.new;
          
          const newActivity: ActivityItem = {
            id: newClient.id,
            type: 'client',
            action: 'created',
            title: newClient.name || 'New Client',
            description: 'New client registered',
            timestamp: new Date().toISOString()
          };
          
          setActivities(prev => [newActivity, ...prev].slice(0, 10));
        }
      })
      .subscribe();

      // Subscribe to maintenance changes
      const maintenanceChannel = supabase
        .channel('maintenance-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'maintenance_equipment_reports' }, (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
          const newMaintenance = payload.new;
          const issueDescription = newMaintenance.issue_description || "No description";
          
          const newActivity: ActivityItem = {
            id: newMaintenance.id,
            type: 'maintenance',
            action: 'reported',
            title: 'Maintenance Report',
            description: issueDescription.length > 50 ? issueDescription.substring(0, 50) + '...' : issueDescription,
            timestamp: new Date().toISOString(),
            status: newMaintenance.status || 'REPORTED',
            priority: newMaintenance.priority || 'MEDIUM'
          };
          
          setActivities(prev => [newActivity, ...prev].slice(0, 10));
        }
      })
      .subscribe();

      // Subscribe to location changes
      const locationChannel = supabase
        .channel('location-changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'locations' }, (payload) => {
          if (payload.new && Object.keys(payload.new).length > 0) {
          const newLocation = payload.new;
          
          const newActivity: ActivityItem = {
            id: newLocation.id,
            type: 'location',
            action: 'created',
            title: newLocation.address || 'New Location',
            description: 'New location added',
            timestamp: new Date().toISOString()
          };
          
          setActivities(prev => [newActivity, ...prev].slice(0, 10));
        }
      })
      .subscribe();

      return () => {
        supabase.removeChannel(equipmentChannel);
        supabase.removeChannel(vehicleChannel);
        supabase.removeChannel(projectChannel);
        supabase.removeChannel(clientChannel);
        supabase.removeChannel(maintenanceChannel);
        supabase.removeChannel(locationChannel);
      };
    };

    // Call the setup function and store cleanup
    const cleanupPromise = setupRealtimeSubscriptions();
    
    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
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
    
    // Check for invalid date
    if (isNaN(time.getTime())) {
      return 'Just now';
    }
    
    const diffInMs = now.getTime() - time.getTime();
    
    // If timestamp is in the future or within 30 seconds, show "Just now"
    if (diffInMs < 30000 || diffInMs < 0) return 'Just now';
    
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
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
                        {isClient ? formatTimeAgo(activity.timestamp) : 'Just now'}
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
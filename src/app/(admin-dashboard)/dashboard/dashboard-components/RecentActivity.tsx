"use client";
import * as React from "react";
import { Calendar, Plus, Settings, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityItem {
  id: string;
  type: 'equipment' | 'vehicle' | 'project' | 'client' | 'maintenance';
  action: 'created' | 'updated' | 'reported';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  priority?: string;
}

export function RecentActivity() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activities, setActivities] = React.useState<ActivityItem[]>([]);

  React.useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        setIsLoading(true);
        
        const [equipmentRes, vehicleRes, projectRes, clientRes, maintenanceRes] = await Promise.all([
          fetch("/api/equipments/getall?limit=3"),
          fetch("/api/vehicles/getall?limit=3"),
          fetch("/api/projects/getall?limit=3"),
          fetch("/api/clients/getall?limit=3"),
          fetch("/api/maintenance-reports?limit=5")
        ]);

        const [equipment, vehicles, projects, clients, maintenance] = await Promise.all([
          equipmentRes.json(),
          vehicleRes.json(),
          projectRes.json(),
          clientRes.json(),
          maintenanceRes.json()
        ]);

        const allActivities: ActivityItem[] = [];

        // Add equipment activities
        equipment?.slice(0, 3).forEach((item: any) => {
          allActivities.push({
            id: item.id,
            type: 'equipment',
            action: 'created',
            title: `${item.brand} ${item.model}`,
            description: `New ${item.type} equipment added`,
            timestamp: item.created_at,
            status: item.status
          });
        });

        // Add vehicle activities
        vehicles?.slice(0, 3).forEach((item: any) => {
          allActivities.push({
            id: item.id,
            type: 'vehicle',
            action: 'created',
            title: `${item.brand} ${item.model}`,
            description: `Vehicle ${item.plate_number} registered`,
            timestamp: item.created_at,
            status: item.status
          });
        });

        // Add project activities
        projects?.slice(0, 2).forEach((item: any) => {
          allActivities.push({
            id: item.id,
            type: 'project',
            action: 'created',
            title: item.name,
            description: 'New project created',
            timestamp: item.created_at
          });
        });

        // Add client activities
        clients?.slice(0, 2).forEach((item: any) => {
          allActivities.push({
            id: item.id,
            type: 'client',
            action: 'created',
            title: item.name,
            description: 'New client registered',
            timestamp: item.created_at
          });
        });

        // Add maintenance activities
        maintenance?.slice(0, 5).forEach((item: any) => {
          allActivities.push({
            id: item.id,
            type: 'maintenance',
            action: 'reported',
            title: 'Maintenance Report',
            description: item.issue_description.substring(0, 50) + '...',
            timestamp: item.date_reported,
            status: item.status,
            priority: item.priority
          });
        });

        // Sort by timestamp and take the most recent 10
        const sortedActivities = allActivities
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 10);

        setActivities(sortedActivities);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch recent activity");
        console.error("Error fetching recent activity:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentActivity();
  }, []);

  const getActivityIcon = (type: string, action: string) => {
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

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-destructive py-8">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

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
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getActivityColor(activity.type, activity.status, activity.priority)}`}>
                    {getActivityIcon(activity.type, activity.action)}
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
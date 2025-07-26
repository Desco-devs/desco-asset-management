"use client";

import { User } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle, Clock } from "lucide-react";

interface ProfileStatsProps {
  user: User;
}

export function ProfileStats({ user }: ProfileStatsProps) {
  // Calculate profile completeness
  const calculateCompleteness = (user: User): number => {
    const fields = [
      user.username,
      user.full_name,
      user.phone,
      user.user_profile,
    ];
    
    const completed = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completed / fields.length) * 100);
  };

  const completeness = calculateCompleteness(user);
  
  // Calculate days since account creation
  const daysSinceCreation = Math.floor(
    (new Date().getTime() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Profile Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Completeness */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Profile Completeness</span>
            <span className="text-muted-foreground">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {completeness === 100 ? (
              <>
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span>Profile complete</span>
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                <span>
                  {completeness < 50 ? 'Complete your profile for better experience' 
                   : completeness < 80 ? 'Almost there! Add more details'
                   : 'Just a few more details needed'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Account Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account Age</span>
            <Badge variant="outline">
              {daysSinceCreation === 0 ? 'New' : 
               daysSinceCreation === 1 ? '1 day' : 
               daysSinceCreation < 30 ? `${daysSinceCreation} days` :
               daysSinceCreation < 365 ? `${Math.floor(daysSinceCreation / 30)} months` :
               `${Math.floor(daysSinceCreation / 365)} years`}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Account Type</span>
            <Badge variant={user.role === 'SUPERADMIN' ? 'default' : user.role === 'ADMIN' ? 'secondary' : 'outline'}>
              {user.role === 'SUPERADMIN' ? 'Super Admin' :
               user.role === 'ADMIN' ? 'Administrator' :
               'Viewer'}
            </Badge>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Profile Tips</h4>
          <div className="space-y-2 text-xs text-muted-foreground">
            {!user.user_profile && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span>Add a profile picture to personalize your account</span>
              </div>
            )}
            {!user.phone && (
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                <span>Add your phone number for better security</span>
              </div>
            )}
            {completeness === 100 && (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-green-500" />
                <span className="text-green-600">Your profile looks great!</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
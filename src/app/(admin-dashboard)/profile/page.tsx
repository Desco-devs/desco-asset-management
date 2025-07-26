"use client";

import { useEffect } from "react";
import { useAuth } from "@/app/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, User, Clock, Shield, Activity } from "lucide-react";
import { ProfileForm } from "./components/ProfileForm";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileStats } from "./components/ProfileStats";
import { useCurrentProfile } from "@/hooks/useProfileQuery";
import { useProfileRealtime } from "@/hooks/useProfileRealtime";
import { useInitializeForm } from "@/stores/profileStore";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading, error } = useCurrentProfile();
  const initializeForm = useInitializeForm();

  // Activate real-time updates for current user
  useProfileRealtime(user?.id);
  
  // Initialize form when profile data is loaded
  useEffect(() => {
    if (profile) {
      initializeForm({
        username: profile.username,
        full_name: profile.full_name,
        phone: profile.phone || '',
        user_profile: profile.user_profile || '',
      });
    }
  }, [profile, initializeForm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="text-lg text-muted-foreground">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load profile: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <Alert>
          <AlertDescription>
            Profile not found. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Page Header */}
      <ProfileHeader user={profile} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your personal details and contact information.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm user={profile} />
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          {/* Profile Stats */}
          <ProfileStats user={profile} />
          
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Role</span>
                <Badge variant={profile.role === 'SUPERADMIN' ? 'default' : profile.role === 'ADMIN' ? 'secondary' : 'outline'}>
                  {profile.role}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant={profile.user_status === 'ACTIVE' ? 'default' : 'destructive'}>
                  {profile.user_status}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Member since</span>
                  <span className="font-medium ml-auto">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last updated</span>
                  <span className="font-medium ml-auto">
                    {new Date(profile.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
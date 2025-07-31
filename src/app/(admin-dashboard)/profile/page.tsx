"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { ProfileForm } from "./components/ProfileForm";
import { useProfile } from "@/hooks/useProfileSimple";

export default function ProfilePage() {
  const { profile, isLoading, error } = useProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">Loading profile...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 max-w-lg">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load profile: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto p-4 max-w-lg">
        <Alert>
          <AlertDescription>
            Profile not found. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-lg">
      {/* Single Clean Card - No header clutter */}
      <Card className="shadow-sm border-0 sm:border">
        <CardContent className="p-4 sm:p-6">
          <ProfileForm user={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
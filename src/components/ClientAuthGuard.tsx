"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientAuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ClientAuthGuard({ children, redirectTo = '/login' }: ClientAuthGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Silent redirect - no UI shown
      router.replace(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading only when actually loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  // Show children only if user is authenticated
  if (user) {
    return <>{children}</>;
  }

  // If no user and not loading, show nothing (redirect will happen)
  return null;
}
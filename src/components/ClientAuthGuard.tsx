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

  // Don't show loading skeleton - let individual routes handle their own loading states
  // This prevents infinite skeleton blocking all admin routes

  // Show children only if user is authenticated OR still loading (let routes handle their own loading)
  if (user || loading) {
    return <>{children}</>;
  }

  // If no user and not loading, show nothing (redirect will happen)
  return null;
}
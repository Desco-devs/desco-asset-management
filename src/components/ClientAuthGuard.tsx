"use client";

import { useAuthGuard } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface ClientAuthGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export default function ClientAuthGuard({ children, redirectTo = '/login' }: ClientAuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuthGuard(redirectTo);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
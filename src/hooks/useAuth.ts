"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  permissions: string[];
}

interface AuthData {
  user: User | null;
  isAuthenticated: boolean;
}

async function fetchAuthStatus(): Promise<AuthData> {
  const response = await fetch('/api/session', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return { user: null, isAuthenticated: false };
  }

  const data = await response.json();
  return {
    user: data.user,
    isAuthenticated: !!data.user,
  };
}

export function useAuth() {
  return useQuery({
    queryKey: ['auth-status'],
    queryFn: fetchAuthStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error (401/403)
      if (error && 'status' in error) {
        const status = (error as any).status;
        if (status === 401 || status === 403) return false;
      }
      return failureCount < 2;
    },
  });
}

export function useAuthGuard(redirectTo: string = '/login') {
  const router = useRouter();
  const { data, isLoading, error } = useAuth();

  useEffect(() => {
    if (!isLoading && (!data?.isAuthenticated || error)) {
      router.push(redirectTo);
    }
  }, [data?.isAuthenticated, isLoading, error, router, redirectTo]);

  return {
    user: data?.user || null,
    isAuthenticated: data?.isAuthenticated || false,
    isLoading,
    error,
  };
}
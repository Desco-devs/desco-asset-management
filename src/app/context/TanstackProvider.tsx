"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ReactNode, useState, useEffect } from "react";
import { setGlobalQueryClient } from "@/lib/realtime-cache";

export default function TanstackProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Create a client instance with default configuration
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Time before data is considered stale (5 minutes)
            staleTime: 1000 * 60 * 5,
            // Time before inactive queries are garbage collected (10 minutes)
            gcTime: 1000 * 60 * 10,
            // Retry failed requests
            retry: (failureCount, error: unknown) => {
              // Don't retry on 4xx errors (client errors)
              if (error && typeof error === 'object' && 'status' in error) {
                const errorWithStatus = error as { status: number };
                if (errorWithStatus.status >= 400 && errorWithStatus.status < 500) {
                  return false;
                }
              }
              // Retry up to 3 times for other errors
              return failureCount < 3;
            },
            // Refetch on window focus in production, but not in development
            refetchOnWindowFocus: process.env.NODE_ENV === "production",
          },
          mutations: {
            // Retry failed mutations once
            retry: 1,
          },
        },
      })
  );

  // Set global query client for real-time cache integration
  useEffect(() => {
    setGlobalQueryClient(queryClient);
    console.log('✅ Global query client set for real-time cache integration');
    
    // Cleanup on unmount
    return () => {
      setGlobalQueryClient(null);
    };
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

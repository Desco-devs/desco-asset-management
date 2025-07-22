"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  error: Error | unknown;
  onRetry?: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

  return (
    <div className="h-full container mx-auto py-[5dvh]">
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to Load Vehicle Data
          </h3>
          <p className="text-gray-500 mb-4">{errorMessage}</p>
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
            {onRetry && (
              <Button
                variant="outline"
                onClick={onRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
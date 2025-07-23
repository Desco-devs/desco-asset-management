"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
}

export default function ErrorState({ error, onRetry }: ErrorStateProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry: reload the page
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-7 w-7 text-destructive" />
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Equipment Management
        </h1>
      </div>

      {/* Error State Card */}
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <AlertTriangle className="h-16 w-16 mx-auto mb-6 text-destructive opacity-60" />
            
            <h3 className="text-xl font-semibold mb-4">
              Failed to Load Equipment Data
            </h3>
            
            <div className="text-muted-foreground mb-6 space-y-2">
              <p>
                We encountered an error while loading your equipment data.
              </p>
              {error && (
                <details className="text-left">
                  <summary className="cursor-pointer text-sm text-destructive hover:text-destructive/80">
                    Technical Details
                  </summary>
                  <p className="mt-2 text-xs bg-muted p-2 rounded font-mono break-all">
                    {error.message}
                  </p>
                </details>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleRetry}
                className="gap-2 w-full"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              
              <div className="text-xs text-muted-foreground">
                If the problem persists, please contact your system administrator.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
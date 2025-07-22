"use client";

import { Toaster, toast } from "sonner";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function SonnerToastProvider() {
  const { theme } = useTheme();

  // Apply custom styling to individual toast types
  useEffect(() => {
    // Override default toast styles based on type
    // const originalToast = toast;
    const originalSuccess = toast.success;
    const originalError = toast.error;
    const originalInfo = toast.info;
    const originalWarning = toast.warning;

    // This is not modifying Sonner's API, just wrapping calls with custom styling
    toast.success = (message, options) => {
      return originalSuccess(message, {
        ...options,
        style: {
          ...options?.style,
          borderLeft: "4px solid var(--chart-2)",
        },
      });
    };

    toast.error = (message, options) => {
      return originalError(message, {
        ...options,
        style: {
          ...options?.style,
          borderLeft: "4px solid var(--destructive)",
        },
      });
    };

    toast.info = (message, options) => {
      return originalInfo(message, {
        ...options,
        style: {
          ...options?.style,
          borderLeft: "4px solid var(--chart-3)",
        },
      });
    };

    toast.warning = (message, options) => {
      return originalWarning(message, {
        ...options,
        style: {
          ...options?.style,
          borderLeft: "4px solid var(--chart-4)",
        },
      });
    };

    // Cleanup
    return () => {
      toast.success = originalSuccess;
      toast.error = originalError;
      toast.info = originalInfo;
      toast.warning = originalWarning;
    };
  }, [theme]);

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "var(--card)",
          color: "var(--card-foreground)",
          border: "1px solid var(--border)",
        },
        className: "rounded-md shadow-lg",
      }}
      richColors
    />
  );
}

import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  showOffline?: boolean;
}

const PresenceIndicator = ({
  isOnline,
  size = "md",
  className,
  showOffline = true,
}: PresenceIndicatorProps) => {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  // Don't show indicator if user is offline and showOffline is false
  if (!isOnline && !showOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-full border-2 border-background",
        sizeClasses[size],
        isOnline ? "bg-green-500" : "bg-gray-400",
        className
      )}
      aria-label={isOnline ? "Online" : "Offline"}
    />
  );
};

export default PresenceIndicator;
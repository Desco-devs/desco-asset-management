import { cn } from "@/lib/utils";

interface PresenceStatusProps {
  isOnline: boolean;
  lastSeen?: Date;
  className?: string;
}

const PresenceStatus = ({
  isOnline,
  lastSeen,
  className,
}: PresenceStatusProps) => {
  const getStatusText = () => {
    if (isOnline) {
      return "Online";
    }

    if (lastSeen) {
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return "Last seen just now";
      if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
      if (diffHours < 24) return `Last seen ${diffHours}h ago`;
      if (diffDays < 7) return `Last seen ${diffDays}d ago`;
      return "Last seen a while ago";
    }

    return "Offline";
  };

  return (
    <span
      className={cn(
        "text-xs",
        isOnline ? "text-green-600" : "text-muted-foreground",
        className
      )}
    >
      {getStatusText()}
    </span>
  );
};

export default PresenceStatus;
"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useChatPresence } from "@/hooks/chat-app/useChatPresence";
import { ChatUser } from "@/types/chat-app";

interface OnlinePresenceProps {
  currentUser?: ChatUser;
  currentRoomId?: string;
  className?: string;
  variant?: "dot" | "badge" | "count" | "status";
  size?: "sm" | "md" | "lg";
  userId?: string; // For checking specific user's online status
  showText?: boolean;
}

const OnlinePresence = ({
  currentUser,
  currentRoomId,
  className,
  variant = "dot",
  size = "md",
  userId,
  showText = true,
}: OnlinePresenceProps) => {
  const { 
    isUserOnline, 
    onlineCount, 
    roomUserCount, 
    usersInCurrentRoom,
    isTracking 
  } = useChatPresence(currentUser, currentRoomId);

  // Size configurations
  const sizeConfig = {
    sm: {
      dot: "w-2 h-2",
      badge: "text-xs px-1.5 py-0.5",
      text: "text-xs"
    },
    md: {
      dot: "w-3 h-3",
      badge: "text-xs px-2 py-1",
      text: "text-sm"
    },
    lg: {
      dot: "w-4 h-4",
      badge: "text-sm px-2.5 py-1",
      text: "text-base"
    }
  };

  const config = sizeConfig[size];

  // Render online status dot
  if (variant === "dot") {
    const isOnline = userId ? isUserOnline(userId) : false;
    return (
      <div
        className={cn(
          "rounded-full border-2 border-background",
          config.dot,
          isOnline ? "bg-green-500" : "bg-gray-400",
          className
        )}
        title={isOnline ? "Online" : "Offline"}
      />
    );
  }

  // Render status text
  if (variant === "status" && userId) {
    const isOnline = isUserOnline(userId);
    return (
      <span
        className={cn(
          config.text,
          isOnline ? "text-green-600" : "text-muted-foreground",
          className
        )}
      >
        {isOnline ? "Online" : "Offline"}
      </span>
    );
  }

  // Render online count badge
  if (variant === "badge" || variant === "count") {
    const count = currentRoomId ? roomUserCount : onlineCount;
    const text = currentRoomId 
      ? `Online (${count})`
      : `${count} online`;

    if (variant === "count") {
      return (
        <span className={cn(config.text, "text-muted-foreground", className)}>
          {showText ? text : count}
        </span>
      );
    }

    return (
      <Badge
        variant="secondary"
        className={cn(
          config.badge,
          "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200",
          className
        )}
      >
        <div className={cn("rounded-full bg-green-500 mr-1", size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2")} />
        {showText ? text : count}
      </Badge>
    );
  }

  return null;
};

// Individual components for easier usage
export const OnlineStatusDot = ({ 
  userId, 
  currentUser, 
  size = "md", 
  className 
}: {
  userId: string;
  currentUser?: ChatUser;
  size?: "sm" | "md" | "lg";
  className?: string;
}) => (
  <OnlinePresence
    userId={userId}
    currentUser={currentUser}
    variant="dot"
    size={size}
    className={className}
  />
);

export const OnlineStatusText = ({ 
  userId, 
  currentUser, 
  size = "md", 
  className 
}: {
  userId: string;
  currentUser?: ChatUser;
  size?: "sm" | "md" | "lg";
  className?: string;
}) => (
  <OnlinePresence
    userId={userId}
    currentUser={currentUser}
    variant="status"
    size={size}
    className={className}
  />
);

export const OnlineCountBadge = ({ 
  currentUser, 
  currentRoomId, 
  size = "md", 
  className,
  showText = true
}: {
  currentUser?: ChatUser;
  currentRoomId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}) => (
  <OnlinePresence
    currentUser={currentUser}
    currentRoomId={currentRoomId}
    variant="badge"
    size={size}
    className={className}
    showText={showText}
  />
);

export const OnlineCount = ({ 
  currentUser, 
  currentRoomId, 
  size = "md", 
  className,
  showText = true
}: {
  currentUser?: ChatUser;
  currentRoomId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}) => (
  <OnlinePresence
    currentUser={currentUser}
    currentRoomId={currentRoomId}
    variant="count"
    size={size}
    className={className}
    showText={showText}
  />
);

export default OnlinePresence;
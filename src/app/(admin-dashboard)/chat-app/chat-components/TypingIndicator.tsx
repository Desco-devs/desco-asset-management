"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useRoomTyping } from "@/hooks/chat-app/useChatTyping";
import { ChatUser } from "@/types/chat-app";
import { useRef, useEffect } from "react";

interface TypingIndicatorProps {
  roomId?: string;
  currentUser?: ChatUser;
  className?: string;
  showAvatars?: boolean;
  maxAvatars?: number;
  onTypingChange?: (isTyping: boolean) => void;
}

const TypingIndicator = ({
  roomId,
  currentUser,
  className,
  showAvatars = true,
  maxAvatars = 3,
  onTypingChange,
}: TypingIndicatorProps) => {
  const { typingUsers, typingText, isAnyoneTyping } = useRoomTyping(roomId, currentUser);
  const lastLogRef = useRef<string>('');
  const logTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced debug logging and auto-scroll trigger
  useEffect(() => {
    const currentState = JSON.stringify({ 
      typingUsersLength: typingUsers.length, 
      isAnyoneTyping, 
      userIds: typingUsers.map(u => u.user_id).sort() 
    });
    
    if (currentState !== lastLogRef.current) {
      // Clear existing timeout
      if (logTimeoutRef.current) {
        clearTimeout(logTimeoutRef.current);
      }
      
      // Debounce logging to avoid spam
      logTimeoutRef.current = setTimeout(() => {
        console.log('⌨️ TypingIndicator state change:', { 
          roomId, 
          typingUsersLength: typingUsers.length, 
          isAnyoneTyping,
          typingUsers: typingUsers.map(u => ({ id: u.user_id, name: u.full_name }))
        });
      }, 100);
      
      lastLogRef.current = currentState;
    }
  }, [roomId, typingUsers, isAnyoneTyping]);

  // Auto-scroll when typing status changes
  useEffect(() => {
    if (onTypingChange) {
      onTypingChange(isAnyoneTyping);
    }
  }, [isAnyoneTyping, onTypingChange]);

  if (!isAnyoneTyping) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 mx-4 my-1 text-xs bg-muted/60 rounded-full border border-border/50 text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
      className
    )}>
      {/* Show typing user avatars - smaller */}
      {showAvatars && (
        <div className="flex -space-x-1">
          {typingUsers.slice(0, maxAvatars).map((user) => (
            <Avatar key={user.user_id} className="h-4 w-4 border border-background">
              <AvatarImage src={user.user_profile || ""} />
              <AvatarFallback className="text-[8px] font-medium">
                {user.full_name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ))}
          {typingUsers.length > maxAvatars && (
            <div className="h-4 w-4 rounded-full bg-muted border border-background flex items-center justify-center">
              <span className="text-[8px] font-medium">
                +{typingUsers.length - maxAvatars}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Typing text with animated dots - smaller and refined */}
      <div className="flex items-center gap-1">
        <span className="font-medium">{typingText}</span>
        <div className="flex space-x-0.5">
          <div
            className="w-0.5 h-0.5 bg-current rounded-full animate-bounce"
            style={{ animationDelay: "0ms" }}
          />
          <div
            className="w-0.5 h-0.5 bg-current rounded-full animate-bounce"
            style={{ animationDelay: "150ms" }}
          />
          <div
            className="w-0.5 h-0.5 bg-current rounded-full animate-bounce"
            style={{ animationDelay: "300ms" }}
          />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;
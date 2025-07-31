"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  CheckCheck,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { MessageWithRelations } from "@/types/chat-app";
import TypingIndicator from "./TypingIndicator";

// Custom hook to handle client-side time formatting and avoid hydration issues
const useClientTime = (timestamp: string | Date, messageId: string) => {
  const [formattedTime, setFormattedTime] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    const formatTime = () => {
      try {
        // Normalize timestamp to ensure consistent parsing
        let normalizedTimestamp = timestamp;
        if (typeof timestamp === 'string' && !timestamp.endsWith('Z') && !timestamp.includes('+')) {
          // If it's a string without timezone info, assume it's UTC
          normalizedTimestamp = timestamp + 'Z';
        }
        
        const date = new Date(normalizedTimestamp);
        
        // Validate the date
        if (isNaN(date.getTime())) {
          console.error('Invalid date:', timestamp);
          return '';
        }
        
        const formatted = date.toLocaleTimeString('en-PH', {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: 'Asia/Manila',
        });
        
        // Clean debug logging (remove in production)
        // console.log(`🕐 Message ${messageId.substring(0, 8)}... timestamp debug:`, {
        //   originalTimestamp: timestamp,
        //   normalizedTimestamp,
        //   formattedTime: formatted
        // });
        
        return formatted;
      } catch (error) {
        console.error('Error formatting time:', error);
        return '';
      }
    };

    setFormattedTime(formatTime());
  }, [timestamp, messageId]);

  return isMounted ? formattedTime : '';
};

interface MessagesListProps {
  messages: MessageWithRelations[];
  currentUserId?: string;
  currentUser?: any;
  roomId?: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
}

const MessagesList = ({
  messages,
  currentUserId,
  currentUser,
  roomId,
  onLoadMore,
  isLoading,
  hasMoreMessages = false,
  isLoadingMore = false,
}: MessagesListProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const previousMessageCount = useRef(messages.length);
  const previousRoomId = useRef(roomId);

  // Reset scroll state when switching rooms
  useEffect(() => {
    if (roomId !== previousRoomId.current) {
      setShouldAutoScroll(true);
      setShowScrollToBottom(false);
      previousRoomId.current = roomId;
      previousMessageCount.current = 0; // Reset message count
    }
  }, [roomId]);

  // Auto scroll to bottom when new messages arrive or component mounts
  useEffect(() => {
    const isNewMessage = messages.length > previousMessageCount.current;
    const isRoomSwitch = roomId !== previousRoomId.current;
    const isInitialLoad =
      previousMessageCount.current === 0 && messages.length > 0;

    // Check if the newest message is from another user (not current user)
    const latestMessage = messages[messages.length - 1];
    const isMessageFromOtherUser = latestMessage && latestMessage.sender?.id !== currentUserId;

    // Auto-scroll conditions:
    // 1. Room switch or initial load (always scroll)
    // 2. New message from another user and user is near bottom
    // 3. User manually wants to stay at bottom (shouldAutoScroll)
    const shouldScroll = isRoomSwitch || isInitialLoad || 
      (shouldAutoScroll && isNewMessage && isMessageFromOtherUser);

    if (shouldScroll) {
      // Instant scroll for room switch and initial load, smooth for new messages only
      const behavior = isRoomSwitch || isInitialLoad ? "auto" : "smooth";

      // Use setTimeout to ensure DOM is ready for room switches
      if (isRoomSwitch || isInitialLoad) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }, 0);
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior });
      }
    }

    previousMessageCount.current = messages.length;
  }, [messages, shouldAutoScroll, roomId, currentUserId]);

  // Handle scroll events to manage auto-scroll behavior
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    const isNearTop = scrollTop < 100;

    setShouldAutoScroll(isNearBottom);
    setShowScrollToBottom(!isNearBottom && messages.length > 10);

    // Auto-load more messages when scrolling near the top
    if (isNearTop && hasMoreMessages && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShouldAutoScroll(true);
    setShowScrollToBottom(false);
  };

  return (
    <div className="relative h-full w-full">
      <ScrollArea
        className="h-full w-full pt-3 md:pt-4 px-3 md:px-4"
        ref={scrollAreaRef}
        onScrollCapture={handleScroll}
      >
        <div className="space-y-2 md:space-y-3 pb-4">
          {/* Load More Button for older messages */}
          {hasMoreMessages && (
            <div className="flex justify-center py-3 md:py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="text-muted-foreground hover:text-foreground rounded-full"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Loading older messages...</span>
                    <span className="sm:hidden">Loading...</span>
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Load older messages</span>
                    <span className="sm:hidden">Load more</span>
                  </>
                )}
              </Button>
            </div>
          )}

          {messages.map((msg) => {
            // Safely handle cases where sender might be undefined
            const sender = msg.sender || { id: msg.sender_id || '', full_name: 'Unknown User', username: '', user_profile: undefined };
            const isMe = sender.id === currentUserId;

            // Use the custom hook for consistent time formatting
            const MessageTimeDisplay = () => {
              const timeDisplay = useClientTime(msg.created_at, msg.id);
              return <span>{timeDisplay}</span>;
            };

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2 md:gap-3 w-full py-1 md:py-1.5",
                  isMe && "flex-row-reverse"
                )}
              >
                {/* Avatar - smaller on mobile */}
                <div className="flex-shrink-0 mt-0.5">
                  <Avatar className={cn(
                    "h-7 w-7 md:h-8 md:w-8 ring-1 md:ring-2 ring-background shadow-sm",
                    isMe && "ring-primary/20"
                  )}>
                    <AvatarImage 
                      src={isMe 
                        ? currentUser?.user_profile || ""
                        : sender.user_profile || ""
                      } 
                    />
                    <AvatarFallback className={cn(
                      "text-xs font-medium",
                      isMe 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {(isMe ? currentUser?.full_name || sender.full_name : sender.full_name)
                        .substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Message content with mobile-optimized spacing */}
                <div
                  className={cn(
                    "flex flex-col gap-0.5 md:gap-1 max-w-[75%] md:max-w-[70%] lg:max-w-md min-w-0",
                    isMe && "items-end"
                  )}
                >
                  {/* Sender name for others (positioned above message) */}
                  {!isMe && (
                    <div className="px-2 md:px-3">
                      <p className="text-xs font-medium text-muted-foreground capitalize truncate">
                        {sender.full_name}
                      </p>
                    </div>
                  )}

                  {/* Message bubble with mobile-optimized styling */}
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2 md:px-4 md:py-2.5 text-sm break-words shadow-sm transition-colors",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-md hover:bg-primary/90"
                        : "bg-muted text-foreground rounded-tl-md"
                    )}
                  >
                    <p className="leading-relaxed">{msg.content}</p>
                  </div>

                  {/* Message metadata */}
                  <div className={cn(
                    "flex items-center gap-2 px-2",
                    isMe ? "justify-end" : "justify-start"
                  )}>
                    <span className="text-xs text-muted-foreground">
                      <MessageTimeDisplay />
                    </span>
                    {isMe && (
                      <CheckCheck className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          <TypingIndicator 
            roomId={roomId} 
            currentUser={currentUser}
            className="mb-2"
            onTypingChange={(isTyping) => {
              // Only auto-scroll for typing indicators if user is near bottom
              // This shows when someone else is typing
              if (isTyping && shouldAutoScroll) {
                setTimeout(() => {
                  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                }, 300);
              }
            }}
          />

          {/* Invisible div to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Scroll to bottom button */}
      {showScrollToBottom && (
        <div className="absolute bottom-4 right-4">
          <Button
            size="sm"
            variant="secondary"
            className="rounded-full shadow-lg"
            onClick={scrollToBottom}
          >
            <ChevronUp className="h-4 w-4 rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default MessagesList;
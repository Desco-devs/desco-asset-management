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
  Clock,
  AlertCircle,
  RotateCcw,
  X,
} from "lucide-react";
import { MessageWithRelations } from "@/types/chat-app";
import TypingIndicator from "./TypingIndicator";
import { useInstantMessages } from "@/hooks/chat-app/useInstantMessages";
import { useChatMessages } from "@/hooks/chat-app/useChatMessages";

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
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const previousRoomId = useRef(roomId);
  const previousMessageCount = useRef(messages.length);
  
  // Initialize instant messages and chat messages hooks
  const instantMessages = useInstantMessages(currentUser);
  const { manualRetry, cancelMessage, getPendingMessages } = useChatMessages(currentUser);
  
  // Get pending messages for current room
  const pendingMessages = roomId ? getPendingMessages(roomId) : [];

  // Reset scroll state when switching rooms and auto-scroll for new messages
  useEffect(() => {
    if (roomId !== previousRoomId.current) {
      setShowScrollToBottom(false);
      previousRoomId.current = roomId;
      // Auto-scroll to bottom when switching rooms
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 100);
    }
  }, [roomId]);
  
  // Auto-scroll for new messages (instant for current user's messages)
  useEffect(() => {
    const messageCountChanged = messages.length !== previousMessageCount.current;
    previousMessageCount.current = messages.length;
    
    if (messageCountChanged && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage?.sender_id === currentUserId;
      const element = scrollAreaRef.current;
      
      if (element) {
        const { scrollTop, scrollHeight, clientHeight } = element;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        
        // Auto-scroll immediately for user's messages or if near bottom
        if (isMyMessage || isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ 
            behavior: isMyMessage ? 'instant' : 'smooth' 
          });
          setShowScrollToBottom(false);
        } else {
          // Show scroll button for other users' messages when not at bottom
          setShowScrollToBottom(true);
        }
      }
    }
  }, [messages, currentUserId]);

  // Handle scroll events to manage scroll button visibility and load more messages
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    const { scrollTop, scrollHeight, clientHeight } = element;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    const isNearTop = scrollTop < 100;

    setShowScrollToBottom(!isNearBottom && messages.length > 10);

    // Auto-load more messages when scrolling near the top
    if (isNearTop && hasMoreMessages && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowScrollToBottom(false);
  };
  
  // Enhanced message status component
  const MessageStatus = ({ message, isMe }: { message: any; isMe: boolean }) => {
    if (!isMe) return null;
    
    const isInstant = message._instant;
    const isPending = message._pending || message.pending;
    const isFailed = message._failed || message.failed;
    const tempId = message._tempId || message.optimistic_id;
    
    if (isFailed) {
      return (
        <div className="flex items-center gap-1 text-xs">
          <AlertCircle className="w-3 h-3 text-destructive" />
          <span className="text-destructive">Failed</span>
          {tempId && (
            <div className="flex gap-1 ml-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => manualRetry(tempId)}
                title="Retry"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-4 w-4 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => cancelMessage(tempId)}
                title="Cancel"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      );
    }
    
    if (isPending || isInstant) {
      return (
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground animate-pulse" />
          <span className="text-xs text-muted-foreground">Sending...</span>
        </div>
      );
    }
    
    // Message sent successfully
    return <CheckCheck className="w-3 h-3 text-primary" />;
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
                  "flex items-start gap-2 md:gap-3 w-full py-1 md:py-1.5 transition-opacity duration-200",
                  isMe && "flex-row-reverse",
                  // Slight opacity for pending messages
                  (msg as any)._pending && "opacity-75",
                  // Red tint for failed messages
                  (msg as any)._failed && "opacity-60"
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

                  {/* Message metadata with enhanced status */}
                  <div className={cn(
                    "flex items-center gap-2 px-2",
                    isMe ? "justify-end" : "justify-start"
                  )}>
                    <span className="text-xs text-muted-foreground">
                      <MessageTimeDisplay />
                    </span>
                    <MessageStatus message={msg} isMe={isMe} />
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
              // Typing indicator callback - no auto-scroll behavior
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
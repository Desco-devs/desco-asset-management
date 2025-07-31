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

    if (shouldAutoScroll || isNewMessage || isInitialLoad || isRoomSwitch) {
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
  }, [messages, shouldAutoScroll, roomId]);

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
        className="h-full w-full pt-2 sm:pt-6 px-2 sm:px-6"
        ref={scrollAreaRef}
        onScrollCapture={handleScroll}
      >
        <div className="space-y-3">
          {/* Load More Button for older messages */}
          {hasMoreMessages && (
            <div className="flex justify-center py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="text-muted-foreground hover:text-foreground"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Loading older messages...
                  </>
                ) : (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Load older messages
                  </>
                )}
              </Button>
            </div>
          )}

          {messages.map((msg) => {
            // Safely handle cases where sender might be undefined
            const sender = msg.sender || { id: msg.sender_id || '', full_name: 'Unknown User', username: '', user_profile: undefined };
            const isMe = sender.id === currentUserId;


            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-3 w-full px-2 sm:px-4 py-1",
                  isMe && "flex-row-reverse"
                )}
              >
                {/* Avatar - always visible with consistent positioning */}
                <div className="flex-shrink-0 mt-1">
                  <Avatar className={cn(
                    "h-8 w-8 ring-2 ring-background shadow-sm",
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

                {/* Message content with improved spacing */}
                <div
                  className={cn(
                    "flex flex-col gap-1 max-w-[70%] sm:max-w-sm lg:max-w-md min-w-0",
                    isMe && "items-end"
                  )}
                >
                  {/* Sender name for others (positioned above message) */}
                  {!isMe && (
                    <div className="px-2">
                      <p className="text-xs font-medium text-muted-foreground capitalize">
                        {sender.full_name}
                      </p>
                    </div>
                  )}

                  {/* Message bubble with improved styling */}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm break-words shadow-sm",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-md"
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
                      {new Date(msg.created_at).toLocaleTimeString('en-PH', {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: 'Asia/Manila',
                      })}
                    </span>
                    {isMe && (
                      <CheckCheck className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}

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
"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageWithRelations } from "@/types/chat-app";
import {
  Check,
  CheckCheck,
  CheckIcon,
  CheckLine,
  ChevronUp,
  Loader2,
  LoaderIcon,
} from "lucide-react";

interface MessagesListProps {
  messages: MessageWithRelations[];
  currentUserId?: string;
  roomId?: string; // Add roomId to detect room changes
  onLoadMore?: () => void;
  isLoading?: boolean;
  hasMoreMessages?: boolean;
  isLoadingMore?: boolean;
}

const MessagesList = ({
  messages,
  currentUserId,
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
        <div className="space-y-4">
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
            const isMe = msg.sender_id === currentUserId;
            const isPending = msg.pending;
            const isFailed = msg.failed;
            const isSent = msg.sent;

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex items-end space-x-3 w-full sm:px-4",
                  isMe && "flex-row-reverse space-x-reverse"
                )}
              >
                {!isMe && (
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarImage src={msg.sender.user_profile || ""} />
                    <AvatarFallback className="text-xs bg-muted">
                      {msg.sender.full_name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={cn(
                    "flex flex-col space-y-1 max-w-[75%]  sm:max-w-xs lg:max-w-md",
                    isMe && "items-end"
                  )}
                >
                  <div
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm relative break-words",
                      isMe
                        ? "bg-chart-2 text-primary-foreground rounded-tr-2xl rounded-l-2xl rounded-br-none dark:text-accent-foreground"
                        : "bg-chart-2/10 dark:bg-muted text-accent-foreground rounded-tl-2xl rounded-r-2xl rounded-bl-none",
                      isPending && "opacity-70",
                      isFailed &&
                        "bg-destructive/20 border border-destructive/40"
                    )}
                  >
                    {/* this is the message */}
                    <p>{msg.content}</p>
                    {isPending && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full border-2 border-primary flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                      </div>
                    )}
                    {isFailed && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-background rounded-full border-2 border-destructive flex items-center justify-center">
                        <span className="text-xs text-destructive">!</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 px-1">
                    <div className="text-xs text-muted-foreground flex gap-1 flex-row-reverse items-center">
                      <span>
                        {" "}
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {!isMe && (
                        <p className="capitalize">{msg.sender.full_name}</p>
                      )}
                    </div>
                    {isPending && (
                      <span className="text-xs text-muted-foreground italic">
                        Sending...
                      </span>
                    )}
                    {isFailed && (
                      <span className="text-xs text-destructive italic">
                        Failed to send
                      </span>
                    )}
                    {isSent && (
                      <span className="text-xs text-green-600 animate-spin">
                        <LoaderIcon className="w-4 h-4" />
                      </span>
                    )}
                    {!isPending && !isFailed && !isSent && isMe && (
                      <span className="text-xs text-muted-foreground">
                        <CheckCheck className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {/* 
          {isLoading && (
            <div className="h-full w-full flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )} */}

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

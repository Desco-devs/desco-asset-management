"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { MessageWithRelations } from "@/types/chat-app";

interface MessagesListProps {
  messages: MessageWithRelations[];
  currentUserId?: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

const MessagesList = ({ messages, currentUserId, onLoadMore, isLoading }: MessagesListProps) => {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUserId;
          const isPending = msg.pending;
          const isFailed = msg.failed;
          
          return (
            <div
              key={msg.id}
              className={cn(
                "flex space-x-3",
                isMe && "flex-row-reverse space-x-reverse"
              )}
            >
              {!isMe && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarImage src={msg.sender.user_profile || ""} />
                  <AvatarFallback className="text-xs">
                    {msg.sender.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className={cn(
                "flex flex-col space-y-1 max-w-xs lg:max-w-md",
                isMe && "items-end"
              )}>
                {!isMe && (
                  <span className="text-sm font-medium">{msg.sender.full_name}</span>
                )}
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm relative",
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                    isPending && "opacity-70",
                    isFailed && "bg-destructive/20 border border-destructive/40"
                  )}
                >
                  {msg.content}
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
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-muted-foreground">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isPending && (
                    <span className="text-xs text-muted-foreground italic">Sending...</span>
                  )}
                  {isFailed && (
                    <span className="text-xs text-destructive italic">Failed to send</span>
                  )}
                  {!isPending && !isFailed && isMe && (
                    <span className="text-xs text-muted-foreground">✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default MessagesList;
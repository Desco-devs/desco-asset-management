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
                    "rounded-lg px-3 py-2 text-sm",
                    isMe
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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
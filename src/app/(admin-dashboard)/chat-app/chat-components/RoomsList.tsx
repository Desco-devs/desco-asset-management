"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Plus,
  MessageSquare,
  Clock,
  UserPlus,
  ChartBar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomListItem, RoomType } from "@/types/chat-app";
import { OnlineStatusDot } from "./OnlinePresence";
import { useRoomListRealtime } from "@/hooks/chat-app/useRoomListRealtime";

interface RoomsListProps {
  rooms: RoomListItem[];
  selectedRoom: string;
  onRoomSelect: (roomId: string) => void;
  onCreateRoom?: () => void;
  currentUserId?: string;
  isUserOnline?: (userId: string) => boolean;
  onlineUserIds?: string[];
  currentUser?: any;
}

const RoomsList = ({
  rooms,
  selectedRoom,
  onRoomSelect,
  onCreateRoom,
  currentUserId,
  isUserOnline = () => false,
  onlineUserIds = [],
  currentUser,
}: RoomsListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Initialize real-time room list updates
  const roomListRealtime = useRoomListRealtime(currentUser);

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Enhanced time formatting with real-time updates
  const formatMessageTime = (timestamp: Date | string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diffInMinutes < 1) {
        return 'Just now';
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
      } else if (diffInMinutes < 1440) { // Less than 24 hours
        return date.toLocaleTimeString('en-US', {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      } else {
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-background md:bg-muted">
      <div className="p-3 md:p-4 border-b bg-background">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-semibold">Messages</h2>
          <Button size="sm" variant="outline" onClick={onCreateRoom} className="flex-shrink-0">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-10 py-2.5 rounded-2xl border-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-2 md:p-3">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <div className="flex flex-col items-center space-y-4 px-4">
                <div className="p-4 rounded-full bg-muted">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2 text-center">
                  <h3 className="font-medium text-muted-foreground">
                    {searchQuery
                      ? "No conversations found"
                      : "No conversations yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    {searchQuery
                      ? "Try searching for a different term"
                      : "Start a conversation with someone or create a group chat"}
                  </p>
                </div>
                {!searchQuery && onCreateRoom && (
                  <Button
                    onClick={onCreateRoom}
                    className="mt-4 text-white bg-chart-3 rounded-2xl px-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start a conversation
                  </Button>
                )}
              </div>
            </div>
          ) : (
            filteredRooms.map((room) => {
              // For direct message rooms, find the other user to show their online status
              const otherUser = room.type === RoomType.DIRECT && room.members
                ? room.members.find(member => 
                    (member.user?.id || member.user_id) !== currentUserId
                  )
                : null;
              const otherUserId = otherUser?.user?.id || otherUser?.user_id;

              const hasNewMessage = room.lastMessage && 
                new Date(room.lastMessage.created_at).getTime() > Date.now() - (5 * 60 * 1000); // 5 minutes ago
              
              return (
                <Card
                  key={room.id}
                  className={cn(
                    "mb-2 cursor-pointer transition-all duration-200 hover:bg-accent/50 active:scale-[0.98] md:active:scale-100 p-0 border-l-4 border-l-transparent",
                    selectedRoom === room.id &&
                      "bg-accent/70 border-l-primary shadow-sm",
                    hasNewMessage && selectedRoom !== room.id &&
                      "bg-primary/5 border-l-primary/30"
                  )}
                  onClick={() => onRoomSelect(room.id)}
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center space-x-3 w-full">
                      <div className="relative flex-shrink-0">
                        <Avatar className="h-11 w-11 md:h-10 md:w-10">
                          <AvatarFallback className="text-sm font-medium">
                            {room.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {/* Show online status for direct messages */}
                        {room.type === RoomType.DIRECT && otherUserId && (
                          <OnlineStatusDot
                            userId={otherUserId}
                            currentUser={currentUser}
                            size="sm"
                            className="absolute -bottom-0.5 -right-0.5"
                          />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            {room.type === 'GROUP' && (
                              <ChartBar className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            )}
                            <p className="text-sm md:text-base font-medium line-clamp-1 truncate">
                              {room.name}
                            </p>
                          </div>
                          {room.lastMessage?.created_at && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
                              {formatMessageTime(room.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        {room.lastMessage?.content && (
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 truncate">
                            {room.type === 'GROUP' && room.lastMessage.sender_name &&
                              `${room.lastMessage.sender_name}: `}
                            {room.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomsList;
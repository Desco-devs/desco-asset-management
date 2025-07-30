"use client";

import { useState } from "react";
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

interface Room {
  id: string;
  name: string;
  type: 'DIRECT' | 'GROUP';
  owner_id: string;
  created_at: string;
  updated_at: string;
  lastMessage?: {
    content: string;
    sender_name: string;
    created_at: string;
  } | null;
  is_owner: boolean;
  member_count: number;
  owner: {
    id: string;
    username: string;
    full_name: string;
  };
  members: {
    id: string;
    user: {
      id: string;
      username: string;
      full_name: string;
    };
  }[];
}

interface RoomsListProps {
  rooms: Room[];
  selectedRoom: string;
  onRoomSelect: (roomId: string) => void;
  onCreateRoom?: () => void;
  currentUserId?: string;
  isUserOnline?: (userId: string) => boolean;
  onlineUserIds?: string[];
}

const RoomsList = ({
  rooms,
  selectedRoom,
  onRoomSelect,
  onCreateRoom,
  currentUserId,
  isUserOnline = () => false,
  onlineUserIds = [],
}: RoomsListProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col md:bg-muted bg-chart-2/10">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          <Button size="sm" variant="outline" onClick={onCreateRoom}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scroll-none">
        <div className="p-2 group">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-2">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 rounded-full bg-muted">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground">
                    {searchQuery
                      ? "No conversations found"
                      : "No conversations yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery
                      ? "Try searching for a different term"
                      : "Start a conversation with someone or create a group chat"}
                  </p>
                </div>
                {!searchQuery && onCreateRoom && (
                  <Button
                    onClick={onCreateRoom}
                    className="mt-4 text-white bg-chart-3"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Start a conversation
                  </Button>
                )}
              </div>
            </div>
          ) : (
            filteredRooms.map((room) => (
              <Card
                key={room.id}
                className={cn(
                  "mb-2 cursor-pointer transition-colors hover:bg-chart-1/20 p-0 ",
                  selectedRoom === room.id &&
                    "bg-chart-1/20 group-hover:bg-accent border border-chart-1/20 dark:border-chart-3"
                )}
                onClick={() => onRoomSelect(room.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center space-x-3 w-full ">
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {room.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>

                    <div className="flex-1 min-w-0 md:max-w-56 max-w-48 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {room.type === 'GROUP' && (
                            <ChartBar className="w-4 h-4 min-w-4 min-h-4 max-w-4 max-h-4 text-chart-1 dark:text-white" />
                          )}

                          <p className="text-sm font-medium line-clamp-1 ">
                            {room.name}
                          </p>
                        </div>
                        <div
                          className={`${
                            room.lastMessage?.created_at !== undefined || null
                              ? "flex"
                              : "hidden"
                          } items-center space-x-2`}
                        >
                          <span className="text-xs w-fit whitespace-nowrap">
                            {room.lastMessage?.created_at
                              ? new Date(
                                  room.lastMessage.created_at
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 truncate mt-1">
                        {room.type === 'GROUP' &&
                          room.lastMessage &&
                          `${room.lastMessage.sender_name}: `}
                        {room.lastMessage?.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RoomsList;
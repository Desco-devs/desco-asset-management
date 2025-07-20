"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { RoomListItem, RoomType, InvitationStatus } from "@/types/chat-app";

interface RoomsListProps {
  rooms: RoomListItem[];
  selectedRoom: string;
  onRoomSelect: (roomId: string) => void;
  onCreateRoom?: () => void;
  currentUserId?: string;
}

const RoomsList = ({
  rooms,
  selectedRoom,
  onRoomSelect,
  onCreateRoom,
  currentUserId,
}: RoomsListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // For now, we'll assume users are online (can be improved later with Supabase presence)
  const isUserOnline = (userId: string) => false;

  const filteredRooms = rooms.filter((room) =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to get the other user ID in a direct message room
  const getOtherUserId = (room: RoomListItem) => {
    if (room.type === RoomType.DIRECT && room.members && currentUserId) {
      const otherMember = room.members.find(
        member => (member.user?.id || member.user_id) !== currentUserId
      );
      return otherMember?.user?.id || otherMember?.user_id || null;
    }
    return null;
  };

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
                  <Button onClick={onCreateRoom} className="mt-4 text-white bg-chart-3">
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
                        <AvatarImage src={room.avatar_url || ""} />
                        <AvatarFallback className="text-sm">
                          {room.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {room.invitation_status === InvitationStatus.PENDING ? (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-background bg-orange-500 flex items-center justify-center">
                          <Clock className="h-2 w-2 text-white" />
                        </div>
                      ) : room.type === RoomType.DIRECT ? (
                        <div
                          className={cn(
                            "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                            // Check if the other user in this DM is online
                            (() => {
                              const otherUserId = getOtherUserId(room);
                              return otherUserId && isUserOnline(otherUserId) 
                                ? "bg-green-500" 
                                : "bg-gray-400";
                            })()
                          )}
                        />
                      ) : null}
                    </div>

                    <div className="flex-1 min-w-0 md:max-w-56 max-w-48 w-full">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {room.type === RoomType.GROUP && (
                            // <Hash className="h-3 w-3 text-muted-foreground" />
                            <ChartBar className="w-4 h-4 min-w-4 min-h-4 max-w-4 max-h-4 text-chart-1 dark:text-white" />
                          )}

                          <p className="text-sm font-medium line-clamp-1 ">
                            {room.name}
                          </p>
                        </div>
                        <div className="">
                          {room.invitation_status ===
                            InvitationStatus.PENDING && (
                            <Badge
                              variant="secondary"
                              className="text-xs ml-1 bg-chart-3 text-white"
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Invitation
                            </Badge>
                          )}
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
                          {room.unread_count > 0 &&
                            selectedRoom !== room.id && (
                              <Badge
                                variant="default"
                                className="h-5 min-w-5 px-1 text-xs"
                              >
                                {room.unread_count}
                              </Badge>
                            )}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 truncate mt-1">
                        {room.invitation_status === InvitationStatus.PENDING ? (
                          room.invited_by ? (
                            `Invited by ${room.invited_by.full_name}`
                          ) : (
                            "Pending invitation"
                          )
                        ) : (
                          <>
                            {room.type === RoomType.GROUP &&
                              room.lastMessage &&
                              `${room.lastMessage.sender_name}: `}
                            {room.lastMessage?.content}
                          </>
                        )}
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

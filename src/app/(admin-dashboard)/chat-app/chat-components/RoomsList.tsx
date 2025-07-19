"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Hash, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomListItem, RoomType } from "@/types/chat-app";

interface RoomsListProps {
  rooms: RoomListItem[];
  selectedRoom: string;
  onRoomSelect: (roomId: string) => void;
  onCreateRoom?: () => void;
}

const RoomsList = ({ rooms, selectedRoom, onRoomSelect, onCreateRoom }: RoomsListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col">
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

      <ScrollArea className="flex-1">
        <div className="p-2">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 rounded-full bg-muted">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-medium text-muted-foreground">
                    {searchQuery ? 'No conversations found' : 'No conversations yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? 'Try searching for a different term'
                      : 'Start a conversation with someone or create a group chat'
                    }
                  </p>
                </div>
                {!searchQuery && onCreateRoom && (
                  <Button onClick={onCreateRoom} className="mt-4">
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
                "mb-2 cursor-pointer transition-colors hover:bg-accent",
                selectedRoom === room.id && "bg-accent border-primary"
              )}
              onClick={() => onRoomSelect(room.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={room.avatar_url || ""} />
                      <AvatarFallback className="text-sm">
                        {room.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {room.type === RoomType.DIRECT && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {room.type === RoomType.GROUP && <Hash className="h-3 w-3 text-muted-foreground" />}
                        {room.type === RoomType.DIRECT && <div className="w-3" />}
                        <p className="text-sm font-medium truncate">
                          {room.name}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {room.lastMessage?.created_at ? new Date(room.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        {room.unread_count > 0 && (
                          <Badge variant="default" className="h-5 min-w-5 px-1 text-xs">
                            {room.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {room.type === RoomType.GROUP && room.lastMessage && `${room.lastMessage.sender_name}: `}
                      {room.lastMessage?.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default RoomsList;
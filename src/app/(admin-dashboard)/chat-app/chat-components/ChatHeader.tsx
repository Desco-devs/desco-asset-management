"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Users, 
  Hash, 
  MoreVertical, 
  Menu,
  Phone,
  Video,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomListItem, RoomType } from "@/types/chat-app";
import RoomsList from "./RoomsList";

interface ChatHeaderProps {
  currentRoom?: RoomListItem;
  rooms: RoomListItem[];
  selectedRoom: string;
  onRoomSelect: (roomId: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onCreateRoom?: () => void;
  onCall?: () => void;
  onVideoCall?: () => void;
  onShowInfo?: () => void;
  onShowMore?: () => void;
}

const ChatHeader = ({ 
  currentRoom, 
  rooms, 
  selectedRoom, 
  onRoomSelect, 
  isMobileMenuOpen, 
  setIsMobileMenuOpen,
  onCreateRoom,
  onCall,
  onVideoCall,
  onShowInfo,
  onShowMore
}: ChatHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center space-x-3">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80">
            <RoomsList 
              rooms={rooms}
              selectedRoom={selectedRoom}
              onRoomSelect={(roomId) => {
                onRoomSelect(roomId);
                setIsMobileMenuOpen(false);
              }}
              onCreateRoom={onCreateRoom}
            />
          </SheetContent>
        </Sheet>

        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentRoom?.avatar_url || ""} />
            <AvatarFallback className="text-sm">
              {currentRoom?.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {currentRoom?.type === RoomType.DIRECT && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background bg-green-500" />
          )}
        </div>

        <div>
          <div className="flex items-center space-x-2">
            {currentRoom?.type === RoomType.GROUP && <Hash className="h-4 w-4 text-muted-foreground" />}
            <h3 className="font-medium">{currentRoom?.name}</h3>
          </div>
          {currentRoom?.type === RoomType.GROUP && (
            <p className="text-xs text-muted-foreground flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {currentRoom.member_count} members
            </p>
          )}
          {currentRoom?.type === RoomType.DIRECT && (
            <p className="text-xs text-muted-foreground">
              Online
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" onClick={onCall}>
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onVideoCall}>
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onShowInfo}>
          <Info className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onShowMore}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ChatHeader;
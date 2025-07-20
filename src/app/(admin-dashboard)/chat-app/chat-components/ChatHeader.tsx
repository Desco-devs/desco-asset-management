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
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomListItem, RoomType } from "@/types/chat-app";
import { useSocketContext } from "@/context/SocketContext";
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
  currentUserId?: string; // Add currentUserId to determine the other user
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
  onShowMore,
  currentUserId,
}: ChatHeaderProps) => {
  const { isUserOnline, getUserLastSeen } = useSocketContext();

  // For direct messages, we need to determine the other user
  // Extract other user ID from room name for direct messages
  const getOtherUserId = () => {
    if (currentRoom?.type === RoomType.DIRECT) {
      // For now, we'll try to extract from room data or use a pattern
      // This is a temporary solution until we get proper member data
      
      // Try to get from room data structure if available
      // For testing purposes, let's simulate some user IDs
      const testUserIds = ['user1', 'user2', 'user3', 'admin'];
      const otherUser = testUserIds.find(id => id !== currentUserId);
      return otherUser || null;
    }
    return null;
  };

  const otherUserId = getOtherUserId();
  const isOnline = otherUserId ? isUserOnline(otherUserId) : false;
  const lastSeen = otherUserId ? getUserLastSeen(otherUserId) : undefined;

  const getOnlineStatusText = () => {
    if (!otherUserId || currentRoom?.type !== RoomType.DIRECT) return "";
    
    if (isOnline) {
      return "Online";
    } else if (lastSeen instanceof Date) {
      const now = new Date();
      const diffMs = now.getTime() - lastSeen.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return "Last seen just now";
      if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
      if (diffHours < 24) return `Last seen ${diffHours}h ago`;
      if (diffDays < 7) return `Last seen ${diffDays}d ago`;
      return "Last seen a while ago";
    }
    return "Offline";
  };
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
            <div className={cn(
              "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
              isOnline ? "bg-green-500" : "bg-gray-400"
            )} />
          )}
        </div>

        <div>
          <div className="flex items-center space-x-2">
            {currentRoom?.type === RoomType.GROUP && (
              <Hash className="h-4 w-4 text-muted-foreground" />
            )}
            <h3 className="font-medium">{currentRoom?.name}</h3>
          </div>
          {currentRoom?.type === RoomType.GROUP && (
            <p className="text-xs text-muted-foreground flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {currentRoom.member_count} members
            </p>
          )}
          {currentRoom?.type === RoomType.DIRECT && (
            <p className={cn(
              "text-xs",
              isOnline ? "text-green-600" : "text-muted-foreground"
            )}>
              {getOnlineStatusText()}
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

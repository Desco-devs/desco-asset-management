"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Users,
  Hash,
  MoreVertical,
  Menu,
  Phone,
  Video,
  Info,
  Trash2,
  UserPlus,
  ChartBar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomListItem, RoomType, ChatUser } from "@/types/chat-app";
import RoomsList from "./RoomsList";
import InviteUsersModal from "./InviteUsersModal";
import { DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

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
  currentUserId?: string;
  users?: ChatUser[];
  onDeleteRoom?: (roomId: string) => void;
  onInviteUsers?: (inviteData: {
    invitedUsers: ChatUser[];
    inviteUsername?: string;
    inviteEmail?: string;
  }) => void;
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
  users = [],
  onDeleteRoom,
  onInviteUsers,
}: ChatHeaderProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // For direct messages, we need to determine the other user
  const getOtherUserId = () => {
    if (currentRoom?.type === RoomType.DIRECT && currentRoom?.members) {
      const otherMember = currentRoom.members.find(
        member => (member.user?.id || member.user_id) !== currentUserId
      );
      return otherMember?.user?.id || otherMember?.user_id || null;
    }
    return null;
  };

  const otherUserId = getOtherUserId();
  const isOnline = false; // Simplified - no real-time status for now

  const getOnlineStatusText = () => {
    if (!otherUserId || currentRoom?.type !== RoomType.DIRECT) return "";
    return "Offline"; // Simplified
  };

  const handleDeleteRoom = () => {
    if (currentRoom && onDeleteRoom) {
      onDeleteRoom(currentRoom.id);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleInviteUsers = (inviteData: {
    invitedUsers: ChatUser[];
    inviteUsername?: string;
    inviteEmail?: string;
  }) => {
    if (onInviteUsers) {
      onInviteUsers(inviteData);
      setIsInviteModalOpen(false);
    }
  };

  // Check if current user is the owner of the room
  const isRoomOwner =
    currentRoom?.owner_id === currentUserId || currentRoom?.is_owner === true;

  return (
    <div className="flex w-full items-center justify-between py-2 border-b bg-background">
      <div className="flex items-center gap-2 md:px-2 px-0 w-full">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm" className="md:hidden block">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 [&>button]:hidden">
            <VisuallyHidden>
              <DialogTitle>Room List</DialogTitle>
            </VisuallyHidden>
            <RoomsList
              rooms={rooms}
              selectedRoom={selectedRoom}
              onRoomSelect={(roomId) => {
                onRoomSelect(roomId);
                setIsMobileMenuOpen(false);
              }}
              onCreateRoom={onCreateRoom}
              currentUserId={currentUserId}
            />
          </SheetContent>
        </Sheet>

        <div className="relative sm:flex hidden">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentRoom?.avatar_url || ""} />
            <AvatarFallback className="text-sm">
              {currentRoom?.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {currentRoom?.type === RoomType.DIRECT && (
            <div
              className={cn(
                "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-background",
                isOnline ? "bg-green-500" : "bg-gray-400"
              )}
            />
          )}
        </div>

        <div>
          <div className="flex items-center gap-1 md:gap-2 md:max-w-56 lg:max-w-fit max-w-24 w-full">
            {currentRoom?.type === RoomType.GROUP && (
              <ChartBar className="w-3 h-3 min-w-3 min-h-3 max-w-3 max-h-3 text-muted-foreground" />
            )}
            <p className="font-medium text-base line-clamp-1">
              {currentRoom?.name}
            </p>
          </div>
          {currentRoom?.type === RoomType.GROUP && (
            <p className="text-[10px] text-muted-foreground flex items-center">
              <Users className="h-3 w-3 mr-1" />
              {currentRoom.member_count}{" "}
              {currentRoom.member_count !== 0 ? "member" : "members"}
            </p>
          )}
          {currentRoom?.type === RoomType.DIRECT && (
            <p
              className={cn(
                "text-xs",
                isOnline ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {getOnlineStatusText()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2 px-2">
        <Button variant="ghost" size="sm" onClick={onCall}>
          <Phone className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onVideoCall}>
          <Video className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onShowInfo}>
          <Info className="h-4 w-4" />
        </Button>

        {/* Show dropdown menu based on room type and permissions */}
        {(currentRoom?.type === RoomType.DIRECT ||
          (currentRoom?.type === RoomType.GROUP && isRoomOwner)) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Add Users - Only for GROUP rooms and only if user is owner */}
              {currentRoom?.type === RoomType.GROUP && isRoomOwner && (
                <>
                  <DropdownMenuItem onClick={() => setIsInviteModalOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Users
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {/* Delete Conversation - For DIRECT rooms (any participant) or GROUP rooms (owner only) */}
              {(currentRoom?.type === RoomType.DIRECT ||
                (currentRoom?.type === RoomType.GROUP && isRoomOwner)) && (
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Conversation
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this conversation? This action
              cannot be undone and will remove all messages.
              {currentRoom?.type === RoomType.GROUP
                ? " All members will lose access to this group."
                : " This will delete the conversation for both participants."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRoom}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Users Modal - Only for GROUP rooms and owners */}
      {currentRoom?.type === RoomType.GROUP && isRoomOwner && (
        <InviteUsersModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onInviteUsers={handleInviteUsers}
          users={users || []}
          currentRoom={currentRoom}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default ChatHeader;
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
  Trash2,
  UserPlus,
  ChartBar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomListItem, RoomType, ChatUser } from "@/types/chat-app";
import RoomsList from "./RoomsList";
import InviteUsersModal from "./InviteUsersModal";
import InvitationNotificationModal, { InvitationBell } from "./InvitationNotificationModal";
import { DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { OnlineStatusDot, OnlineStatusText, OnlineCountBadge } from "./OnlinePresence";

interface ChatHeaderProps {
  currentRoom?: RoomListItem;
  rooms: RoomListItem[];
  selectedRoom: string;
  onRoomSelect: (roomId: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onCreateRoom?: () => void;
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
  currentUserId,
  users = [],
  onDeleteRoom,
  onInviteUsers,
}: ChatHeaderProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInvitationModalOpen, setIsInvitationModalOpen] = useState(false);

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

  // Get current user for presence tracking
  const currentUser = users?.find(user => user.id === currentUserId);

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
    <div className="flex w-full items-center justify-between py-2 md:py-3 px-2 md:px-4 border-b bg-background">
      <div className="flex items-center gap-2 w-full min-w-0">
        {/* Mobile: Back button when in chat, Menu when in room list */}
        {currentRoom ? (
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden flex-shrink-0"
            onClick={() => onRoomSelect('')} // Clear selection to go back to room list
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
        ) : (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="md:hidden flex-shrink-0">
                <Menu className="h-5 w-5" />
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
                currentUser={currentUser}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Room Avatar - visible on all screen sizes when room is selected */}
        {currentRoom && (
          <div className="relative flex-shrink-0">
            <Avatar className="h-8 w-8 md:h-9 md:w-9">
              <AvatarImage src={currentRoom?.avatar_url || ""} />
              <AvatarFallback className="text-sm">
                {currentRoom?.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {currentRoom?.type === RoomType.DIRECT && otherUserId && (
              <OnlineStatusDot
                userId={otherUserId}
                currentUser={currentUser}
                className="absolute -bottom-1 -right-1"
              />
            )}
          </div>
        )}

        {/* Room Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 md:gap-2 w-full">
            {currentRoom?.type === RoomType.GROUP && (
              <ChartBar className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 text-muted-foreground" />
            )}
            <h1 className="font-medium text-base md:text-lg line-clamp-1 truncate">
              {currentRoom?.name || "Messages"}
            </h1>
          </div>
          {currentRoom?.type === RoomType.GROUP && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground flex items-center">
                <Users className="h-3 w-3 mr-1" />
                {currentRoom.member_count}{" "}
                {currentRoom.member_count === 1 ? "member" : "members"}
              </p>
              {/* Show online count for group rooms */}
              <OnlineCountBadge
                currentUser={currentUser}
                currentRoomId={currentRoom.id}
                size="sm"
              />
            </div>
          )}
          {currentRoom?.type === RoomType.DIRECT && otherUserId && (
            <OnlineStatusText
              userId={otherUserId}
              currentUser={currentUser}
              size="sm"
            />
          )}
        </div>
      </div>

      <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
        {/* Invitation Bell - Always visible */}
        <InvitationBell
          currentUser={currentUser}
          onClick={() => setIsInvitationModalOpen(true)}
        />

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

      {/* Invitation Notification Modal */}
      <InvitationNotificationModal
        isOpen={isInvitationModalOpen}
        onClose={() => setIsInvitationModalOpen(false)}
        currentUser={currentUser}
        onRoomSelect={onRoomSelect}
      />
    </div>
  );
};

export default ChatHeader;
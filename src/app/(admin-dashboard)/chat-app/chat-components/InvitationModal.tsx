"use client";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, User, Clock, UserCheck, UserX } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoomListItem, RoomType, InvitationStatus } from "@/types/chat-app";

interface InvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: RoomListItem;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  isLoading?: boolean;
}

const InvitationModal = ({
  isOpen,
  onClose,
  room,
  onAccept,
  onDecline,
  isLoading = false,
}: InvitationModalProps) => {
  const handleAccept = () => {
    if (room.invitation_id) {
      onAccept(room.invitation_id);
    }
  };

  const handleDecline = () => {
    if (room.invitation_id) {
      onDecline(room.invitation_id);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-orange-500" />
            <span>Room Invitation</span>
          </DialogTitle>
          <DialogDescription>
            You've been invited to join a conversation
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Info */}
          <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={room.avatar_url || ""} />
                <AvatarFallback className="text-sm">
                  {room.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 p-1 rounded-full bg-background">
                {room.type === RoomType.DIRECT ? (
                  <User className="h-4 w-4 text-blue-500" />
                ) : (
                  <Users className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-lg truncate">{room.name}</h3>
                <Badge variant="outline" className="text-xs">
                  {room.type === RoomType.DIRECT ? "Direct" : "Group"}
                </Badge>
              </div>

              <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                <span>
                  {room.member_count}{" "}
                  {room.member_count === 1 ? "member" : "members"}
                </span>
                {room.type === RoomType.GROUP && <span>•</span>}
              </div>
            </div>
          </div>

          {/* Inviter Info */}
          {room.invited_by && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Invited by:</p>
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={room.invited_by.user_profile || ""} />
                  <AvatarFallback className="text-xs">
                    {room.invited_by.full_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {room.invited_by.full_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    @{room.invited_by.username}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <Button
              onClick={handleDecline}
              variant="outline"
              className="flex-1"
              disabled={isLoading}
            >
              <UserX className="h-4 w-4 mr-2" />
              Decline
            </Button>
            <Button
              onClick={handleAccept}
              className="flex-1 text-white bg-chart-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 "></div>
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              Accept
            </Button>
          </div>

          {/* Additional Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>By accepting, you'll be able to see the conversation history</p>
            <p>and participate in this {room.type.toLowerCase()} chat.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationModal;

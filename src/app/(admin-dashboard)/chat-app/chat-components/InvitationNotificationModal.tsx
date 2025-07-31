"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Bell, 
  Check, 
  X, 
  Users, 
  Clock, 
  MoreVertical,
  MessageSquare,
  UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatInvitations, useInvitationNotifications } from "@/hooks/chat-app/useChatInvitations";
import { useChatInvitationsRealtime } from "@/hooks/chat-app/useChatInvitationsRealtime";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import type { RoomInvitationWithRelations, ChatUser } from "@/types/chat-app";
import { invitation_status } from "@prisma/client";

interface InvitationNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: ChatUser;
  onRoomSelect?: (roomId: string) => void;
}

const InvitationNotificationModal = ({
  isOpen,
  onClose,
  currentUser,
  onRoomSelect,
}: InvitationNotificationModalProps) => {
  const [selectedTab, setSelectedTab] = useState<'received' | 'sent'>('received');
  
  // Real-time invitations hooks
  const {
    useReceivedInvitations,
    useSentInvitations,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
    isRespondingToInvitation,
    isCancellingInvitation,
    respondError
  } = useChatInvitations(currentUser);
  
  // Enable real-time updates
  useChatInvitationsRealtime(currentUser);

  // Get invitations data
  const { data: receivedInvitations = [], isLoading: loadingReceived } = useReceivedInvitations(invitation_status.PENDING);
  const { data: sentInvitations = [], isLoading: loadingSent } = useSentInvitations(invitation_status.PENDING);

  const handleAcceptInvitation = async (invitation: RoomInvitationWithRelations) => {
    try {
      await acceptInvitation(invitation.id);
      
      // Show success toast
      toast.success(`Joined "${invitation.room.name}" successfully!`, {
        description: `You are now a member of this ${invitation.room.type.toLowerCase()} chat.`
      });
      
      // Switch to the room if handler is provided
      if (onRoomSelect) {
        onRoomSelect(invitation.room_id);
      }
      
      // Close modal after short delay
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      toast.error('Failed to accept invitation', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const handleDeclineInvitation = async (invitation: RoomInvitationWithRelations) => {
    try {
      await declineInvitation(invitation.id);
      
      // Show success toast
      toast.success('Invitation declined', {
        description: `You declined the invitation to "${invitation.room.name}".`
      });
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      toast.error('Failed to decline invitation', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const handleCancelInvitation = async (invitation: RoomInvitationWithRelations) => {
    try {
      await cancelInvitation(invitation.id);
      
      // Show success toast
      toast.success('Invitation cancelled', {
        description: `You cancelled the invitation to "${invitation.room.name}".`
      });
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      toast.error('Failed to cancel invitation', {
        description: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const getRoomTypeIcon = (type: string) => {
    return type === 'DIRECT' ? <MessageSquare className="h-4 w-4" /> : <Users className="h-4 w-4" />;
  };

  const InvitationCard = ({ 
    invitation, 
    type 
  }: { 
    invitation: RoomInvitationWithRelations; 
    type: 'received' | 'sent' 
  }) => (
    <Card key={invitation.id} className="hover:bg-accent/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                src={type === 'received' ? invitation.inviter.user_profile : invitation.invitee.user_profile} 
              />
              <AvatarFallback className="text-xs">
                {(type === 'received' ? invitation.inviter.full_name : invitation.invitee.full_name)
                  .substring(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {getRoomTypeIcon(invitation.room.type)}
                <h3 className="font-semibold text-sm truncate">
                  {invitation.room.name}
                </h3>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {type === 'received' 
                  ? `Invited by ${invitation.inviter.full_name}` 
                  : `Invited ${invitation.invitee.full_name}`
                }
              </p>
              
              {invitation.message && (
                <p className="text-xs bg-muted p-2 rounded italic mb-2">
                  "{invitation.message}"
                </p>
              )}
              
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {type === 'received' ? (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAcceptInvitation(invitation)}
                  disabled={isRespondingToInvitation}
                  className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeclineInvitation(invitation)}
                  disabled={isRespondingToInvitation}
                  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleCancelInvitation(invitation)}
                    disabled={isCancellingInvitation}
                    className="text-red-600"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancel Invitation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        
        {respondError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            {respondError.message}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const currentInvitations = selectedTab === 'received' ? receivedInvitations : sentInvitations;
  const isLoading = selectedTab === 'received' ? loadingReceived : loadingSent;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Room Invitations
          </DialogTitle>
          <DialogDescription>
            Manage your room invitations and join new conversations.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setSelectedTab('received')}
            className={cn(
              "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
              selectedTab === 'received'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Received
            {receivedInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {receivedInvitations.length}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setSelectedTab('sent')}
            className={cn(
              "flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors",
              selectedTab === 'sent'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Sent
            {sentInvitations.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {sentInvitations.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : currentInvitations.length > 0 ? (
            <div className="space-y-3">
              {currentInvitations.map((invitation) => (
                <InvitationCard 
                  key={invitation.id} 
                  invitation={invitation} 
                  type={selectedTab} 
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <h3 className="font-medium mb-1">
                No {selectedTab} invitations
              </h3>
              <p className="text-sm">
                {selectedTab === 'received' 
                  ? "You're all caught up! New invitations will appear here."
                  : "You haven't sent any pending invitations yet."
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-4">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvitationNotificationModal;

/**
 * Invitation Bell Icon Component
 * Shows notification count and opens modal
 */
interface InvitationBellProps {
  currentUser?: ChatUser;
  onClick: () => void;
}

export const InvitationBell = ({ currentUser, onClick }: InvitationBellProps) => {
  const { pendingCount, hasPendingInvitations } = useInvitationNotifications(currentUser);
  
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="relative h-9 w-9 p-0"
    >
      <Bell className="h-4 w-4" />
      {hasPendingInvitations && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
        >
          {pendingCount > 9 ? '9+' : pendingCount}
        </Badge>
      )}
    </Button>
  );
};
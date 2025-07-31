"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Check, AtSign, Mail, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatUser, RoomListItem } from "@/types/chat-app";
import { useChatInvitations } from "@/hooks/chat-app/useChatInvitations";
import { Textarea } from "@/components/ui/textarea";

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: ChatUser[];
  currentRoom: RoomListItem;
  currentUser?: ChatUser;
}

const InviteUsersModal = ({
  isOpen,
  onClose,
  users = [],
  currentRoom,
  currentUser,
}: InviteUsersModalProps) => {
  const [inviteMethod, setInviteMethod] = useState<"users">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [inviteMessage, setInviteMessage] = useState("");

  // Use the new invitation system
  const { sendInvitation, isSendingInvitation, sendError } = useChatInvitations(currentUser);

  // Enhanced filtering for Phase 3 with invitation system
  const getFilteredUsers = () => {
    // Ensure users is an array
    if (!Array.isArray(users)) {
      return [];
    }

    const roomMemberIds =
      currentRoom.members?.map((member) => member.user?.id || member.user_id) ||
      [];

    const filtered = users.filter((user) => {
      // Exclude current user
      if (user.id === currentUser?.id) return false;

      // Exclude existing room members
      if (roomMemberIds.includes(user.id)) return false;

      // Apply search filter
      return (
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const handleReset = () => {
    setInviteMethod("users");
    setSearchQuery("");
    setSelectedUsers([]);
    setInviteMessage("");
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleUserToggle = (user: ChatUser) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.find((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleInvite = async () => {
    if (selectedUsers.length === 0) return;

    try {
      // Send invitations to all selected users
      const invitePromises = selectedUsers.map(user => 
        sendInvitation({
          room_id: currentRoom.id,
          invited_user: user.id,
          message: inviteMessage.trim() || undefined
        })
      );

      await Promise.all(invitePromises);
      handleClose();
    } catch (error) {
      console.error("Error inviting users:", error);
      // Error is handled by the hook and displayed in UI
    }
  };

  const canProceed = () => {
    return selectedUsers.length > 0;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPERADMIN":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "ADMIN":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "VIEWER":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="md:max-w-2xl max-w-[90dvw] max-h-[80vh] flex flex-col">
        <DialogHeader className="">
          <DialogTitle className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <span>{currentRoom.name}</span>
          </DialogTitle>
          <DialogDescription>
            Add new members to this group conversation. They will be able to see
            future messages.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Message */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="ml-1">Search Users</Label>
              <div className="relative px-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="ml-1">Invitation Message (Optional)</Label>
              <Textarea
                placeholder="Add a personal message to your invitation..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* User Selection */}
          <div className="flex-1 flex flex-col space-y-4 min-h-0">
            {selectedUsers.length > 0 && (
              <div>
                <Label className="text-sm font-medium">
                  Selected ({selectedUsers.length})
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.id}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {user.full_name}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() => handleUserToggle(user)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-2 p-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelected = selectedUsers.find(
                      (u) => u.id === user.id
                    );
                    return (
                      <Card
                        key={user.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-accent p-3",
                          isSelected && "bg-accent border-primary"
                        )}
                        onClick={() => handleUserToggle(user)}
                      >
                        <CardContent className="px-3 py-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.user_profile || ""} />
                                <AvatarFallback className="text-xs">
                                  {user.full_name
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {user.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  @{user.username}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  getRoleBadgeColor(user.role)
                                )}
                              >
                                {user.role}
                              </Badge>
                              {isSelected && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No users found</p>
                    <p className="text-xs">Try adjusting your search terms</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Error Display */}
        {sendError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              Failed to send invitations: {sendError.message}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!canProceed() || isSendingInvitation}
            className="bg-chart-3 text-white"
          >
            {isSendingInvitation ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Send {selectedUsers.length > 1 ? 'Invitations' : 'Invitation'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUsersModal;
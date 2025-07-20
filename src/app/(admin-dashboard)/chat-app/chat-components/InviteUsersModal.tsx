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
import {
  useRoomInvitations,
  ROOM_INVITATIONS_QUERY_KEYS,
} from "@/hooks/chat-app/useRoomInvitations";
import { useQueryClient } from "@tanstack/react-query";

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteUsers: (inviteData: {
    invitedUsers: ChatUser[];
    inviteUsername?: string;
    inviteEmail?: string;
  }) => void;
  users: ChatUser[];
  currentRoom: RoomListItem;
  currentUserId?: string;
  isLoading?: boolean;
}

const InviteUsersModal = ({
  isOpen,
  onClose,
  onInviteUsers,
  users,
  currentRoom,
  currentUserId,
  isLoading = false,
}: InviteUsersModalProps) => {
  const [inviteMethod, setInviteMethod] = useState<
    "users" | "username" | "email"
  >("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const queryClient = useQueryClient();

  // Fetch pending invitations for this room
  const { data: roomInvitations = [] } = useRoomInvitations(currentRoom.id);

  // Filter users (exclude current user, existing room members, and users with pending invitations)
  const getFilteredUsers = () => {
    // Get room member IDs from currentRoom.members if available
    const roomMemberIds =
      currentRoom.members?.map((member) => member.user?.id || member.user_id) ||
      [];

    // Get pending invitation user IDs from API
    const pendingInvitationUserIds = roomInvitations.map(
      (invitation) => invitation.invited_user
    );

    // Debug logging
    console.log("InviteUsersModal - Filtering users:");
    console.log("- currentRoom.members:", currentRoom.members);
    console.log("- roomMemberIds:", roomMemberIds);
    console.log("- pendingInvitationUserIds:", pendingInvitationUserIds);
    console.log("- total users before filtering:", users.length);

    const filtered = users.filter((user) => {
      // Exclude current user
      if (user.id === currentUserId) return false;

      // Exclude existing room members
      if (roomMemberIds.includes(user.id)) return false;

      // Exclude users with pending invitations
      if (pendingInvitationUserIds.includes(user.id)) return false;

      // Apply search filter
      return (
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    console.log("- filtered users count:", filtered.length);
    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  // Get suggested users for username search
  const getSuggestedUsers = () => {
    // Get room member IDs from currentRoom.members if available
    const roomMemberIds =
      currentRoom.members?.map((member) => member.user?.id || member.user_id) ||
      [];
    const pendingInvitationUserIds = roomInvitations.map(
      (invitation) => invitation.invited_user
    );

    return users
      .filter((user) => {
        // Exclude current user
        if (user.id === currentUserId) return false;

        // Exclude existing room members
        if (roomMemberIds.includes(user.id)) return false;

        // Exclude users with pending invitations
        if (pendingInvitationUserIds.includes(user.id)) return false;

        // Apply username filter
        return user.username
          .toLowerCase()
          .includes(inviteUsername.toLowerCase());
      })
      .slice(0, 5);
  };

  const suggestedUsers = getSuggestedUsers();

  const handleReset = () => {
    setInviteMethod("users");
    setSearchQuery("");
    setInviteUsername("");
    setInviteEmail("");
    setSelectedUsers([]);
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
    const inviteData = {
      invitedUsers: selectedUsers,
      inviteUsername: inviteMethod === "username" ? inviteUsername : undefined,
      inviteEmail: inviteMethod === "email" ? inviteEmail : undefined,
    };

    try {
      await onInviteUsers(inviteData);

      // Invalidate the room invitations cache for immediate UI update
      queryClient.invalidateQueries({
        queryKey: ROOM_INVITATIONS_QUERY_KEYS.invitations(currentRoom.id),
      });

      handleClose();
    } catch (error) {
      console.error("Error inviting users:", error);
      // Don't close modal if there's an error
    }
  };

  const canProceed = () => {
    if (inviteMethod === "users") {
      return selectedUsers.length > 0;
    } else if (inviteMethod === "username") {
      return inviteUsername.trim() !== "";
    } else if (inviteMethod === "email") {
      return inviteEmail.trim() !== "" && inviteEmail.includes("@");
    }
    return false;
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
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
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
          {/* Invite Method Selection */}
          <div className="flex gap-4 w-full items-center ">
            <div className="space-y-2 w-full  px-1">
              <Label className="ml-1">Invite Method</Label>
              <Select
                value={inviteMethod}
                onValueChange={(value: any) => setInviteMethod(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">Select from Users</SelectItem>
                  <SelectItem value="username">Invite by Username</SelectItem>
                  <SelectItem value="email">Invite by Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-full">
              <Label className="ml-1">Search..</Label>
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
          </div>

          {/* Select from Users */}
          {inviteMethod === "users" && (
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
          )}

          {/* Invite by Username */}
          {inviteMethod === "username" && (
            <div className="space-y-4">
              <div className="p-1 space-y-2">
                <Label htmlFor="inviteUsername">Username</Label>
                <div className="relative mt-1">
                  <AtSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inviteUsername"
                    value={inviteUsername}
                    onChange={(e) => setInviteUsername(e.target.value)}
                    placeholder="username"
                    className="pl-10"
                  />
                </div>
              </div>

              {suggestedUsers.length > 0 && inviteUsername && (
                <div className="p-1 space-y-2">
                  <Label className="text-sm font-medium">Suggested Users</Label>
                  <div className="space-y-2 mt-2">
                    {suggestedUsers.map((user) => (
                      <Card
                        key={user.id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => {
                          setSelectedUsers([user]);
                          setInviteUsername(user.username);
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.user_profile || ""} />
                              <AvatarFallback className="text-xs">
                                {user.full_name.substring(0, 2).toUpperCase()}
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
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Invite by Email */}
          {inviteMethod === "email" && (
            <div className="space-y-4">
              <div className="p-1 space-y-2">
                <Label htmlFor="inviteEmail">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="inviteEmail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  An invitation will be sent to this email address
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={!canProceed() || isLoading}
            className="bg-chart-3 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Inviting...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUsersModal;

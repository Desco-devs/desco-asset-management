"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Users, User, Search, X, Check, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { ChatUser, InvitationStatus, RoomListItem, RoomType } from "@/types/chat-app";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (roomData: {
    name: string;
    description?: string;
    type: RoomType;
    invitedUsers: ChatUser[];
    inviteUsername?: string;
  }) => void;
  users: ChatUser[];
  rooms: RoomListItem[];
  currentUserId?: string;
  isInviteMode?: boolean; // New prop to indicate invite-to-existing-room mode
  existingRoomName?: string; // Name of the room we're inviting to
}

const CreateRoomModal = ({
  isOpen,
  onClose,
  onCreateRoom,
  users,
  rooms,
  currentUserId,
  isInviteMode = false,
  existingRoomName = "",
}: CreateRoomModalProps) => {
  const [step, setStep] = useState<"type" | "details" | "invite">(
    isInviteMode ? "invite" : "type"
  );
  const [roomType, setRoomType] = useState<RoomType | null>(null);
  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteMethod, setInviteMethod] = useState<"users" | "username">(
    "users"
  );
  const [inviteUsername, setInviteUsername] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);

  // Get users who have existing direct message conversations or pending invitations with the current user
  const usersWithExistingDirectMessages = useMemo(() => {
    const directRooms = rooms.filter((room) => room.type === RoomType.DIRECT);

    const usersWithDMs = directRooms
      .map((room) => {
        // For direct messages, get the other participant
        if (room.invitation_status === InvitationStatus.PENDING) {
          // If pending, the other user is the one who invited or was invited
          const otherUserId =
            room.invited_by?.id !== currentUserId ? room.invited_by?.id : null;
          return otherUserId;
        } else {
          // If accepted, get the other member from room.members
          const otherMember = room.members?.find(
            (member) => (member.user?.id || member.user_id) !== currentUserId
          );
          const otherUserId = otherMember?.user?.id || otherMember?.user_id;
          return otherUserId;
        }
      })
      .filter(Boolean);

    return usersWithDMs;
  }, [rooms, currentUserId]);

  // Filter users based on room type and existing conversations
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(
      (user) =>
        user.id !== currentUserId &&
        (user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.username.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // For DIRECT rooms, exclude users with existing direct message conversations
    if (roomType === RoomType.DIRECT) {
      filtered = filtered.filter(
        (user) => !usersWithExistingDirectMessages.includes(user.id)
      );
    }

    return filtered;
  }, [users, currentUserId, searchQuery, roomType, usersWithExistingDirectMessages]);

  const suggestedUsers = useMemo(() => {
    let suggested = users.filter(
      (user) =>
        user.id !== currentUserId &&
        user.username.toLowerCase().includes(inviteUsername.toLowerCase())
    );

    // For DIRECT rooms, exclude users with existing direct message conversations
    if (roomType === RoomType.DIRECT) {
      suggested = suggested.filter(
        (user) => !usersWithExistingDirectMessages.includes(user.id)
      );
    }

    return suggested.slice(0, 5);
  }, [users, currentUserId, inviteUsername, roomType, usersWithExistingDirectMessages]);

  const handleReset = () => {
    setStep("type");
    setRoomType(null);
    setRoomName("");
    setRoomDescription("");
    setSearchQuery("");
    setInviteMethod("users");
    setInviteUsername("");
    setSelectedUsers([]);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleTypeSelect = (type: RoomType) => {
    setRoomType(type);
    if (type === RoomType.DIRECT) {
      setStep("invite");
    } else {
      setStep("details");
    }
  };

  const handleNext = () => {
    if (step === "details") {
      setStep("invite");
    }
  };

  const handleBack = () => {
    if (step === "invite") {
      if (roomType === RoomType.DIRECT) {
        setStep("type");
      } else {
        setStep("details");
      }
    } else if (step === "details") {
      setStep("type");
    }
  };

  const handleUserToggle = (user: ChatUser) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.find((u) => u.id === user.id);
      if (isSelected) {
        return prev.filter((u) => u.id !== user.id);
      } else {
        if (roomType === RoomType.DIRECT && prev.length >= 1) {
          return [user];
        }
        return [...prev, user];
      }
    });
  };

  const handleCreate = () => {
    if (!roomType) return;

    const roomData = {
      name:
        roomType === RoomType.DIRECT
          ? selectedUsers[0]?.full_name || "Direct Message"
          : roomName,
      description: roomDescription,
      type: roomType,
      invitedUsers: selectedUsers,
      inviteUsername: inviteMethod === "username" ? inviteUsername : undefined,
    };

    onCreateRoom(roomData);
    handleClose();
  };

  const canProceed = () => {
    if (step === "type") return roomType !== null;
    if (step === "details") return roomName.trim() !== "";
    if (step === "invite") {
      if (inviteMethod === "users") {
        return selectedUsers.length > 0;
      } else if (inviteMethod === "username") {
        return inviteUsername.trim() !== "";
      }
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
      <DialogContent className="md:max-w-2xl max-w-[90dvw] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isInviteMode && "Invite Users to Group"}
            {!isInviteMode && step === "type" && "Create New Room"}
            {!isInviteMode && step === "details" && "Room Details"}
            {!isInviteMode &&
              step === "invite" &&
              (roomType === RoomType.DIRECT ? "Select User" : "Invite Members")}
          </DialogTitle>
          <DialogDescription>
            {isInviteMode && `Add new members to "${existingRoomName}"`}
            {!isInviteMode &&
              step === "type" &&
              "Choose the type of room you want to create"}
            {!isInviteMode &&
              step === "details" &&
              "Enter the room name and description"}
            {!isInviteMode &&
              step === "invite" &&
              (roomType === RoomType.DIRECT
                ? "Select a user to start a direct conversation"
                : "Add members to your new room")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto scroll-none">
          {step === "type" && (
            <div className="space-y-4">
              <Card
                className={cn(
                  "cursor-pointer transition-all hover:border-primary",
                  roomType === RoomType.DIRECT && "border-primary bg-primary/5"
                )}
                onClick={() => handleTypeSelect(RoomType.DIRECT)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                      <User className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Direct Message</h3>
                      <p className="text-sm text-muted-foreground">
                        Private conversation between you and another person
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  "cursor-pointer transition-all hover:border-primary",
                  roomType === RoomType.GROUP && "border-primary bg-primary/5"
                )}
                onClick={() => handleTypeSelect(RoomType.GROUP)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Group Chat</h3>
                      <p className="text-sm text-muted-foreground">
                        Collaborate with multiple team members
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {step === "details" && (
            <div className="space-y-4">
              <div className="p-1 space-y-3">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="mt-1"
                />
              </div>
              <div className="p-1 space-y-3">
                <Label htmlFor="roomDescription">Description (Optional)</Label>
                <Textarea
                  id="roomDescription"
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.target.value)}
                  placeholder="What's this room about?"
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          )}

          {step === "invite" && (
            <div className="space-y-4 h-full flex flex-col">
              {roomType === RoomType.GROUP && (
                <div>
                  <Label>Invite Method</Label>
                  <Select
                    value={inviteMethod}
                    onValueChange={(value: any) => setInviteMethod(value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">Select from Users</SelectItem>
                      <SelectItem value="username">
                        Invite by Username
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {inviteMethod === "users" && (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

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

                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {filteredUsers.map((user) => {
                        const isSelected = selectedUsers.find(
                          (u) => u.id === user.id
                        );
                        return (
                          <Card
                            key={user.id}
                            className={cn(
                              "py-0 cursor-pointer transition-colors hover:bg-accent",
                              isSelected && "bg-accent border-primary"
                            )}
                            onClick={() => handleUserToggle(user)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage
                                      src={user.user_profile || undefined}
                                    />
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
                                <div className="flex flex-row-reverse items-center gap-2">
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
                                    <Check className="h-4 w-4 text-green-400" />
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </>
              )}

              {inviteMethod === "username" && (
                <div className="space-y-4">
                  <div>
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
                    <div>
                      <Label className="text-sm font-medium">
                        Suggested Users
                      </Label>
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
                            <CardContent className="p-2">
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={user.user_profile || undefined} />
                                  <AvatarFallback className="text-xs">
                                    {user.full_name
                                      .substring(0, 2)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {user.full_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  @{user.username}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div>
            {step !== "type" && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {step === "details" ? (
              <Button
                className="text-white bg-chart-3"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Next
              </Button>
            ) : step === "invite" ? (
              <Button
                className="text-white bg-chart-3"
                onClick={handleCreate}
                disabled={!canProceed()}
              >
                {isInviteMode ? "Invite Users" : "Create Room"}
              </Button>
            ) : (
              <Button
                className="text-white bg-chart-3"
                onClick={() =>
                  step === "type" && roomType && handleTypeSelect(roomType)
                }
                disabled={!canProceed()}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateRoomModal;

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RoomListItem, MessageWithRelations, ChatUser } from "@/types/chat-app";

export const ROOMS_QUERY_KEYS = {
  rooms: (userId: string) => ["rooms", userId],
  roomMessages: (roomId: string) => ["room-messages", roomId],
};

interface UseChatAppOptions {
  userId?: string;
  enabled?: boolean;
}

export const useChatApp = ({ userId, enabled = true }: UseChatAppOptions) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [invitationRoom, setInvitationRoom] = useState<RoomListItem | null>(null);
  const queryClient = useQueryClient();

  // Fetch rooms - using existing Phase 1 infrastructure
  const { data: rooms = [], isLoading: isLoadingRooms, error } = useQuery({
    queryKey: ROOMS_QUERY_KEYS.rooms(userId || ""),
    queryFn: async (): Promise<RoomListItem[]> => {
      const response = await fetch(`/api/rooms/getall?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }
      const data = await response.json();
      return data.rooms || [];
    },
    enabled: enabled && !!userId,
  });

  // Fetch users - using existing Phase 1 infrastructure
  const { data: users = [] } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<ChatUser[]> => {
      const response = await fetch("/api/users/getall");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      return data.users || [];
    },
    enabled,
  });

  // Fetch messages for selected room - using existing Phase 1 infrastructure
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ROOMS_QUERY_KEYS.roomMessages(selectedRoom || ""),
    queryFn: async (): Promise<MessageWithRelations[]> => {
      if (!selectedRoom) return [];
      const response = await fetch(`/api/messages/${selectedRoom}`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      return data.messages || [];
    },
    enabled: !!selectedRoom,
  });

  // Create room mutation - using existing Phase 1 infrastructure
  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      const response = await fetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...roomData, ownerId: userId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create room");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEYS.rooms(userId || "") });
    },
    // Prevent multiple concurrent executions
    mutationKey: ['createRoom', userId],
  });

  // Send message mutation - using existing Phase 1 infrastructure
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { roomId: string; content: string }) => {
      const response = await fetch("/api/messages/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...messageData, senderId: userId }),
      });
      if (!response.ok) {
        throw new Error("Failed to send message");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEYS.roomMessages(variables.roomId) });
      queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEYS.rooms(userId || "") });
    },
  });

  // Simplified invitation mutations (placeholders for Phase 1)
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      console.log("Accept invitation:", invitationId);
      // Placeholder - will use existing Phase 1 infrastructure when ready
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEYS.rooms(userId || "") });
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      console.log("Decline invitation:", invitationId);
      // Placeholder - will use existing Phase 1 infrastructure when ready
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ROOMS_QUERY_KEYS.rooms(userId || "") });
    },
  });

  // Get current room
  const currentRoom = selectedRoom ? rooms.find(room => room.id === selectedRoom) : undefined;

  // Handlers
  const handleRoomSelect = useCallback((roomId: string) => {
    setSelectedRoom(roomId);
  }, []);

  const handleCreateRoom = useCallback(async (roomData: any) => {
    return createRoomMutation.mutateAsync(roomData);
  }, [createRoomMutation]);

  const handleSendMessage = useCallback(async (roomId: string, content: string) => {
    return sendMessageMutation.mutateAsync({ roomId, content });
  }, [sendMessageMutation]);

  const handleAcceptInvitation = useCallback(async (invitationId: string) => {
    return acceptInvitationMutation.mutateAsync(invitationId);
  }, [acceptInvitationMutation]);

  const handleDeclineInvitation = useCallback(async (invitationId: string) => {
    return declineInvitationMutation.mutateAsync(invitationId);
  }, [declineInvitationMutation]);

  const loadMoreMessages = useCallback((roomId: string) => {
    // Placeholder for pagination
    console.log("Load more messages for room:", roomId);
  }, []);

  return {
    // State
    selectedRoom,
    invitationRoom,
    messages,
    currentRoom,

    // Data
    rooms,
    users,

    // Loading states
    isLoading: isLoadingRooms,
    isLoadingMessages,
    isLoadingMoreMessages: false,
    hasMoreMessages: false,
    isCreatingRoom: createRoomMutation.isPending,
    isRespondingToInvitation: acceptInvitationMutation.isPending || declineInvitationMutation.isPending,
    isSendingMessage: sendMessageMutation.isPending,

    // Errors
    error,
    createRoomError: createRoomMutation.error,
    invitationResponseError: acceptInvitationMutation.error || declineInvitationMutation.error,

    // Actions
    handleRoomSelect,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleCreateRoom,
    handleSendMessage,
    setInvitationRoom,
    loadMoreMessages,
  };
};
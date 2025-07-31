import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RoomListItem, MessageWithRelations, ChatUser } from "@/types/chat-app";
import { useChatMessages } from './useChatMessages';
import { useChatRealtime } from './useChatRealtime';
import { useChatPresence } from './useChatPresence';
import { useChatTyping } from './useChatTyping';
import { useChatConnection } from './useChatConnection';

export const ROOMS_QUERY_KEYS = {
  rooms: (userId: string) => ["rooms", userId],
  roomMessages: (roomId: string) => ["room-messages", roomId],
};

interface UseChatAppOptions {
  userId?: string;
  currentUser?: any; // Accept the authenticated user directly
  enabled?: boolean;
}

export const useChatApp = ({ userId, currentUser: authUser, enabled = true }: UseChatAppOptions) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [invitationRoom, setInvitationRoom] = useState<RoomListItem | null>(null);
  const queryClient = useQueryClient();
  
  // Convert the authenticated user to ChatUser format
  const currentUser: ChatUser | null = authUser ? {
    id: authUser.id,
    username: authUser.username || authUser.email?.split('@')[0] || 'user',
    email: authUser.email || '',
    full_name: authUser.full_name || authUser.username || 'User',
    user_profile: authUser.user_profile || null,
    user_status: authUser.user_status || 'ACTIVE',
    role: authUser.role || 'VIEWER'
  } : null;
  
  // Initialize real-time features
  const realtimeStatus = useChatRealtime(userId);
  const messageSystem = useChatMessages(currentUser);
  const presenceSystem = useChatPresence(currentUser, selectedRoom || undefined);
  const typingSystem = useChatTyping(currentUser);
  const connectionSystem = useChatConnection(userId);

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

  // Enhanced send message with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { roomId: string; content: string; type?: string; fileUrl?: string; replyToId?: string }) => {
      // Use the new optimistic message system
      return messageSystem.sendMessage({
        roomId: messageData.roomId,
        content: messageData.content,
        type: (messageData.type as any) || 'TEXT',
        fileUrl: messageData.fileUrl,
        replyToId: messageData.replyToId
      });
    },
    // Success and error handling is now managed by useChatMessages
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

  const handleSendMessage = useCallback(async (roomId: string, content: string, options?: { type?: string; fileUrl?: string; replyToId?: string }) => {
    return sendMessageMutation.mutateAsync({ 
      roomId, 
      content,
      type: options?.type,
      fileUrl: options?.fileUrl,
      replyToId: options?.replyToId
    });
  }, [sendMessageMutation]);
  
  // Enhanced typing handler
  const handleTyping = useCallback((roomId: string) => {
    typingSystem.handleTyping(roomId);
  }, [typingSystem]);
  
  // Get typing indicators for current room
  const currentRoomTyping = selectedRoom ? typingSystem.getTypingText(selectedRoom) : '';
  
  // Get presence info for current room
  const currentRoomPresence = selectedRoom ? presenceSystem.usersInCurrentRoom : [];
  
  // Enhanced room selection with presence update
  const handleRoomSelectEnhanced = useCallback((roomId: string) => {
    setSelectedRoom(roomId);
    // Update presence to show user is in this room
    presenceSystem.updatePresence(roomId);
  }, [presenceSystem]);
  
  // Message retry handlers
  const handleRetryMessage = useCallback(async (optimisticId: string) => {
    return messageSystem.manualRetry(optimisticId);
  }, [messageSystem]);
  
  const handleCancelMessage = useCallback((optimisticId: string) => {
    messageSystem.cancelMessage(optimisticId);
  }, [messageSystem]);

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

    // Errors (Enhanced)
    error,
    createRoomError: createRoomMutation.error,
    invitationResponseError: acceptInvitationMutation.error || declineInvitationMutation.error,
    messageError: messageSystem.sendError,
    connectionError: connectionSystem.hasError,

    // Actions (Enhanced)
    handleRoomSelect: handleRoomSelectEnhanced,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleCreateRoom,
    handleSendMessage,
    handleTyping,
    handleRetryMessage,
    handleCancelMessage,
    setInvitationRoom,
    loadMoreMessages,
    
    // Real-time features
    realtimeStatus,
    connectionStatus: connectionSystem,
    presenceSystem,
    typingSystem,
    messageSystem,
    
    // Enhanced UI data
    currentRoomTyping,
    currentRoomPresence,
    onlineUsers: presenceSystem.onlineUsers,
    
    // Connection info
    isRealtimeConnected: realtimeStatus.isListening && connectionSystem.isConnected,
    connectionQuality: connectionSystem.connectionQuality,
  };
};
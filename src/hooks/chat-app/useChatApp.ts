import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RoomListItem, MessageWithRelations, ChatUser } from "@/types/chat-app";
import { useChatMessages } from './useChatMessages';
import { useChatRealtime } from './useChatRealtime';
import { useChatPresence } from './useChatPresence';
import { useChatTyping } from './useChatTyping';
import { useChatConnection } from './useChatConnection';
import { useRoomMembershipRealtime } from './useRoomMembershipRealtime';
import { useRoomListRealtime } from './useRoomListRealtime';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { useDataSynchronization } from './useDataSynchronization';
import { CHAT_QUERY_KEYS, ROOMS_QUERY_KEYS } from './queryKeys';

interface UseChatAppOptions {
  userId?: string;
  currentUser?: any; // Accept the authenticated user directly
  enabled?: boolean;
}

export const useChatApp = ({ userId, currentUser: authUser, enabled = true }: UseChatAppOptions) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [invitationRoom, setInvitationRoom] = useState<RoomListItem | null>(null);
  const queryClient = useQueryClient();
  
  // Enhanced error handling and memory management
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);
  const cleanupTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isUnmountedRef = useRef(false);
  
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
  
  // Initialize enhanced systems
  const optimisticUpdates = useOptimisticUpdates(currentUser || undefined);
  const dataSync = useDataSynchronization(currentUser || undefined);
  
  // Initialize real-time features
  const realtimeStatus = useChatRealtime(userId);
  const messageSystem = useChatMessages(currentUser || undefined);
  const presenceSystem = useChatPresence(currentUser || undefined, selectedRoom || undefined);
  const typingSystem = useChatTyping(currentUser || undefined);
  const connectionSystem = useChatConnection(userId);
  
  // Initialize room membership real-time updates
  useRoomMembershipRealtime(currentUser || undefined);
  
  // Initialize room list real-time updates for instant sidebar updates
  useRoomListRealtime(currentUser || undefined);

  // Fetch rooms with optimized caching strategy
  const { data: rooms = [], isLoading: isLoadingRooms, error } = useQuery({
    queryKey: CHAT_QUERY_KEYS.rooms(userId || ""),
    queryFn: async (): Promise<RoomListItem[]> => {
      const response = await fetch(`/api/rooms/getall?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }
      const data = await response.json();
      return data.rooms || [];
    },
    enabled: enabled && !!userId,
    staleTime: 30000, // 30 seconds - rooms don't change frequently
    gcTime: 300000, // 5 minutes cache time
    refetchOnWindowFocus: false, // Real-time handles updates
    refetchOnMount: false, // Use cached data if available
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Fetch users with optimized caching - users don't change often
  const { data: users = [] } = useQuery({
    queryKey: CHAT_QUERY_KEYS.users(),
    queryFn: async (): Promise<ChatUser[]> => {
      const response = await fetch("/api/users/getall");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      return data.users || [];
    },
    enabled,
    staleTime: 300000, // 5 minutes - users change infrequently
    gcTime: 900000, // 15 minutes cache time
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  // Fetch messages for selected room with smart caching
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: CHAT_QUERY_KEYS.roomMessages(selectedRoom || ""),
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
    staleTime: 10000, // 10 seconds - messages can change frequently
    gcTime: 60000, // 1 minute cache time for messages
    refetchOnWindowFocus: false, // Real-time handles new messages
    refetchOnMount: false, // Use cached data
    retry: 2,
    retryDelay: 1000,
    placeholderData: [], // Prevent loading state flicker when switching rooms
  });

  // Create room mutation with optimistic updates
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
    onMutate: async (roomData) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: CHAT_QUERY_KEYS.rooms(userId || "") });

      // Snapshot the previous value for rollback
      const previousRooms = queryClient.getQueryData(CHAT_QUERY_KEYS.rooms(userId || ""));

      // Create optimistic room with unique temporary ID
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      
      const optimisticRoom: RoomListItem = {
        id: tempId, // Guaranteed unique temporary ID
        name: roomData.name,
        description: roomData.description || '',
        type: roomData.type,
        owner_id: userId || '',
        created_at: now,
        updated_at: now,
        members: [{
          user_id: userId || '',
          user: currentUser || undefined
        }],
        lastMessage: undefined,
        unread_count: 0,
        is_owner: true,
        member_count: 1,
        // Add metadata to distinguish from real rooms
        _isOptimistic: true,
        _tempId: tempId
      } as any;

      // Optimistically update the cache with conflict prevention
      queryClient.setQueryData(CHAT_QUERY_KEYS.rooms(userId || ""), (old: RoomListItem[] = []) => {
        // Filter out any existing optimistic rooms with same name to prevent duplicates
        const filtered = old.filter(room => 
          !(room as any)._isOptimistic || room.name !== roomData.name
        );
        
        // Add new optimistic room at the top and sort
        const updated = [optimisticRoom, ...filtered];
        return updated.sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || new Date()).getTime();
          const bTime = new Date(b.updated_at || b.created_at || new Date()).getTime();
          return bTime - aTime; // Most recent first
        });
      });

      // Return context with previous value and temp ID
      return { previousRooms, optimisticRoom, tempId };
    },
    onError: (err, roomData, context) => {
      console.error('[CreateRoom] Optimistic update failed:', err);
      
      // Rollback on error with proper cleanup
      if (context?.previousRooms) {
        queryClient.setQueryData(CHAT_QUERY_KEYS.rooms(userId || ""), context.previousRooms);
      } else {
        // Fallback: remove optimistic room if we don't have previous state
        if (context?.tempId) {
          queryClient.setQueryData(CHAT_QUERY_KEYS.rooms(userId || ""), (old: RoomListItem[] = []) => {
            return old.filter(room => room.id !== context.tempId);
          });
        }
      }
    },
    onSuccess: (data, variables, context) => {
      // Replace optimistic room with real room data immediately
      queryClient.setQueryData(CHAT_QUERY_KEYS.rooms(userId || ""), (old: RoomListItem[] = []) => {
        return old.map(room => {
          // Find optimistic room by temp ID or regular ID
          if (room.id === context?.tempId || room.id === context?.optimisticRoom?.id) {
            // Replace with real room data, preserving optimistic timestamp if close
            return {
              ...data.room,
              // Keep optimistic created_at if it's within 2 seconds to prevent timestamp flicker
              created_at: context?.optimisticRoom?.created_at && 
                Math.abs(new Date(context.optimisticRoom.created_at).getTime() - new Date(data.room.created_at).getTime()) < 2000
                ? context.optimisticRoom.created_at 
                : data.room.created_at,
              updated_at: data.room.updated_at,
              // Remove optimistic flags
              _isOptimistic: undefined,
              _tempId: undefined
            };
          }
          return room;
        });
      });
      
      // Auto-select the newly created room
      if (data.room?.id) {
        setSelectedRoom(data.room.id);
      }
    },
    onSettled: (data, error, variables, context) => {
      // Clean up any remaining optimistic rooms in case of edge cases
      queryClient.setQueryData(CHAT_QUERY_KEYS.rooms(userId || ""), (old: RoomListItem[] = []) => {
        return old.filter(room => !(room as any)._isOptimistic);
      });
      
      // Don't invalidate queries to prevent conflicts with real-time updates
      // Real-time subscriptions will handle room list updates
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

  // Real invitation mutations using the actual API
  const acceptInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/rooms/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to accept invitation');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Invitation accepted successfully:', data);
      
      // Use a small delay to allow real-time updates to process first
      setTimeout(() => {
        // Only invalidate if real-time hasn't updated the cache yet
        const currentRooms = queryClient.getQueryData(CHAT_QUERY_KEYS.rooms(userId || "")) as RoomListItem[] || [];
        const roomExists = data.invitation?.room_id && currentRooms.some(room => room.id === data.invitation.room_id);
        
        if (!roomExists) {
          // Force refresh only if room doesn't exist in cache
          queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.rooms(userId || "") });
        }
        
        // Always invalidate invitation queries as they should be removed
        queryClient.invalidateQueries({ 
          queryKey: CHAT_QUERY_KEYS.invitations(userId || '', 'received', 'PENDING') 
        });
      }, 100); // Small delay to let real-time process
      
      // Auto-select the joined room immediately
      if (data.invitation?.room_id) {
        console.log('🎯 Auto-selecting joined room:', data.invitation.room_id);
        setSelectedRoom(data.invitation.room_id);
      }
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await fetch(`/api/rooms/invitations/${invitationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DECLINED' })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to decline invitation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Just invalidate invitation queries for declined invitations
      queryClient.invalidateQueries({ 
        queryKey: CHAT_QUERY_KEYS.invitations(userId || '', 'received', 'PENDING') 
      });
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

  // Enhanced error handling
  const handleError = useCallback((error: Error, context: string) => {
    console.error(`[ChatApp] ${context}:`, error);
    setLastError(error);
    
    // Reset error after 10 seconds
    const timeout = setTimeout(() => {
      if (!isUnmountedRef.current) {
        setLastError(null);
      }
    }, 10000);
    
    cleanupTimeoutsRef.current.push(timeout);
  }, []);

  // Memory management and cleanup
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      
      // Clear all timeouts
      cleanupTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      cleanupTimeoutsRef.current = [];
      
      // Cleanup systems
      messageSystem.cleanup?.();
      optimisticUpdates.cleanup?.();
      dataSync.cleanup?.();
      
      // Clear any stale query data for memory management
      if (selectedRoom) {
        queryClient.removeQueries({ 
          queryKey: CHAT_QUERY_KEYS.roomMessages(selectedRoom),
          exact: false 
        });
      }
    };
  }, [selectedRoom, messageSystem, optimisticUpdates, dataSync, queryClient]);

  // Connection retry logic
  useEffect(() => {
    if (connectionSystem.hasError && connectionAttempts < 3) {
      const timeout = setTimeout(() => {
        if (!isUnmountedRef.current) {
          setConnectionAttempts(prev => prev + 1);
          // Trigger reconnection attempt
          connectionSystem.reconnect?.();
        }
      }, Math.pow(2, connectionAttempts) * 1000); // Exponential backoff
      
      cleanupTimeoutsRef.current.push(timeout);
    }
  }, [connectionSystem.hasError, connectionAttempts, connectionSystem]);

  // Reset connection attempts on successful connection
  useEffect(() => {
    if (connectionSystem.isConnected && connectionAttempts > 0) {
      setConnectionAttempts(0);
    }
  }, [connectionSystem.isConnected, connectionAttempts]);

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
    lastError,
    createRoomError: createRoomMutation.error,
    invitationResponseError: acceptInvitationMutation.error || declineInvitationMutation.error,
    messageError: messageSystem.sendError,
    connectionError: connectionSystem.hasError,
    connectionAttempts,

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
    
    // Enhanced systems
    optimisticUpdates,
    dataSync,
    
    // Enhanced UI data
    currentRoomTyping,
    currentRoomPresence,
    onlineUsers: presenceSystem.onlineUsers,
    
    // Connection info
    isRealtimeConnected: realtimeStatus.isListening && connectionSystem.isConnected,
    connectionQuality: connectionSystem.connectionQuality,
  };
};
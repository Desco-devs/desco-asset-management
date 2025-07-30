/**
 * Chat Cache Management Hook
 * 
 * Provides centralized cache invalidation and management for chat-related queries
 * Integrates with real-time events to ensure data consistency across the application
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RoomListItem, MessageWithRelations } from '@/types/chat-app';

// Query key constants - centralized for consistency
export const CHAT_QUERY_KEYS = {
  rooms: (userId: string) => ['rooms', userId] as const,
  roomMessages: (roomId: string, limit?: number, offset?: number) => 
    ['room-messages', roomId, limit, offset] as const,
  roomInvitations: (roomId: string) => ['room-invitations', roomId] as const,
  allRoomInvitations: () => ['room-invitations'] as const,
  users: () => ['users'] as const,
  userPresence: (userId: string) => ['user-presence', userId] as const,
  roomPresence: (roomId: string) => ['room-presence', roomId] as const,
  globalPresence: () => ['global-presence'] as const,
} as const;

interface CacheInvalidationOptions {
  /**
   * Whether to refetch immediately after invalidation
   */
  refetch?: boolean;
  
  /**
   * Whether to update cache data directly instead of invalidating
   */
  updateDirect?: boolean;
  
  /**
   * Stale time override for refetched queries
   */
  staleTime?: number;
}

export const useChatCacheManager = (userId?: string) => {
  const queryClient = useQueryClient();

  // Room cache management
  const invalidateRooms = useCallback(async (options: CacheInvalidationOptions = {}) => {
    if (!userId) return;

    const queryKey = CHAT_QUERY_KEYS.rooms(userId);
    
    if (options.refetch) {
      await queryClient.refetchQueries({ queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [userId, queryClient]);

  const updateRoomInCache = useCallback((roomUpdate: Partial<RoomListItem> & { id: string }) => {
    if (!userId) return;

    queryClient.setQueryData<RoomListItem[]>(
      CHAT_QUERY_KEYS.rooms(userId),
      (oldRooms = []) => 
        oldRooms.map(room => 
          room.id === roomUpdate.id 
            ? { ...room, ...roomUpdate, updated_at: new Date() }
            : room
        ).sort((a, b) => (b.updated_at?.getTime() || 0) - (a.updated_at?.getTime() || 0))
    );
  }, [userId, queryClient]);

  const addRoomToCache = useCallback((newRoom: RoomListItem) => {
    if (!userId) return;

    queryClient.setQueryData<RoomListItem[]>(
      CHAT_QUERY_KEYS.rooms(userId),
      (oldRooms = []) => {
        // Check if room already exists
        const exists = oldRooms.some(r => r.id === newRoom.id);
        if (exists) return oldRooms;
        
        // Add room and sort by updated_at
        const newRooms = [newRoom, ...oldRooms];
        return newRooms.sort((a, b) => (b.updated_at?.getTime() || 0) - (a.updated_at?.getTime() || 0));
      }
    );
  }, [userId, queryClient]);

  const removeRoomFromCache = useCallback((roomId: string) => {
    if (!userId) return;

    queryClient.setQueryData<RoomListItem[]>(
      CHAT_QUERY_KEYS.rooms(userId),
      (oldRooms = []) => oldRooms.filter(room => room.id !== roomId)
    );

    // Also invalidate related queries
    queryClient.invalidateQueries({
      queryKey: CHAT_QUERY_KEYS.roomMessages(roomId),
    });
    queryClient.invalidateQueries({
      queryKey: CHAT_QUERY_KEYS.roomInvitations(roomId),
    });
    queryClient.invalidateQueries({
      queryKey: CHAT_QUERY_KEYS.roomPresence(roomId),
    });
  }, [userId, queryClient]);

  // Message cache management
  const invalidateRoomMessages = useCallback(async (roomId: string, options: CacheInvalidationOptions = {}) => {
    const queryKey = CHAT_QUERY_KEYS.roomMessages(roomId);
    
    if (options.refetch) {
      await queryClient.refetchQueries({ queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient]);

  const addMessageToCache = useCallback((roomId: string, newMessage: MessageWithRelations) => {
    // Update all message queries for this room
    queryClient.setQueriesData(
      { queryKey: ['room-messages', roomId] },
      (oldData: any) => {
        if (!oldData?.messages) return oldData;
        
        // Check if message already exists to avoid duplicates
        const exists = oldData.messages.some((m: MessageWithRelations) => m.id === newMessage.id);
        if (exists) return oldData;
        
        return {
          ...oldData,
          messages: [newMessage, ...oldData.messages],
        };
      }
    );

    // Update room's last message in rooms cache
    if (userId) {
      queryClient.setQueryData<RoomListItem[]>(
        CHAT_QUERY_KEYS.rooms(userId),
        (oldRooms = []) => 
          oldRooms.map(room => 
            room.id === roomId 
              ? { 
                  ...room, 
                  lastMessage: {
                    content: newMessage.content,
                    sender_name: newMessage.sender?.full_name || 'Unknown',
                    created_at: newMessage.created_at,
                    type: newMessage.type,
                  },
                  updated_at: new Date(),
                }
              : room
          ).sort((a, b) => (b.updated_at?.getTime() || 0) - (a.updated_at?.getTime() || 0))
      );
    }
  }, [userId, queryClient]);

  // Invitation cache management
  const invalidateRoomInvitations = useCallback(async (roomId?: string, options: CacheInvalidationOptions = {}) => {
    const queryKey = roomId 
      ? CHAT_QUERY_KEYS.roomInvitations(roomId)
      : CHAT_QUERY_KEYS.allRoomInvitations();
    
    if (options.refetch) {
      await queryClient.refetchQueries({ queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient]);

  // Presence cache management
  const invalidatePresence = useCallback(async (roomId?: string, options: CacheInvalidationOptions = {}) => {
    const queryKey = roomId 
      ? CHAT_QUERY_KEYS.roomPresence(roomId)
      : CHAT_QUERY_KEYS.globalPresence();
    
    if (options.refetch) {
      await queryClient.refetchQueries({ queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient]);

  const updateUserPresence = useCallback((userId: string, isOnline: boolean) => {
    // Update global presence
    queryClient.setQueryData(
      CHAT_QUERY_KEYS.globalPresence(),
      (oldData: Record<string, boolean> = {}) => ({
        ...oldData,
        [userId]: isOnline,
      })
    );

    // Update user-specific presence
    queryClient.setQueryData(
      CHAT_QUERY_KEYS.userPresence(userId),
      isOnline
    );
  }, [queryClient]);

  // User cache management
  const invalidateUsers = useCallback(async (options: CacheInvalidationOptions = {}) => {
    const queryKey = CHAT_QUERY_KEYS.users();
    
    if (options.refetch) {
      await queryClient.refetchQueries({ queryKey });
    } else {
      queryClient.invalidateQueries({ queryKey });
    }
  }, [queryClient]);

  // Comprehensive cache refresh for real-time events
  const handleRoomEvent = useCallback(async (
    eventType: 'created' | 'updated' | 'deleted' | 'member_joined' | 'member_left',
    roomId: string,
    roomData?: Partial<RoomListItem>
  ) => {
    console.log(`[CacheManager] Handling room event: ${eventType} for room ${roomId}`);

    switch (eventType) {
      case 'created':
        if (roomData) {
          addRoomToCache(roomData as RoomListItem);
        }
        await invalidateRooms({ refetch: false });
        break;

      case 'updated':
        if (roomData) {
          updateRoomInCache({ id: roomId, ...roomData });
        }
        break;

      case 'deleted':
        removeRoomFromCache(roomId);
        break;

      case 'member_joined':
      case 'member_left':
        await invalidateRooms({ refetch: false });
        await invalidateRoomInvitations(roomId);
        await invalidatePresence(roomId);
        break;
    }
  }, [addRoomToCache, updateRoomInCache, removeRoomFromCache, invalidateRooms, invalidateRoomInvitations, invalidatePresence]);

  const handleMessageEvent = useCallback(async (
    eventType: 'created' | 'updated' | 'deleted',
    roomId: string,
    messageData?: MessageWithRelations
  ) => {
    console.log(`[CacheManager] Handling message event: ${eventType} for room ${roomId}`);

    switch (eventType) {
      case 'created':
        if (messageData) {
          addMessageToCache(roomId, messageData);
        }
        break;

      case 'updated':
      case 'deleted':
        await invalidateRoomMessages(roomId, { refetch: false });
        break;
    }
  }, [addMessageToCache, invalidateRoomMessages]);

  const handleInvitationEvent = useCallback(async (
    eventType: 'created' | 'updated' | 'deleted',
    roomId: string,
    invitationData?: any
  ) => {
    console.log(`[CacheManager] Handling invitation event: ${eventType} for room ${roomId}`);

    await invalidateRoomInvitations(roomId, { refetch: false });
    
    // If invitation was accepted, refresh rooms to show the new room
    if (eventType === 'updated' && invitationData?.status === 'ACCEPTED') {
      await invalidateRooms({ refetch: true });
    }
  }, [invalidateRoomInvitations, invalidateRooms]);

  // Cleanup function for when user changes or component unmounts
  const clearUserCache = useCallback(() => {
    if (!userId) return;

    queryClient.removeQueries({
      queryKey: CHAT_QUERY_KEYS.rooms(userId),
    });
    
    queryClient.removeQueries({
      queryKey: CHAT_QUERY_KEYS.userPresence(userId),
    });
  }, [userId, queryClient]);

  return {
    // Query keys for external use
    queryKeys: CHAT_QUERY_KEYS,
    
    // Room cache management
    invalidateRooms,
    updateRoomInCache,
    addRoomToCache,
    removeRoomFromCache,
    
    // Message cache management
    invalidateRoomMessages,
    addMessageToCache,
    
    // Invitation cache management
    invalidateRoomInvitations,
    
    // Presence cache management
    invalidatePresence,
    updateUserPresence,
    
    // User cache management
    invalidateUsers,
    
    // Event handlers for real-time integration
    handleRoomEvent,
    handleMessageEvent,
    handleInvitationEvent,
    
    // Cleanup
    clearUserCache,
    
    // Direct access to query client for advanced operations
    queryClient,
  };
};

export default useChatCacheManager;
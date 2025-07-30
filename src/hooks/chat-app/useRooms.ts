import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RoomListItem } from '@/types/chat-app';
import { useSupabaseRooms } from './useSupabaseRooms';
import { useCallback, useEffect } from 'react';
import { useChatCacheManager, CHAT_QUERY_KEYS } from './useChatCacheManager';

interface UseRoomsOptions {
  userId?: string;
  enabled?: boolean;
}

export const useRooms = ({ userId, enabled = true }: UseRoomsOptions) => {
  const queryClient = useQueryClient();
  
  // Use the centralized cache manager
  const cacheManager = useChatCacheManager(userId);

  // Enhanced real-time room handlers with cache integration
  const handleRoomAddedWithCache = useCallback((room: RoomListItem) => {
    if (!userId) return;
    
    console.log('[useRooms] Room added:', room.name);
    cacheManager.addRoomToCache(room);
    
    // Trigger room event handler for additional processing
    cacheManager.handleRoomEvent('created', room.id, room);
  }, [userId, cacheManager]);

  const handleRoomUpdatedWithCache = useCallback((roomUpdate: Partial<RoomListItem> & { id: string }) => {
    if (!userId) return;

    console.log('[useRooms] Room updated:', roomUpdate.id);
    cacheManager.updateRoomInCache(roomUpdate);
    
    // Trigger room event handler for additional processing
    cacheManager.handleRoomEvent('updated', roomUpdate.id, roomUpdate);
  }, [userId, cacheManager]);

  const handleRoomDeletedWithCache = useCallback((roomId: string) => {
    if (!userId) return;

    console.log('[useRooms] Room deleted:', roomId);
    cacheManager.removeRoomFromCache(roomId);
    
    // Trigger room event handler for additional processing
    cacheManager.handleRoomEvent('deleted', roomId);
  }, [userId, cacheManager]);

  const handleMembershipChangedWithCache = useCallback((roomId: string, memberCount: number) => {
    if (!userId) return;

    console.log('[useRooms] Membership changed:', roomId, memberCount);
    cacheManager.updateRoomInCache({ id: roomId, member_count: memberCount });
    
    // Trigger room event handler for additional processing
    cacheManager.handleRoomEvent('member_joined', roomId, { member_count: memberCount });
  }, [userId, cacheManager]);

  const handleUnreadCountUpdatedWithCache = useCallback((roomId: string, unreadCount: number) => {
    if (!userId) return;

    console.log('[useRooms] Unread count updated:', roomId, unreadCount);
    cacheManager.updateRoomInCache({ id: roomId, unread_count: unreadCount });
  }, [userId, cacheManager]);

  // Use the real-time Supabase rooms hook with enhanced handlers
  const {
    rooms,
    loading,
    error,
    markRoomAsRead,
    refetch,
    roomStates,
    broadcastRoomUpdate,
    isRealtimeConnected,
  } = useSupabaseRooms({ 
    userId, 
    enabled,
    // Pass cache-integrated handlers
    onRoomAdded: handleRoomAddedWithCache,
    onRoomUpdated: handleRoomUpdatedWithCache,
    onRoomDeleted: handleRoomDeletedWithCache,
    onMembershipChanged: handleMembershipChangedWithCache,
    onUnreadCountUpdated: handleUnreadCountUpdatedWithCache,
  });

  // Sync rooms data with TanStack Query cache whenever it changes
  useEffect(() => {
    if (!userId || !rooms) return;

    queryClient.setQueryData<RoomListItem[]>(
      CHAT_QUERY_KEYS.rooms(userId),
      rooms
    );
  }, [rooms, userId, queryClient]);

  // Enhanced mark room as read with cache update
  const markRoomAsReadWithCache = useCallback(async (roomId: string) => {
    if (!userId) return;

    console.log('[useRooms] Marking room as read:', roomId);
    
    // Update cache immediately for optimistic UI
    cacheManager.updateRoomInCache({ id: roomId, unread_count: 0 });

    // Call the actual API
    await markRoomAsRead(roomId);
  }, [userId, markRoomAsRead, cacheManager]);

  // Return in TanStack Query format for compatibility with enhanced real-time features
  return {
    data: rooms,
    isLoading: loading,
    error,
    refetch,
    isSuccess: !loading && !error,
    isFetching: loading,
    // Enhanced real-time features with cache integration
    markRoomAsRead: markRoomAsReadWithCache,
    roomStates,
    broadcastRoomUpdate,
    isRealtimeConnected,
    // Cache manipulation utilities - now powered by centralized cache manager
    queryClient,
    cacheManager,
    cacheUtils: {
      addRoomToCache: handleRoomAddedWithCache,
      updateRoomInCache: handleRoomUpdatedWithCache,
      removeRoomFromCache: handleRoomDeletedWithCache,
      updateMembershipInCache: handleMembershipChangedWithCache,
      updateUnreadCountInCache: handleUnreadCountUpdatedWithCache,
    },
  };
};

// interface UseRoomMessagesOptions {
//   roomId?: string;
//   userId?: string;
//   enabled?: boolean;
//   limit?: number;
//   offset?: number;
// }

// useRoomMessages removed - messages now handled directly in useChatApp via Socket.io
// export const useRoomMessages = ({ 
//   roomId, 
//   userId, 
//   enabled = true, 
//   limit = 50, 
//   offset = 0 
// }: UseRoomMessagesOptions) => {
//   return useQuery({
//     queryKey: QUERY_KEYS.roomMessages(roomId || '', limit, offset),
//     queryFn: async (): Promise<MessageWithRelations[]> => {
//       if (!roomId || !userId) {
//         throw new Error('Room ID and User ID are required');
//       }
//
//       console.log('Fetching messages for room:', roomId); // Debug log
//       const response = await fetch(`/api/messages/${roomId}?userId=${userId}&limit=${limit}&offset=${offset}`);
//       if (!response.ok) {
//         throw new Error('Failed to fetch messages');
//       }
//
//       const data = await response.json();
//       return data.messages || [];
//     },
//     enabled: enabled && !!roomId && !!userId,
//     staleTime: 1000 * 60 * 2, // 2 minutes - will be replaced by Supabase realtime
//     refetchOnWindowFocus: true,
//     refetchInterval: 1000 * 15, // 15 seconds polling until Supabase realtime is implemented
//   });
// };

// Hook to invalidate rooms query when data changes
export const useInvalidateRooms = () => {
  const queryClient = useQueryClient();

  return {
    invalidateRooms: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: CHAT_QUERY_KEYS.rooms(userId),
      });
    },

    invalidateRoomMessages: (roomId: string) => {
      queryClient.invalidateQueries({
        queryKey: CHAT_QUERY_KEYS.roomMessages(roomId),
      });
    },

    // Update specific room in cache
    updateRoomInCache: (userId: string, updatedRoom: RoomListItem) => {
      queryClient.setQueryData<RoomListItem[]>(
        CHAT_QUERY_KEYS.rooms(userId),
        (oldRooms = []) => {
          return oldRooms.map(room =>
            room.id === updatedRoom.id ? updatedRoom : room
          );
        }
      );
    },

    // Add new room to cache
    addRoomToCache: (userId: string, newRoom: RoomListItem) => {
      queryClient.setQueryData<RoomListItem[]>(
        CHAT_QUERY_KEYS.rooms(userId),
        (oldRooms = []) => [newRoom, ...oldRooms]
      );
    },

    // Remove room from cache
    removeRoomFromCache: (userId: string, roomId: string) => {
      queryClient.setQueryData<RoomListItem[]>(
        CHAT_QUERY_KEYS.rooms(userId),
        (oldRooms = []) => oldRooms.filter(room => room.id !== roomId)
      );
    },
  };
};

export { CHAT_QUERY_KEYS as ROOMS_QUERY_KEYS };
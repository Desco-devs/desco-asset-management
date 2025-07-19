import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageWithRelations, RoomListItem } from '@/types/chat-app';

const QUERY_KEYS = {
  rooms: (userId: string) => ['rooms', userId],
  roomMessages: (roomId: string) => ['room-messages', roomId],
} as const;

interface UseRoomsOptions {
  userId?: string;
  enabled?: boolean;
}

export const useRooms = ({ userId, enabled = true }: UseRoomsOptions) => {
  return useQuery({
    queryKey: QUERY_KEYS.rooms(userId || ''),
    queryFn: async (): Promise<RoomListItem[]> => {
      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log('Fetching rooms for user:', userId); // Debug log to see when updates happen
      const response = await fetch(`/api/rooms/getall?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch rooms');
      }

      return response.json();
    },
    enabled: enabled && !!userId,
    staleTime: 1000 * 30, // 30 seconds - shorter for faster updates
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 3, // 3 seconds polling for near real-time updates
  });
};

interface UseRoomMessagesOptions {
  roomId?: string;
  userId?: string;
  enabled?: boolean;
}

export const useRoomMessages = ({ roomId, userId, enabled = true }: UseRoomMessagesOptions) => {
  return useQuery({
    queryKey: QUERY_KEYS.roomMessages(roomId || ''),
    queryFn: async (): Promise<MessageWithRelations[]> => {
      if (!roomId || !userId) {
        throw new Error('Room ID and User ID are required');
      }

      console.log('Fetching messages for room:', roomId); // Debug log
      const response = await fetch(`/api/messages/${roomId}?userId=${userId}&limit=50`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      return data.messages || [];
    },
    enabled: enabled && !!roomId && !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes - shorter for message updates
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 5, // 5 seconds polling for messages
  });
};

// Hook to invalidate rooms query when data changes
export const useInvalidateRooms = () => {
  const queryClient = useQueryClient();

  return {
    invalidateRooms: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.rooms(userId),
      });
    },

    invalidateRoomMessages: (roomId: string) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.roomMessages(roomId),
      });
    },

    // Update specific room in cache
    updateRoomInCache: (userId: string, updatedRoom: RoomListItem) => {
      queryClient.setQueryData<RoomListItem[]>(
        QUERY_KEYS.rooms(userId),
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
        QUERY_KEYS.rooms(userId),
        (oldRooms = []) => [newRoom, ...oldRooms]
      );
    },

    // Remove room from cache
    removeRoomFromCache: (userId: string, roomId: string) => {
      queryClient.setQueryData<RoomListItem[]>(
        QUERY_KEYS.rooms(userId),
        (oldRooms = []) => oldRooms.filter(room => room.id !== roomId)
      );
    },
  };
};

export { QUERY_KEYS as ROOMS_QUERY_KEYS };
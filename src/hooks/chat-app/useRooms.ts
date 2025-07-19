import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageWithRelations, RoomListItem } from '@/types/chat-app';

const QUERY_KEYS = {
  rooms: (userId: string) => ['rooms', userId],
  roomMessages: (roomId: string, limit?: number, offset?: number) => ['room-messages', roomId, limit, offset],
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
    staleTime: 1000 * 60 * 5, // 5 minutes - longer since we have Socket.io for real-time updates
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 30, // 30 seconds polling as fallback for Socket.io
  });
};

interface UseRoomMessagesOptions {
  roomId?: string;
  userId?: string;
  enabled?: boolean;
  limit?: number;
  offset?: number;
}

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
//     staleTime: 1000 * 60 * 5, // 5 minutes - longer since we have Socket.io for real-time updates
//     refetchOnWindowFocus: true,
//     refetchInterval: 1000 * 15, // 15 seconds polling as fallback for Socket.io
//   });
// };

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
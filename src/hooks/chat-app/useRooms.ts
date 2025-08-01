import { useQuery } from "@tanstack/react-query";
import { RoomListItem, ChatUser } from "@/types/chat-app";
import { CHAT_QUERY_KEYS } from './queryKeys';
import { useDataSynchronization } from './useDataSynchronization';

/**
 * Optimized Rooms Hook
 * 
 * Features:
 * - Smart caching with conflict prevention
 * - Optimized for real-time updates
 * - Memory efficient
 * - Proper error handling
 */
export const useRooms = (userId?: string, currentUser?: ChatUser) => {
  const dataSync = useDataSynchronization(currentUser);
  
  return useQuery({
    queryKey: CHAT_QUERY_KEYS.rooms(userId || ""),
    queryFn: async (): Promise<RoomListItem[]> => {
      const response = await fetch(`/api/rooms/getall?userId=${userId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch rooms");
      }
      const data = await response.json();
      return data.rooms || [];
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds - rooms don't change frequently
    gcTime: 300000, // 5 minutes cache time
    refetchOnWindowFocus: false, // Real-time handles updates
    refetchOnMount: false, // Use cached data if available
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    select: (data: RoomListItem[]) => {
      // Sort rooms by updated_at for consistent ordering
      return data.sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || new Date()).getTime();
        const bTime = new Date(b.updated_at || b.created_at || new Date()).getTime();
        return bTime - aTime; // Most recent first
      });
    },
    meta: {
      // Metadata for debugging and monitoring
      component: 'useRooms',
      userId
    }
  });
};
import { useQuery } from "@tanstack/react-query";
import { RoomListItem } from "@/types/chat-app";

export const ROOMS_QUERY_KEYS = {
  rooms: (userId: string) => ["rooms", userId],
  roomMessages: (roomId: string) => ["room-messages", roomId],
};

export const useRooms = (userId?: string) => {
  return useQuery({
    queryKey: ROOMS_QUERY_KEYS.rooms(userId || ""),
    queryFn: async (): Promise<RoomListItem[]> => {
      const response = await fetch(`/api/rooms/getall?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rooms");
      }
      const data = await response.json();
      return data.rooms || [];
    },
    enabled: !!userId,
  });
};
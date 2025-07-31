import { useQuery } from "@tanstack/react-query";

export const ROOM_INVITATIONS_QUERY_KEYS = {
  invitations: (roomId: string) => ["room-invitations", roomId],
};

export const useRoomInvitations = (roomId: string) => {
  return useQuery({
    queryKey: ROOM_INVITATIONS_QUERY_KEYS.invitations(roomId),
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomId}/invitations`);
      if (!response.ok) {
        throw new Error("Failed to fetch room invitations");
      }
      const data = await response.json();
      return data.invitations || [];
    },
    enabled: !!roomId,
  });
};
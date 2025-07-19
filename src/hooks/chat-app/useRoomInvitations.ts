import { useQuery } from '@tanstack/react-query';

interface PendingInvitation {
  id: string;
  invited_user: string;
  invited_by: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export const useRoomInvitations = (roomId?: string) => {
  return useQuery({
    queryKey: ['room-invitations', roomId],
    queryFn: async () => {
      if (!roomId) return [];
      
      const response = await fetch(`/api/rooms/${roomId}/invitations`);
      if (!response.ok) {
        throw new Error('Failed to fetch room invitations');
      }
      
      const data = await response.json();
      return data.invitations as PendingInvitation[];
    },
    enabled: !!roomId,
  });
};

export const ROOM_INVITATIONS_QUERY_KEYS = {
  invitations: (roomId: string) => ['room-invitations', roomId],
};
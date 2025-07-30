import { useCallback, useMemo } from 'react';
import { useSupabasePresence } from './useSupabasePresence';
import { ChatUser } from '@/types/chat-app';

interface RoomPresenceUser {
  userId: string;
  username: string;
  fullName: string;
  userProfile?: string;
  isOnline: boolean;
  onlineAt?: Date;
}

interface UseRoomPresenceOptions {
  roomId: string;
  roomMembers: ChatUser[];
  enabled?: boolean;
}

interface UseRoomPresenceReturn {
  roomPresences: Map<string, RoomPresenceUser>;
  onlineMembers: RoomPresenceUser[];
  offlineMembers: RoomPresenceUser[];
  onlineMemberCount: number;
  totalMemberCount: number;
  isRoomMemberOnline: (userId: string) => boolean;
  getRoomMemberPresence: (userId: string) => RoomPresenceUser | undefined;
  isConnected: boolean;
  error: Error | null;
}

export const useRoomPresence = ({
  roomId,
  roomMembers,
  enabled = true,
}: UseRoomPresenceOptions): UseRoomPresenceReturn => {
  // Use room-specific presence channel
  const {
    presences,
    isOnline,
    getPresence,
    isConnected,
    error,
  } = useSupabasePresence({
    channelName: `room-${roomId}`,
    enabled: enabled && !!roomId,
  });

  // Create room presence map combining member info with presence data
  const roomPresences = useMemo(() => {
    const presenceMap = new Map<string, RoomPresenceUser>();

    roomMembers.forEach(member => {
      const presence = getPresence(member.id);
      const isUserOnline = isOnline(member.id);

      presenceMap.set(member.id, {
        userId: member.id,
        username: member.username,
        fullName: member.full_name,
        userProfile: member.user_profile,
        isOnline: isUserOnline,
        onlineAt: presence ? new Date(presence.online_at) : undefined,
      });
    });

    return presenceMap;
  }, [roomMembers, presences, isOnline, getPresence]);

  // Get online and offline members
  const onlineMembers = useMemo(() => {
    return Array.from(roomPresences.values()).filter(member => member.isOnline);
  }, [roomPresences]);

  const offlineMembers = useMemo(() => {
    return Array.from(roomPresences.values()).filter(member => !member.isOnline);
  }, [roomPresences]);

  // Utility functions
  const isRoomMemberOnline = useCallback((userId: string): boolean => {
    const member = roomPresences.get(userId);
    return member?.isOnline ?? false;
  }, [roomPresences]);

  const getRoomMemberPresence = useCallback((userId: string): RoomPresenceUser | undefined => {
    return roomPresences.get(userId);
  }, [roomPresences]);

  return {
    roomPresences,
    onlineMembers,
    offlineMembers,
    onlineMemberCount: onlineMembers.length,
    totalMemberCount: roomMembers.length,
    isRoomMemberOnline,
    getRoomMemberPresence,
    isConnected,
    error,
  };
};

export default useRoomPresence;
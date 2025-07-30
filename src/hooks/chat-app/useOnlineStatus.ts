import { useState, useCallback, useEffect } from 'react';
import { OnlineStatus } from '@/types/chat-app';
import { useSupabasePresence } from './useSupabasePresence';

interface UseOnlineStatusOptions {
  channelName?: string;
  enablePresence?: boolean;
}

interface UseOnlineStatusReturn {
  onlineUsers: Map<string, OnlineStatus>;
  setUserOnline: (userId: string, lastSeen?: Date) => void;
  setUserOffline: (userId: string, lastSeen?: Date) => void;
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => Date | undefined;
  getOnlineStatus: (userId: string) => OnlineStatus | undefined;
  onlineUserIds: string[];
  isConnected: boolean;
  presenceError: Error | null;
}

export const useOnlineStatus = ({
  channelName = 'global-presence',
  enablePresence = true,
}: UseOnlineStatusOptions = {}): UseOnlineStatusReturn => {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineStatus>>(new Map());

  // Use Supabase presence for real-time online status
  const {
    presences,
    isOnline: isPresenceOnline,
    onlineUserIds,
    isConnected,
    error: presenceError,
  } = useSupabasePresence({
    channelName,
    enabled: enablePresence,
  });

  // Sync Supabase presence with local online status
  useEffect(() => {
    if (!enablePresence) return;

    const newOnlineUsers = new Map<string, OnlineStatus>();

    // Add all users from Supabase presence as online
    presences.forEach((presence, userId) => {
      newOnlineUsers.set(userId, {
        user_id: userId,
        is_online: true,
        last_seen: new Date(presence.online_at),
      });
    });

    // Keep offline users from previous state but update their status
    onlineUsers.forEach((status, userId) => {
      if (!presences.has(userId) && status.is_online) {
        // User went offline, mark as offline with current timestamp
        newOnlineUsers.set(userId, {
          user_id: userId,
          is_online: false,
          last_seen: new Date(),
        });
      } else if (!presences.has(userId)) {
        // Keep existing offline status
        newOnlineUsers.set(userId, status);
      }
    });

    setOnlineUsers(newOnlineUsers);
  }, [presences, enablePresence]);

  const setUserOnline = useCallback((userId: string, lastSeen?: Date) => {
    setOnlineUsers(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, {
        user_id: userId,
        is_online: true,
        last_seen: lastSeen || new Date(),
      });
      return newMap;
    });
  }, []);

  const setUserOffline = useCallback((userId: string, lastSeen?: Date) => {
    setOnlineUsers(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, {
        user_id: userId,
        is_online: false,
        last_seen: lastSeen || new Date(),
      });
      return newMap;
    });
  }, []);

  const isUserOnline = useCallback((userId: string): boolean => {
    if (enablePresence) {
      return isPresenceOnline(userId);
    }
    const status = onlineUsers.get(userId);
    return status?.is_online ?? false;
  }, [onlineUsers, enablePresence, isPresenceOnline]);

  const getUserLastSeen = useCallback((userId: string): Date | undefined => {
    const status = onlineUsers.get(userId);
    return status?.last_seen;
  }, [onlineUsers]);

  const getOnlineStatus = useCallback((userId: string): OnlineStatus | undefined => {
    return onlineUsers.get(userId);
  }, [onlineUsers]);

  return {
    onlineUsers,
    setUserOnline,
    setUserOffline,
    isUserOnline,
    getUserLastSeen,
    getOnlineStatus,
    onlineUserIds,
    isConnected,
    presenceError,
  };
};
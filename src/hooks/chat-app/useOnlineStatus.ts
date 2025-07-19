import { useState, useCallback } from 'react';
import { OnlineStatus } from '@/types/chat-app';

interface UseOnlineStatusReturn {
  onlineUsers: Map<string, OnlineStatus>;
  setUserOnline: (userId: string, lastSeen?: Date) => void;
  setUserOffline: (userId: string, lastSeen?: Date) => void;
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => Date | undefined;
  getOnlineStatus: (userId: string) => OnlineStatus | undefined;
}

export const useOnlineStatus = (): UseOnlineStatusReturn => {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, OnlineStatus>>(new Map());

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
    const status = onlineUsers.get(userId);
    return status?.is_online ?? false;
  }, [onlineUsers]);

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
  };
};
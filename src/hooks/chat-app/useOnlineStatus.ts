import { useState, useCallback } from "react";

interface OnlineStatusState {
  [userId: string]: {
    isOnline: boolean;
    lastSeen?: Date;
  };
}

export const useOnlineStatus = () => {
  const [userStatuses, setUserStatuses] = useState<OnlineStatusState>({});

  const setUserOnline = useCallback((userId: string) => {
    setUserStatuses(prev => ({
      ...prev,
      [userId]: {
        isOnline: true,
        lastSeen: new Date(),
      },
    }));
  }, []);

  const setUserOffline = useCallback((userId: string) => {
    setUserStatuses(prev => ({
      ...prev,
      [userId]: {
        isOnline: false,
        lastSeen: new Date(),
      },
    }));
  }, []);

  const isUserOnline = useCallback((userId: string) => {
    return userStatuses[userId]?.isOnline || false;
  }, [userStatuses]);

  const getUserLastSeen = useCallback((userId: string) => {
    return userStatuses[userId]?.lastSeen;
  }, [userStatuses]);

  return {
    setUserOnline,
    setUserOffline,
    isUserOnline,
    getUserLastSeen,
  };
};
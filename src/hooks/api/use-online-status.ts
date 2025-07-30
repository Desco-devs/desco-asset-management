import { useEffect, useRef } from 'react';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const OFFLINE_GRACE_PERIOD = 2 * 60 * 1000; // 2 minutes

export function useOnlineHeartbeat(userId?: string) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) return;

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/users/online-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            status: 'online',
          }),
        });
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval for periodic heartbeats
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [userId]);
}

export function useSetOffline(userId?: string) {
  useEffect(() => {
    if (!userId) return;

    const setOffline = async () => {
      try {
        await fetch('/api/users/online-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId,
            status: 'offline',
          }),
        });
      } catch (error) {
        console.error('Failed to set offline status:', error);
      }
    };

    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon for more reliable offline status
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/users/online-status', JSON.stringify({
          userId,
          status: 'offline',
        }));
      } else {
        setOffline();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setOffline();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      setOffline();
    };
  }, [userId]);
}
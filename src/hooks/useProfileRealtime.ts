"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { profileKeys } from "./useProfileQuery";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Network status for adaptive real-time behavior
 */
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    const updateConnectionInfo = () => {
      // @ts-ignore - connection API is experimental but widely supported
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Listen for connection changes on mobile
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo);
      updateConnectionInfo();
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo);
      }
    };
  }, []);

  return { isOnline, connectionType };
}

/**
 * Adaptive throttling based on network conditions and battery status
 */
function useAdaptiveThrottling() {
  const [throttleMs, setThrottleMs] = useState(1000);
  const { isOnline, connectionType } = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) {
      setThrottleMs(5000); // 5s when offline
      return;
    }

    // Adaptive throttling based on connection type
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        setThrottleMs(3000); // 3s for slow connections
        break;
      case '3g':
        setThrottleMs(2000); // 2s for 3G
        break;
      case '4g':
      case '5g':
      case 'wifi':
        setThrottleMs(1000); // 1s for fast connections
        break;
      default:
        setThrottleMs(1500); // 1.5s for unknown connections
    }

    // Check battery status for additional throttling
    if ('getBattery' in navigator) {
      // @ts-ignore - Battery API
      navigator.getBattery().then((battery: any) => {
        if (battery.level < 0.2) { // Battery below 20%
          setThrottleMs(prev => Math.max(prev * 2, 5000)); // Double throttle time, max 5s
        }
      }).catch(() => {
        // Battery API not available, continue with connection-based throttling
      });
    }
  }, [isOnline, connectionType]);

  return throttleMs;
}

/**
 * Mobile-Optimized Profile Realtime Hook
 * 
 * Features:
 * - Adaptive throttling based on network conditions and battery status
 * - Smart subscription management with automatic reconnection
 * - Efficient invalidation patterns to minimize re-renders
 * - Offline/online transition handling
 * - Memory leak prevention with proper cleanup
 * - Battery-conscious operation on mobile devices
 */
export function useProfileRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const throttleMs = useAdaptiveThrottling();
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Throttled invalidation function
  const throttledInvalidate = useCallback((payload: any) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If enough time has passed, invalidate immediately
    if (timeSinceLastUpdate >= throttleMs) {
      performInvalidation(payload);
      lastUpdateRef.current = now;
    } else {
      // Otherwise, schedule invalidation
      const delay = throttleMs - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(() => {
        performInvalidation(payload);
        lastUpdateRef.current = Date.now();
      }, delay);
    }
  }, [throttleMs]);

  // Actual invalidation logic
  const performInvalidation = useCallback((payload: any) => {
    try {
      // Only invalidate specific queries to minimize re-renders
      if (userId) {
        // Targeted invalidation for specific user
        queryClient.invalidateQueries({ 
          queryKey: profileKeys.detail(userId),
          exact: true // Only exact matches
        });
        
        // Also invalidate current profile if it matches
        const changedUserId = (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id;
        if (changedUserId === userId) {
          queryClient.invalidateQueries({ 
            queryKey: profileKeys.current(),
            exact: true
          });
        }
      } else {
        // For current user, only invalidate current profile
        queryClient.invalidateQueries({ 
          queryKey: profileKeys.current(),
          exact: true
        });
      }

      // Only invalidate users list for admin views (when no specific userId)
      if (!userId) {
        queryClient.invalidateQueries({ 
          queryKey: ['users'],
          exact: false,
          refetchType: 'none' // Don't automatically refetch, let components decide
        });
      }
    } catch (error) {
      console.warn('[ProfileRealtime] Invalidation error:', error);
    }
  }, [queryClient, userId]);

  // Connection management
  const connectChannel = useCallback(() => {
    if (!isOnline) {
      setConnectionStatus('disconnected');
      return;
    }

    try {
      setConnectionStatus('connecting');
      const supabase = createClient();

      // Create channel with mobile-optimized settings
      const channel = supabase
        .channel(`profile-realtime-${userId || 'current'}`, {
          config: {
            // Mobile-optimized settings
            presence: { key: userId || 'anonymous' },
            broadcast: { self: false },
            // Reduce heartbeat interval for mobile
            heartbeat_interval: 30000, // 30s instead of default 15s
          }
        })
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
            // Filter by specific user if userId provided for efficiency
            ...(userId && { filter: `id=eq.${userId}` })
          },
          (payload) => {
            throttledInvalidate(payload);
          }
        )
        .on('system', {}, (payload) => {
          // Handle connection status changes
          if (payload.extension === 'postgres_changes') {
            switch (payload.status) {
              case 'SUBSCRIBED':
                setConnectionStatus('connected');
                reconnectAttemptsRef.current = 0;
                break;
              case 'CHANNEL_ERROR':
              case 'TIMED_OUT':
                setConnectionStatus('error');
                // Attempt reconnection with exponential backoff
                scheduleReconnect();
                break;
              case 'CLOSED':
                setConnectionStatus('disconnected');
                break;
            }
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('error');
            scheduleReconnect();
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('[ProfileRealtime] Connection error:', error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  }, [isOnline, userId, throttledInvalidate]);

  // Reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('[ProfileRealtime] Max reconnection attempts reached');
      setConnectionStatus('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000); // Max 30s
    reconnectAttemptsRef.current += 1;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      connectChannel();
    }, delay);
  }, [connectChannel]);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  // Main effect for connection management
  useEffect(() => {
    if (isOnline && !channelRef.current) {
      connectChannel();
    } else if (!isOnline && channelRef.current) {
      disconnect();
    }

    return disconnect;
  }, [isOnline, connectChannel, disconnect]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Return enhanced status information
  return { 
    isListening: connectionStatus === 'connected',
    connectionStatus,
    isOnline,
    throttleMs,
    reconnectAttempts: reconnectAttemptsRef.current
  };
}

/**
 * Mobile-Optimized Global User Changes Realtime Hook
 * 
 * Listens to all user changes for admin dashboard or user management views
 * with mobile-specific optimizations
 */
export function useUsersRealtime() {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const throttleMs = useAdaptiveThrottling();
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Throttled invalidation for users list
  const throttledInvalidateUsers = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (timeSinceLastUpdate >= throttleMs) {
      // Batch invalidation for better performance
      queryClient.invalidateQueries({ 
        queryKey: ['users'],
        refetchType: 'none' // Let components decide when to refetch
      });
      queryClient.invalidateQueries({ 
        queryKey: profileKeys.all,
        refetchType: 'none'
      });
      lastUpdateRef.current = now;
    } else {
      const delay = throttleMs - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['users'],
          refetchType: 'none'
        });
        queryClient.invalidateQueries({ 
          queryKey: profileKeys.all,
          refetchType: 'none'
        });
        lastUpdateRef.current = Date.now();
      }, delay);
    }
  }, [queryClient, throttleMs]);

  useEffect(() => {
    if (!isOnline) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    const supabase = createClient();

    const channel = supabase
      .channel('users-realtime', {
        config: {
          heartbeat_interval: 30000, // Mobile-optimized heartbeat
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          throttledInvalidateUsers();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [queryClient, isOnline, throttledInvalidateUsers]);

  return { 
    isListening: connectionStatus === 'connected',
    connectionStatus,
    isOnline
  };
}

/**
 * Mobile-Optimized Current User Status Realtime Hook
 * 
 * Specifically listens to online status changes for the current user
 * with battery and performance optimizations
 */
export function useCurrentUserStatusRealtime(currentUserId: string) {
  const queryClient = useQueryClient();
  const { isOnline } = useNetworkStatus();
  const throttleMs = useAdaptiveThrottling();
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Throttled status update
  const throttledStatusUpdate = useCallback((payload: any) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const performUpdate = () => {
      // Check if online status or last_seen changed
      const oldRecord = payload.old;
      const newRecord = payload.new;
      
      if (
        oldRecord?.is_online !== newRecord?.is_online ||
        oldRecord?.last_seen !== newRecord?.last_seen
      ) {
        // Only invalidate current profile for status changes
        queryClient.invalidateQueries({ 
          queryKey: profileKeys.current(),
          exact: true,
          refetchType: 'none' // Let component decide when to refetch
        });
      }
      lastUpdateRef.current = Date.now();
    };

    if (timeSinceLastUpdate >= throttleMs) {
      performUpdate();
    } else {
      const delay = throttleMs - timeSinceLastUpdate;
      timeoutRef.current = setTimeout(performUpdate, delay);
    }
  }, [queryClient, throttleMs]);

  useEffect(() => {
    if (!currentUserId || !isOnline) {
      setConnectionStatus('disconnected');
      return;
    }

    setConnectionStatus('connecting');
    const supabase = createClient();

    const channel = supabase
      .channel(`user-status-${currentUserId}`, {
        config: {
          heartbeat_interval: 45000, // Longer heartbeat for status updates
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${currentUserId}`
        },
        throttledStatusUpdate
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [queryClient, currentUserId, isOnline, throttledStatusUpdate]);

  return { 
    isListening: connectionStatus === 'connected',
    connectionStatus,
    isOnline
  };
}
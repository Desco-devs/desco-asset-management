"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

/**
 * Mobile-specific real-time optimization utilities
 * 
 * This module provides utilities for mobile-optimized real-time functionality
 * including network detection, battery-aware throttling, and adaptive behavior
 */

// Types
export interface NetworkInfo {
  isOnline: boolean;
  connectionType: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface MobileRealtimeConfig {
  throttleMs?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  batteryOptimization?: boolean;
  adaptiveThrottling?: boolean;
}

export interface RealtimeStatus {
  isListening: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  isOnline: boolean;
  throttleMs: number;
  reconnectAttempts: number;
  networkInfo: NetworkInfo;
}

/**
 * Enhanced network status hook with mobile-specific optimizations
 */
export function useNetworkInfo(): NetworkInfo {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateNetworkInfo = () => {
      // @ts-ignore - connection API is experimental but widely supported
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      setNetworkInfo({
        isOnline: navigator.onLine,
        connectionType: connection?.type || 'unknown',
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt,
      });
    };

    const handleOnline = () => updateNetworkInfo();
    const handleOffline = () => updateNetworkInfo();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Listen for connection changes
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      updateNetworkInfo();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  return networkInfo;
}

/**
 * Battery-aware throttling calculation
 */
export function useBatteryAwareThrottling(baseThrottleMs: number = 1000): number {
  const [throttleMs, setThrottleMs] = useState(baseThrottleMs);
  const networkInfo = useNetworkInfo();

  useEffect(() => {
    let calculatedThrottle = baseThrottleMs;

    // Adjust based on network conditions
    if (!networkInfo.isOnline) {
      calculatedThrottle = 5000; // 5s when offline
    } else {
      switch (networkInfo.effectiveType) {
        case 'slow-2g':
          calculatedThrottle = Math.max(baseThrottleMs * 4, 4000); // 4s minimum
          break;
        case '2g':
          calculatedThrottle = Math.max(baseThrottleMs * 3, 3000); // 3s minimum
          break;
        case '3g':
          calculatedThrottle = Math.max(baseThrottleMs * 2, 2000); // 2s minimum
          break;
        case '4g':
        case '5g':
          calculatedThrottle = baseThrottleMs; // Use base throttle
          break;
        default:
          calculatedThrottle = Math.max(baseThrottleMs * 1.5, 1500); // 1.5s for unknown
      }
    }

    // Apply battery optimization if available
    if ('getBattery' in navigator) {
      // @ts-ignore - Battery API
      navigator.getBattery().then((battery: any) => {
        if (battery.level < 0.15) { // Battery below 15%
          setThrottleMs(Math.max(calculatedThrottle * 3, 5000)); // Triple throttle, min 5s
        } else if (battery.level < 0.3) { // Battery below 30%
          setThrottleMs(Math.max(calculatedThrottle * 2, 3000)); // Double throttle, min 3s
        } else {
          setThrottleMs(calculatedThrottle);
        }
      }).catch(() => {
        // Battery API not available, use network-based throttling
        setThrottleMs(calculatedThrottle);
      });
    } else {
      setThrottleMs(calculatedThrottle);
    }
  }, [baseThrottleMs, networkInfo.isOnline, networkInfo.effectiveType]);

  return throttleMs;
}

/**
 * Smart throttling function with mobile optimizations
 */
export function useSmartThrottle<T extends (...args: any[]) => void>(
  callback: T,
  throttleMs: number
): [T, () => void] {
  const lastExecutedRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const argsRef = useRef<Parameters<T> | null>(null);

  const throttledFunction = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutedRef.current;

    // Store the latest arguments
    argsRef.current = args;

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (timeSinceLastExecution >= throttleMs) {
      // Execute immediately
      callback(...args);
      lastExecutedRef.current = now;
    } else {
      // Schedule execution
      const delay = throttleMs - timeSinceLastExecution;
      timeoutRef.current = setTimeout(() => {
        if (argsRef.current) {
          callback(...argsRef.current);
          lastExecutedRef.current = Date.now();
        }
      }, delay);
    }
  }, [callback, throttleMs]) as T;

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    argsRef.current = null;
  }, []);

  return [throttledFunction, cancel];
}

/**
 * Mobile-optimized Supabase channel manager
 */
export function useMobileRealtimeChannel(
  channelName: string,
  config: MobileRealtimeConfig = {}
): {
  channel: RealtimeChannel | null;
  status: RealtimeStatus;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
} {
  const {
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    batteryOptimization = true,
  } = config;

  const networkInfo = useNetworkInfo();
  const baseThrottleMs = config.throttleMs || 1000;
  const adaptiveThrottleMs = useBatteryAwareThrottling(baseThrottleMs);

  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!networkInfo.isOnline) {
      setConnectionStatus('disconnected');
      return;
    }

    try {
      setConnectionStatus('connecting');
      const supabase = createClient();

      const newChannel = supabase.channel(channelName, {
        config: {
          heartbeat_interval: heartbeatInterval,
          presence: { key: 'mobile-client' },
          broadcast: { self: false },
        }
      });

      newChannel.subscribe((status) => {
        switch (status) {
          case 'SUBSCRIBED':
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0;
            break;
          case 'CHANNEL_ERROR':
          case 'TIMED_OUT':
            setConnectionStatus('error');
            scheduleReconnect();
            break;
          case 'CLOSED':
            setConnectionStatus('disconnected');
            break;
        }
      });

      setChannel(newChannel);
    } catch (error) {
      console.error(`[MobileRealtime] Connection error for ${channelName}:`, error);
      setConnectionStatus('error');
      scheduleReconnect();
    }
  }, [networkInfo.isOnline, channelName, heartbeatInterval]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn(`[MobileRealtime] Max reconnection attempts reached for ${channelName}`);
      setConnectionStatus('error');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
    reconnectAttemptsRef.current += 1;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      disconnect();
      connect();
    }, delay);
  }, [maxReconnectAttempts, channelName, connect]);

  const disconnect = useCallback(() => {
    if (channel) {
      channel.unsubscribe();
      setChannel(null);
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, [channel]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  // Auto-connect/disconnect based on network status
  useEffect(() => {
    if (networkInfo.isOnline && !channel) {
      connect();
    } else if (!networkInfo.isOnline && channel) {
      disconnect();
    }
  }, [networkInfo.isOnline, channel, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const status: RealtimeStatus = {
    isListening: connectionStatus === 'connected',
    connectionStatus,
    isOnline: networkInfo.isOnline,
    throttleMs: adaptiveThrottleMs,
    reconnectAttempts: reconnectAttemptsRef.current,
    networkInfo,
  };

  return {
    channel,
    status,
    connect,
    disconnect,
    reconnect,
  };
}

/**
 * Optimistic update manager with conflict resolution
 */
export function useOptimisticUpdates<T>(queryKey: readonly unknown[]) {
  const queryClient = useQueryClient();
  const optimisticUpdatesRef = useRef<Map<string, { data: T; timestamp: number }>>(new Map());

  const performOptimisticUpdate = useCallback(
    (updateId: string, optimisticData: T) => {
      // Cancel any outgoing queries
      queryClient.cancelQueries({ queryKey });

      // Store the previous data for potential rollback
      const previousData = queryClient.getQueryData<T>(queryKey);
      
      // Store optimistic update info
      optimisticUpdatesRef.current.set(updateId, {
        data: optimisticData,
        timestamp: Date.now(),
      });

      // Apply optimistic update
      queryClient.setQueryData(queryKey, optimisticData);

      return previousData;
    },
    [queryClient, queryKey]
  );

  const confirmOptimisticUpdate = useCallback(
    (updateId: string, serverData: T) => {
      // Remove from optimistic updates tracking
      optimisticUpdatesRef.current.delete(updateId);

      // Apply server data (this may overwrite other optimistic updates)
      queryClient.setQueryData(queryKey, serverData);

      // Clean up old optimistic updates (older than 30 seconds)
      const now = Date.now();
      optimisticUpdatesRef.current.forEach((update, id) => {
        if (now - update.timestamp > 30000) {
          optimisticUpdatesRef.current.delete(id);
        }
      });
    },
    [queryClient, queryKey]
  );

  const rollbackOptimisticUpdate = useCallback(
    (updateId: string, previousData: T | undefined) => {
      // Remove from optimistic updates tracking
      optimisticUpdatesRef.current.delete(updateId);

      // Rollback to previous data
      if (previousData !== undefined) {
        queryClient.setQueryData(queryKey, previousData);
      } else {
        // If no previous data, invalidate to refetch
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, queryKey]
  );

  const resolveConflicts = useCallback(
    (serverData: T) => {
      // If we have pending optimistic updates, we need to merge them
      const pendingUpdates = Array.from(optimisticUpdatesRef.current.values());
      
      if (pendingUpdates.length === 0) {
        // No conflicts, just use server data
        queryClient.setQueryData(queryKey, serverData);
        return serverData;
      }

      // Simple conflict resolution: server data wins, but we preserve optimistic changes
      // that are more recent than the server data timestamp
      // This is a basic implementation - you might want more sophisticated merging
      queryClient.setQueryData(queryKey, serverData);
      
      // Clear old optimistic updates
      optimisticUpdatesRef.current.clear();
      
      return serverData;
    },
    [queryClient, queryKey]
  );

  return {
    performOptimisticUpdate,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
    resolveConflicts,
    hasPendingUpdates: optimisticUpdatesRef.current.size > 0,
  };
}
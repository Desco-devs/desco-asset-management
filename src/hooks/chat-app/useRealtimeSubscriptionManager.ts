'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

// Subscription types
export enum SubscriptionType {
  DATABASE = 'database',
  BROADCAST = 'broadcast',
  PRESENCE = 'presence',
}

// Subscription configuration
interface SubscriptionConfig {
  id: string;
  type: SubscriptionType;
  channelName: string;
  enabled: boolean;
  autoCleanup: boolean;
  maxRetries: number;
  retryDelay: number;
}

// Subscription status
interface SubscriptionStatus {
  id: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error' | 'retrying';
  error?: string;
  retryCount: number;
  lastConnected?: Date;
  lastError?: Date;
}

// Manager options
interface UseRealtimeSubscriptionManagerOptions {
  enabled?: boolean;
  globalErrorHandler?: (error: string, subscriptionId: string) => void;
  onStatusChange?: (status: SubscriptionStatus) => void;
}

export const useRealtimeSubscriptionManager = ({
  enabled = true,
  globalErrorHandler,
  onStatusChange,
}: UseRealtimeSubscriptionManagerOptions = {}) => {
  const [subscriptions, setSubscriptions] = useState<Map<string, SubscriptionConfig>>(new Map());
  const [statuses, setStatuses] = useState<Map<string, SubscriptionStatus>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionCount, setConnectionCount] = useState(0);
  
  // Channel references
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const supabase = createClient();

  // Update subscription status
  const updateStatus = useCallback((
    subscriptionId: string, 
    updates: Partial<SubscriptionStatus>
  ) => {
    setStatuses(prev => {
      const newStatuses = new Map(prev);
      const currentStatus = newStatuses.get(subscriptionId);
      const updatedStatus = {
        ...currentStatus,
        id: subscriptionId,
        retryCount: 0,
        ...updates,
      } as SubscriptionStatus;
      
      newStatuses.set(subscriptionId, updatedStatus);
      onStatusChange?.(updatedStatus);
      
      return newStatuses;
    });
  }, [onStatusChange]);

  // Create a channel
  const createChannel = useCallback((config: SubscriptionConfig): RealtimeChannel => {
    const channel = supabase.channel(config.channelName);
    
    channel.subscribe((status) => {
      console.log(`Subscription ${config.id} status: ${status}`);
      
      switch (status) {
        case 'SUBSCRIBED':
          updateStatus(config.id, {
            status: 'connected',
            lastConnected: new Date(),
            retryCount: 0,
          });
          setConnectionCount(prev => prev + 1);
          break;
          
        case 'CHANNEL_ERROR':
          const errorMessage = `Channel error for ${config.id}`;
          updateStatus(config.id, {
            status: 'error',
            error: errorMessage,
            lastError: new Date(),
          });
          globalErrorHandler?.(errorMessage, config.id);
          
          // Auto-retry if configured
          if (config.maxRetries > 0) {
            scheduleRetry(config);
          }
          break;
          
        case 'TIMED_OUT':
          updateStatus(config.id, {
            status: 'error',
            error: 'Connection timed out',
            lastError: new Date(),
          });
          
          if (config.maxRetries > 0) {
            scheduleRetry(config);
          }
          break;
          
        case 'CLOSED':
          updateStatus(config.id, {
            status: 'disconnected',
          });
          setConnectionCount(prev => Math.max(0, prev - 1));
          break;
      }
    });
    
    return channel;
  }, [supabase, updateStatus, globalErrorHandler]);

  // Schedule retry for failed subscription
  const scheduleRetry = useCallback((config: SubscriptionConfig) => {
    const currentStatus = statuses.get(config.id);
    if (!currentStatus || currentStatus.retryCount >= config.maxRetries) {
      updateStatus(config.id, {
        status: 'error',
        error: 'Max retries exceeded',
      });
      return;
    }

    updateStatus(config.id, {
      status: 'retrying',
      retryCount: currentStatus.retryCount + 1,
    });

    const timeout = setTimeout(() => {
      console.log(`Retrying subscription ${config.id} (attempt ${currentStatus.retryCount + 1})`);
      const channel = createChannel(config);
      channelsRef.current.set(config.id, channel);
      retryTimeoutsRef.current.delete(config.id);
    }, config.retryDelay);

    retryTimeoutsRef.current.set(config.id, timeout);
  }, [statuses, updateStatus, createChannel]);

  // Add subscription
  const addSubscription = useCallback((config: SubscriptionConfig) => {
    if (!enabled) return;

    console.log(`Adding subscription: ${config.id}`);
    
    setSubscriptions(prev => new Map(prev).set(config.id, config));
    
    updateStatus(config.id, {
      status: 'connecting',
      retryCount: 0,
    });

    if (config.enabled) {
      const channel = createChannel(config);
      channelsRef.current.set(config.id, channel);
    }
  }, [enabled, createChannel, updateStatus]);

  // Remove subscription
  const removeSubscription = useCallback((subscriptionId: string, cleanup = true) => {
    console.log(`Removing subscription: ${subscriptionId}`);
    
    // Clear retry timeout
    const retryTimeout = retryTimeoutsRef.current.get(subscriptionId);
    if (retryTimeout) {
      clearTimeout(retryTimeout);
      retryTimeoutsRef.current.delete(subscriptionId);
    }

    // Unsubscribe from channel
    const channel = channelsRef.current.get(subscriptionId);
    if (channel) {
      channel.unsubscribe();
      channelsRef.current.delete(subscriptionId);
    }

    if (cleanup) {
      setSubscriptions(prev => {
        const newSubs = new Map(prev);
        newSubs.delete(subscriptionId);
        return newSubs;
      });

      setStatuses(prev => {
        const newStatuses = new Map(prev);
        newStatuses.delete(subscriptionId);
        return newStatuses;
      });
    }
  }, []);

  // Enable/disable subscription
  const toggleSubscription = useCallback((subscriptionId: string, enabled: boolean) => {
    const config = subscriptions.get(subscriptionId);
    if (!config) return;

    const updatedConfig = { ...config, enabled };
    setSubscriptions(prev => new Map(prev).set(subscriptionId, updatedConfig));

    if (enabled && !channelsRef.current.has(subscriptionId)) {
      const channel = createChannel(updatedConfig);
      channelsRef.current.set(subscriptionId, channel);
    } else if (!enabled && channelsRef.current.has(subscriptionId)) {
      removeSubscription(subscriptionId, false);
    }
  }, [subscriptions, createChannel, removeSubscription]);

  // Get subscription by ID
  const getSubscription = useCallback((subscriptionId: string) => {
    return {
      config: subscriptions.get(subscriptionId),
      status: statuses.get(subscriptionId),
      channel: channelsRef.current.get(subscriptionId),
    };
  }, [subscriptions, statuses]);

  // Get all subscriptions
  const getAllSubscriptions = useCallback(() => {
    const result: Array<{
      config: SubscriptionConfig;
      status?: SubscriptionStatus;
      channel?: RealtimeChannel;
    }> = [];

    subscriptions.forEach((config) => {
      result.push({
        config,
        status: statuses.get(config.id),
        channel: channelsRef.current.get(config.id),
      });
    });

    return result;
  }, [subscriptions, statuses]);

  // Enhanced cleanup with memory leak prevention
  const cleanup = useCallback(() => {
    console.log('🧹 Starting comprehensive subscription cleanup...');
    
    const cleanupStartTime = Date.now();
    let timeoutsCleared = 0;
    let channelsUnsubscribed = 0;

    try {
      // Clear all retry timeouts with error handling
      retryTimeoutsRef.current.forEach((timeout, id) => {
        try {
          clearTimeout(timeout);
          timeoutsCleared++;
          console.log(`✅ Cleared timeout for subscription: ${id}`);
        } catch (error) {
          console.error(`❌ Error clearing timeout for ${id}:`, error);
        }
      });
      retryTimeoutsRef.current.clear();

      // Unsubscribe from all channels with error handling
      const unsubscribePromises: Promise<void>[] = [];
      channelsRef.current.forEach((channel, id) => {
        const promise = new Promise<void>((resolve) => {
          try {
            console.log(`🔌 Unsubscribing from ${id}...`);
            channel.unsubscribe();
            channelsUnsubscribed++;
            console.log(`✅ Successfully unsubscribed from ${id}`);
          } catch (error) {
            console.error(`❌ Error unsubscribing from ${id}:`, error);
          } finally {
            resolve();
          }
        });
        unsubscribePromises.push(promise);
      });

      // Wait for all unsubscribes to complete (with timeout)
      Promise.race([
        Promise.allSettled(unsubscribePromises),
        new Promise(resolve => setTimeout(resolve, 5000)) // 5 second timeout
      ]).then(() => {
        console.log(`🧹 Unsubscription completed: ${channelsUnsubscribed} channels`);
      });

      channelsRef.current.clear();

      // Clear state with error handling
      try {
        setSubscriptions(new Map());
        setStatuses(new Map());
        setConnectionCount(0);
        setIsConnected(false);
        console.log('✅ State cleared successfully');
      } catch (error) {
        console.error('❌ Error clearing state:', error);
      }

      const cleanupDuration = Date.now() - cleanupStartTime;
      console.log(`🧹 Subscription cleanup completed in ${cleanupDuration}ms`);
      console.log(`📊 Cleanup stats: ${timeoutsCleared} timeouts, ${channelsUnsubscribed} channels`);

      // Memory leak detection warning
      setTimeout(() => {
        if (channelsRef.current.size > 0 || retryTimeoutsRef.current.size > 0) {
          console.warn('⚠️ Potential memory leak detected:');
          console.warn(`   - Remaining channels: ${channelsRef.current.size}`);
          console.warn(`   - Remaining timeouts: ${retryTimeoutsRef.current.size}`);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Critical error during subscription cleanup:', error);
    }
  }, []);

  // Update global connection status
  useEffect(() => {
    setIsConnected(connectionCount > 0);
  }, [connectionCount]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  // Auto-cleanup on disable
  useEffect(() => {
    if (!enabled) {
      cleanup();
    }
  }, [enabled]);

  return {
    // State
    subscriptions: Array.from(subscriptions.values()),
    statuses: Array.from(statuses.values()),
    isConnected,
    connectionCount,
    
    // Actions
    addSubscription,
    removeSubscription,
    toggleSubscription,
    getSubscription,
    getAllSubscriptions,
    cleanup,
    
    // Utilities
    createDefaultConfig: (
      id: string,
      channelName: string,
      type: SubscriptionType = SubscriptionType.DATABASE
    ): SubscriptionConfig => ({
      id,
      type,
      channelName,
      enabled: true,
      autoCleanup: true,
      maxRetries: 3,
      retryDelay: 1000 + Math.random() * 2000, // 1-3s with jitter
    }),
  };
};

export default useRealtimeSubscriptionManager;
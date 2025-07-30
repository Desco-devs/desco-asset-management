'use client';

/**
 * Real-time Connection Manager with Graceful Degradation
 * 
 * This module provides:
 * - Connection state management
 * - Graceful degradation strategies
 * - Fallback mechanisms
 * - Connection quality monitoring
 * - Resource management
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { realtimeErrorHandler, RealtimeErrorType, RealtimeSeverity } from './error-handling';
import { retryRecoveryManager, RetryStrategy, RecoveryOperation } from './retry-recovery';

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  DEGRADED = 'degraded',
  FAILED = 'failed',
}

export enum DegradationLevel {
  NONE = 'none',           // Full real-time functionality
  PARTIAL = 'partial',     // Some features disabled
  POLLING = 'polling',     // Fallback to polling
  OFFLINE = 'offline',     // Offline mode
}

export interface ConnectionOptions {
  maxReconnectAttempts: number;
  reconnectInterval: number;
  heartbeatInterval: number;
  degradationTimeout: number;
  enableFallbacks: boolean;
  pollingInterval: number;
}

export interface ConnectionMetrics {
  connectionCount: number;
  reconnectCount: number;
  lastConnected: Date | null;
  lastDisconnected: Date | null;
  uptime: number;
  averageLatency: number;
  messagesSent: number;
  messagesReceived: number;
  errorsCount: number;
}

export interface ChannelSubscription {
  id: string;
  channelName: string;
  channel: RealtimeChannel | null;
  state: ConnectionState;
  lastActivity: Date;
  fallbackActive: boolean;
  retryCount: number;
}

export interface FallbackStrategy {
  level: DegradationLevel;
  description: string;
  enabled: boolean;
  activationThreshold: number; // Number of failures before activation
  onActivate?: () => void;
  onDeactivate?: () => void;
}

class RealtimeConnectionManager {
  private supabase = createClient();
  private subscriptions = new Map<string, ChannelSubscription>();
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private degradationLevel: DegradationLevel = DegradationLevel.NONE;
  private metrics: ConnectionMetrics = this.initializeMetrics();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pollingIntervals = new Map<string, NodeJS.Timeout>();
  
  private options: ConnectionOptions = {
    maxReconnectAttempts: 5,
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    degradationTimeout: 60000,
    enableFallbacks: true,
    pollingInterval: 10000,
  };

  private fallbackStrategies: Map<DegradationLevel, FallbackStrategy> = new Map([
    [DegradationLevel.PARTIAL, {
      level: DegradationLevel.PARTIAL,
      description: 'Disable non-critical real-time features',
      enabled: true,
      activationThreshold: 3,
    }],
    [DegradationLevel.POLLING, {
      level: DegradationLevel.POLLING,
      description: 'Switch to polling-based updates',
      enabled: true,
      activationThreshold: 5,
    }],
    [DegradationLevel.OFFLINE, {
      level: DegradationLevel.OFFLINE,
      description: 'Offline mode with cached data',
      enabled: true,
      activationThreshold: 10,
    }],
  ]);

  private stateChangeCallbacks = new Set<(state: ConnectionState, degradation: DegradationLevel) => void>();
  private subscriptionCallbacks = new Map<string, Set<(data: any) => void>>();

  constructor(options?: Partial<ConnectionOptions>) {
    this.options = { ...this.options, ...options };
    this.initializeConnectionMonitoring();
  }

  /**
   * Subscribe to a real-time channel with fallback support
   */
  async subscribe(
    subscriptionId: string,
    channelName: string,
    callback: (data: any) => void,
    fallbackFn?: () => Promise<any>
  ): Promise<void> {
    try {
      // Store callback
      if (!this.subscriptionCallbacks.has(subscriptionId)) {
        this.subscriptionCallbacks.set(subscriptionId, new Set());
      }
      this.subscriptionCallbacks.get(subscriptionId)!.add(callback);

      // Create subscription entry
      const subscription: ChannelSubscription = {
        id: subscriptionId,
        channelName,
        channel: null,
        state: ConnectionState.CONNECTING,
        lastActivity: new Date(),
        fallbackActive: false,
        retryCount: 0,
      };

      this.subscriptions.set(subscriptionId, subscription);

      // Attempt to create real-time subscription
      await this.createRealtimeSubscription(subscriptionId, channelName);

    } catch (error) {
      realtimeErrorHandler.logError(
        RealtimeErrorType.SUBSCRIPTION_ERROR,
        `Failed to subscribe to ${channelName}`,
        error as Error,
        { subscriptionId, channelName },
        RealtimeSeverity.HIGH
      );

      // Activate fallback if enabled
      if (this.options.enableFallbacks && fallbackFn) {
        await this.activateFallback(subscriptionId, fallbackFn);
      }
    }
  }

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      // Cleanup real-time subscription
      if (subscription.channel) {
        await subscription.channel.unsubscribe();
      }

      // Cleanup polling fallback
      const pollingInterval = this.pollingIntervals.get(subscriptionId);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        this.pollingIntervals.delete(subscriptionId);
      }

      // Remove callbacks
      this.subscriptionCallbacks.delete(subscriptionId);
      
      // Remove subscription
      this.subscriptions.delete(subscriptionId);

      realtimeErrorHandler.logSuccess(
        `Successfully unsubscribed from ${subscription.channelName}`,
        { subscriptionId }
      );

    } catch (error) {
      realtimeErrorHandler.logError(
        RealtimeErrorType.CLEANUP_ERROR,
        `Failed to unsubscribe from ${subscription.channelName}`,
        error as Error,
        { subscriptionId },
        RealtimeSeverity.MEDIUM
      );
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): { state: ConnectionState; degradation: DegradationLevel } {
    return {
      state: this.state,
      degradation: this.degradationLevel,
    };
  }

  /**
   * Get connection metrics
   */
  getMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  /**
   * Get subscription states
   */
  getSubscriptions(): ChannelSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: ConnectionState, degradation: DegradationLevel) => void): () => void {
    this.stateChangeCallbacks.add(callback);
    return () => this.stateChangeCallbacks.delete(callback);
  }

  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    this.setState(ConnectionState.RECONNECTING);
    
    // Disconnect all subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (subscription.channel) {
        await subscription.channel.unsubscribe();
        subscription.channel = null;
        subscription.state = ConnectionState.DISCONNECTED;
      }
    }

    // Attempt to reconnect all subscriptions
    for (const subscription of this.subscriptions.values()) {
      try {
        await this.createRealtimeSubscription(subscription.id, subscription.channelName);
      } catch (error) {
        realtimeErrorHandler.logError(
          RealtimeErrorType.CONNECTION_FAILED,
          `Failed to reconnect subscription ${subscription.id}`,
          error as Error,
          { subscriptionId: subscription.id }
        );
      }
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    try {
      // Clear timers
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }

      // Clear polling intervals
      this.pollingIntervals.forEach(interval => clearInterval(interval));
      this.pollingIntervals.clear();

      // Unsubscribe from all channels
      const unsubscribePromises = Array.from(this.subscriptions.keys()).map(id => 
        this.unsubscribe(id)
      );
      await Promise.allSettled(unsubscribePromises);

      // Clear callbacks
      this.stateChangeCallbacks.clear();
      this.subscriptionCallbacks.clear();

      this.setState(ConnectionState.DISCONNECTED);
      this.setDegradationLevel(DegradationLevel.NONE);

      realtimeErrorHandler.logSuccess('Connection manager cleaned up successfully');

    } catch (error) {
      realtimeErrorHandler.logError(
        RealtimeErrorType.CLEANUP_ERROR,
        'Failed to cleanup connection manager',
        error as Error,
        {},
        RealtimeSeverity.MEDIUM
      );
    }
  }

  /**
   * Create a real-time subscription with retry logic
   */
  private async createRealtimeSubscription(subscriptionId: string, channelName: string): Promise<void> {
    const operation: RecoveryOperation<RealtimeChannel> = {
      id: subscriptionId,
      name: `Subscribe to ${channelName}`,
      operation: async () => {
        const channel = this.supabase.channel(channelName);
        
        return new Promise<RealtimeChannel>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Subscription timeout'));
          }, this.options.reconnectInterval);

          channel.subscribe((status, error) => {
            clearTimeout(timeout);
            
            if (status === 'SUBSCRIBED') {
              resolve(channel);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              reject(error || new Error(`Subscription failed with status: ${status}`));
            }
          });
        });
      },
      config: {
        maxRetries: this.options.maxReconnectAttempts,
        initialDelay: this.options.reconnectInterval,
        maxDelay: this.options.reconnectInterval * 5,
        strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
        jitterMax: 1000,
        timeoutMs: this.options.reconnectInterval * 2,
      },
      onSuccess: (channel) => {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          subscription.channel = channel;
          subscription.state = ConnectionState.CONNECTED;
          subscription.lastActivity = new Date();
          subscription.retryCount = 0;
          
          // Setup event listeners
          this.setupChannelListeners(subscriptionId, channel);
        }
        
        this.updateConnectionState();
        this.metrics.connectionCount++;
        this.metrics.lastConnected = new Date();
      },
      onFailure: (error, attempt) => {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          subscription.retryCount = attempt;
          subscription.state = ConnectionState.RECONNECTING;
        }
        this.metrics.errorsCount++;
      },
      onFinalFailure: async (error) => {
        const subscription = this.subscriptions.get(subscriptionId);
        if (subscription) {
          subscription.state = ConnectionState.FAILED;
          
          // Activate fallback if available
          if (this.options.enableFallbacks) {
            await this.evaluateDegradation();
          }
        }
        this.updateConnectionState();
      },
    };

    await retryRecoveryManager.executeWithRetry(subscriptionId, operation);
  }

  /**
   * Setup event listeners for a channel
   */
  private setupChannelListeners(subscriptionId: string, channel: RealtimeChannel): void {
    // Listen for data events and forward to callbacks
    channel.on('*', (payload) => {
      const callbacks = this.subscriptionCallbacks.get(subscriptionId);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(payload);
            this.metrics.messagesReceived++;
          } catch (error) {
            realtimeErrorHandler.logError(
              RealtimeErrorType.DATA_VALIDATION_ERROR,
              'Error in subscription callback',
              error as Error,
              { subscriptionId }
            );
          }
        });
      }

      // Update activity timestamp
      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription) {
        subscription.lastActivity = new Date();
      }
    });
  }

  /**
   * Activate fallback mechanism for a subscription
   */
  private async activateFallback(subscriptionId: string, fallbackFn: () => Promise<any>): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.fallbackActive) return;

    subscription.fallbackActive = true;

    // Setup polling fallback
    const pollingInterval = setInterval(async () => {
      try {
        const data = await fallbackFn();
        const callbacks = this.subscriptionCallbacks.get(subscriptionId);
        if (callbacks) {
          callbacks.forEach(callback => callback(data));
        }
      } catch (error) {
        realtimeErrorHandler.logError(
          RealtimeErrorType.NETWORK_ERROR,
          'Fallback polling failed',
          error as Error,
          { subscriptionId }
        );
      }
    }, this.options.pollingInterval);

    this.pollingIntervals.set(subscriptionId, pollingInterval);

    realtimeErrorHandler.logSuccess(
      `Fallback polling activated for ${subscription.channelName}`,
      { subscriptionId }
    );
  }

  /**
   * Evaluate and apply degradation strategies
   */
  private async evaluateDegradation(): Promise<void> {
    const failedSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.state === ConnectionState.FAILED || sub.retryCount >= this.options.maxReconnectAttempts);

    const failureCount = failedSubscriptions.length;

    // Determine appropriate degradation level
    let targetLevel = DegradationLevel.NONE;
    
    for (const [level, strategy] of this.fallbackStrategies.entries()) {
      if (strategy.enabled && failureCount >= strategy.activationThreshold) {
        targetLevel = level;
      }
    }

    if (targetLevel !== this.degradationLevel) {
      await this.setDegradationLevel(targetLevel);
    }
  }

  /**
   * Set degradation level and apply strategies
   */
  private async setDegradationLevel(level: DegradationLevel): Promise<void> {
    if (level === this.degradationLevel) return;

    const previousLevel = this.degradationLevel;
    this.degradationLevel = level;

    // Deactivate previous level strategy
    if (previousLevel !== DegradationLevel.NONE) {
      const prevStrategy = this.fallbackStrategies.get(previousLevel);
      prevStrategy?.onDeactivate?.();
    }

    // Activate new level strategy
    if (level !== DegradationLevel.NONE) {
      const strategy = this.fallbackStrategies.get(level);
      strategy?.onActivate?.();
      
      realtimeErrorHandler.logError(
        RealtimeErrorType.CONNECTION_FAILED,
        `Degradation level changed to ${level}: ${strategy?.description}`,
        undefined,
        {},
        RealtimeSeverity.MEDIUM
      );
    } else {
      realtimeErrorHandler.logSuccess('Connection fully restored, degradation disabled');
    }

    // Notify state change listeners
    this.notifyStateChange();
  }

  /**
   * Update overall connection state
   */
  private updateConnectionState(): void {
    const subscriptions = Array.from(this.subscriptions.values());
    
    if (subscriptions.length === 0) {
      this.setState(ConnectionState.DISCONNECTED);
      return;
    }

    const connectedCount = subscriptions.filter(sub => sub.state === ConnectionState.CONNECTED).length;
    const connectingCount = subscriptions.filter(sub => sub.state === ConnectionState.CONNECTING).length;
    const reconnectingCount = subscriptions.filter(sub => sub.state === ConnectionState.RECONNECTING).length;
    const failedCount = subscriptions.filter(sub => sub.state === ConnectionState.FAILED).length;

    if (connectedCount === subscriptions.length) {
      this.setState(ConnectionState.CONNECTED);
    } else if (connectedCount > 0 && failedCount > 0) {
      this.setState(ConnectionState.DEGRADED);
    } else if (reconnectingCount > 0) {
      this.setState(ConnectionState.RECONNECTING);
    } else if (connectingCount > 0) {
      this.setState(ConnectionState.CONNECTING);
    } else {
      this.setState(ConnectionState.FAILED);
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setState(state: ConnectionState): void {
    if (state === this.state) return;
    
    this.state = state;
    this.notifyStateChange();
    
    if (state === ConnectionState.DISCONNECTED || state === ConnectionState.FAILED) {
      this.metrics.lastDisconnected = new Date();
    }
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(this.state, this.degradationLevel);
      } catch (error) {
        console.error('Error in state change callback:', error);
      }
    });
  }

  /**
   * Initialize connection monitoring
   */
  private initializeConnectionMonitoring(): void {
    // Setup heartbeat
    this.heartbeatInterval = setInterval(() => {
      realtimeErrorHandler.updateHeartbeat();
      this.updateMetrics();
    }, this.options.heartbeatInterval);
  }

  /**
   * Update connection metrics
   */
  private updateMetrics(): void {
    const now = new Date();
    if (this.metrics.lastConnected) {
      this.metrics.uptime = now.getTime() - this.metrics.lastConnected.getTime();
    }
  }

  /**
   * Initialize metrics object
   */
  private initializeMetrics(): ConnectionMetrics {
    return {
      connectionCount: 0,
      reconnectCount: 0,
      lastConnected: null,
      lastDisconnected: null,
      uptime: 0,
      averageLatency: 0,
      messagesSent: 0,
      messagesReceived: 0,
      errorsCount: 0,
    };
  }
}

// Global connection manager instance
export const connectionManager = new RealtimeConnectionManager();

/**
 * React hook for using connection management
 */
import { useEffect, useState } from 'react';

export const useConnectionManager = () => {
  const [connectionState, setConnectionState] = useState(connectionManager.getConnectionState());
  const [metrics, setMetrics] = useState(connectionManager.getMetrics());
  const [subscriptions, setSubscriptions] = useState(connectionManager.getSubscriptions());

  useEffect(() => {
    const unsubscribe = connectionManager.onStateChange((state, degradation) => {
      setConnectionState({ state, degradation });
    });

    const interval = setInterval(() => {
      setMetrics(connectionManager.getMetrics());
      setSubscriptions(connectionManager.getSubscriptions());
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return {
    connectionState,
    metrics,
    subscriptions,
    subscribe: connectionManager.subscribe.bind(connectionManager),
    unsubscribe: connectionManager.unsubscribe.bind(connectionManager),
    forceReconnect: connectionManager.forceReconnect.bind(connectionManager),
    cleanup: connectionManager.cleanup.bind(connectionManager),
  };
};
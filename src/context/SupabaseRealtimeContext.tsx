'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSupabaseRealtime } from '@/hooks/chat-app/useSupabaseRealtime';
import { RealtimePresenceState } from '@supabase/supabase-js';
import { MessageWithRelations } from '@/types/chat-app';
import { 
  useRealtimeErrorHandling, 
  RealtimeErrorType, 
  RealtimeSeverity,
  RealtimeErrorUtils
} from '@/lib/realtime/error-handling';
import { useConnectionManager, ConnectionState, DegradationLevel } from '@/lib/realtime/connection-manager';

interface SupabaseRealtimeContextType {
  isConnected: boolean;
  connectionError: string | null;
  connectionState: ConnectionState;
  degradationLevel: DegradationLevel;
  isHealthy: boolean;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendTyping: (roomId: string, isTyping: boolean) => void;
  getPresence: () => RealtimePresenceState;
  onlineUsers: string[];
  refreshUserRooms: () => void;
  userRoomIds: string[];
  // Message event handlers
  onNewMessage?: (message: MessageWithRelations) => void;
  onMessageUpdated?: (message: MessageWithRelations) => void;
  onMessageDeleted?: (messageId: string, roomId: string) => void;
  setMessageCallbacks: (callbacks: {
    onNewMessage?: (message: MessageWithRelations) => void;
    onMessageUpdated?: (message: MessageWithRelations) => void;
    onMessageDeleted?: (messageId: string, roomId: string) => void;
  }) => void;
  // Error and recovery
  forceReconnect: () => Promise<void>;
  clearErrors: () => void;
  // Metrics
  connectionMetrics: {
    uptime: number;
    errorCount: number;
    reconnectCount: number;
    lastError?: string;
  };
}

const SupabaseRealtimeContext = createContext<SupabaseRealtimeContextType | null>(null);

interface SupabaseRealtimeProviderProps {
  children: React.ReactNode;
}

export const SupabaseRealtimeProvider: React.FC<SupabaseRealtimeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [messageCallbacks, setMessageCallbacks] = useState<{
    onNewMessage?: (message: MessageWithRelations) => void;
    onMessageUpdated?: (message: MessageWithRelations) => void;
    onMessageDeleted?: (messageId: string, roomId: string) => void;
  }>({});

  // Error handling and connection management
  const { stats, lastError, logError, logSuccess, clearHistory } = useRealtimeErrorHandling();
  const { connectionState, metrics, forceReconnect } = useConnectionManager();
  
  // State for health monitoring
  const [isHealthy, setIsHealthy] = useState(true);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<Date>(new Date());
  
  // Enhanced realtime hook with error handling
  const {
    isConnected,
    connectionError,
    joinRoom: originalJoinRoom,
    leaveRoom: originalLeaveRoom,
    sendTyping: originalSendTyping,
    getPresence,
    refreshUserRooms,
    userRoomIds,
  } = useSupabaseRealtime({
    userId: user?.id,
    enabled: !!user,
    messageCallbacks,
  });

  // Enhanced room management with error handling
  const joinRoom = useCallback((roomId: string) => {
    try {
      originalJoinRoom(roomId);
      logSuccess(`Successfully joined room: ${roomId}`, { roomId, userId: user?.id });
      lastActivityRef.current = new Date();
    } catch (error) {
      RealtimeErrorUtils.handleSubscriptionError(
        error,
        `join_room_${roomId}`,
        `room:${roomId}`,
        user?.id
      );
    }
  }, [originalJoinRoom, logSuccess, user?.id]);

  const leaveRoom = useCallback((roomId: string) => {
    try {
      originalLeaveRoom(roomId);
      logSuccess(`Successfully left room: ${roomId}`, { roomId, userId: user?.id });
      lastActivityRef.current = new Date();
    } catch (error) {
      RealtimeErrorUtils.handleCleanupError(
        `leave_room_${roomId}`,
        error as Error,
        { roomId, userId: user?.id }
      );
    }
  }, [originalLeaveRoom, logSuccess, user?.id]);

  const sendTyping = useCallback((roomId: string, isTyping: boolean) => {
    try {
      originalSendTyping(roomId, isTyping);
      lastActivityRef.current = new Date();
    } catch (error) {
      logError(
        RealtimeErrorType.NETWORK_ERROR,
        `Failed to send typing indicator for room ${roomId}`,
        error as Error,
        { roomId, userId: user?.id, isTyping },
        RealtimeSeverity.LOW
      );
    }
  }, [originalSendTyping, logError, user?.id]);

  // Enhanced presence monitoring with error handling
  useEffect(() => {
    if (!isConnected) {
      setOnlineUsers([]);
      return;
    }

    const interval = setInterval(() => {
      try {
        const presence = getPresence();
        const userIds = Object.keys(presence).filter(key => {
          const presenceData = presence[key];
          return presenceData && presenceData.length > 0;
        });
        
        setOnlineUsers(userIds);
        lastActivityRef.current = new Date();
        
        // Log presence sync success periodically
        if (Date.now() % 30000 < 5000) { // Every ~30 seconds
          logSuccess(`Presence synced with ${userIds.length} online users`);
        }
      } catch (error) {
        logError(
          RealtimeErrorType.DATA_VALIDATION_ERROR,
          'Failed to update presence data',
          error as Error,
          { userId: user?.id },
          RealtimeSeverity.LOW
        );
        setOnlineUsers([]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected, getPresence, logError, logSuccess, user?.id]);

  // Health monitoring
  useEffect(() => {
    healthCheckIntervalRef.current = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
      const isCurrentlyHealthy = 
        isConnected && 
        connectionState.state === ConnectionState.CONNECTED &&
        connectionState.degradation === DegradationLevel.NONE &&
        timeSinceLastActivity < 60000 && // Less than 1 minute since last activity
        stats.totalErrors < 10; // Less than 10 total errors

      if (isCurrentlyHealthy !== isHealthy) {
        setIsHealthy(isCurrentlyHealthy);
        
        if (isCurrentlyHealthy) {
          logSuccess('Real-time system health restored');
        } else {
          logError(
            RealtimeErrorType.CONNECTION_FAILED,
            'Real-time system health degraded',
            undefined,
            { 
              userId: user?.id,
              timeSinceLastActivity,
              connectionState: connectionState.state,
              degradation: connectionState.degradation,
              totalErrors: stats.totalErrors
            },
            RealtimeSeverity.MEDIUM
          );
        }
      }
    }, 10000); // Check every 10 seconds

    return () => {
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
      }
    };
  }, [isConnected, connectionState, stats.totalErrors, isHealthy, logError, logSuccess, user?.id]);

  // Connection error monitoring
  useEffect(() => {
    if (connectionError) {
      logError(
        RealtimeErrorType.CONNECTION_FAILED,
        connectionError,
        undefined,
        { userId: user?.id },
        RealtimeSeverity.HIGH
      );
    }
  }, [connectionError, logError, user?.id]);

  // Enhanced message callback wrapper with error handling
  const setMessageCallbacksWithErrorHandling = useCallback((callbacks: {
    onNewMessage?: (message: MessageWithRelations) => void;
    onMessageUpdated?: (message: MessageWithRelations) => void;
    onMessageDeleted?: (messageId: string, roomId: string) => void;
  }) => {
    const wrappedCallbacks = {
      onNewMessage: callbacks.onNewMessage ? (message: MessageWithRelations) => {
        try {
          callbacks.onNewMessage!(message);
          lastActivityRef.current = new Date();
        } catch (error) {
          logError(
            RealtimeErrorType.DATA_VALIDATION_ERROR,
            'Error in onNewMessage callback',
            error as Error,
            { messageId: message.id, roomId: message.room_id, userId: user?.id },
            RealtimeSeverity.MEDIUM
          );
        }
      } : undefined,
      
      onMessageUpdated: callbacks.onMessageUpdated ? (message: MessageWithRelations) => {
        try {
          callbacks.onMessageUpdated!(message);
          lastActivityRef.current = new Date();
        } catch (error) {
          logError(
            RealtimeErrorType.DATA_VALIDATION_ERROR,
            'Error in onMessageUpdated callback',
            error as Error,
            { messageId: message.id, roomId: message.room_id, userId: user?.id },
            RealtimeSeverity.MEDIUM
          );
        }
      } : undefined,
      
      onMessageDeleted: callbacks.onMessageDeleted ? (messageId: string, roomId: string) => {
        try {
          callbacks.onMessageDeleted!(messageId, roomId);
          lastActivityRef.current = new Date();
        } catch (error) {
          logError(
            RealtimeErrorType.DATA_VALIDATION_ERROR,
            'Error in onMessageDeleted callback',
            error as Error,
            { messageId, roomId, userId: user?.id },
            RealtimeSeverity.MEDIUM
          );
        }
      } : undefined,
    };

    setMessageCallbacks(wrappedCallbacks);
  }, [logError, user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (healthCheckIntervalRef.current) {
          clearInterval(healthCheckIntervalRef.current);
        }
        logSuccess('SupabaseRealtimeProvider cleaned up successfully');
      } catch (error) {
        console.error('Error during SupabaseRealtimeProvider cleanup:', error);
      }
    };
  }, [logSuccess]);

  // Connection metrics computation
  const connectionMetrics = {
    uptime: metrics.uptime,
    errorCount: stats.totalErrors,
    reconnectCount: metrics.reconnectCount,
    lastError: lastError?.userMessage,
  };

  const contextValue: SupabaseRealtimeContextType = {
    isConnected,
    connectionError,
    connectionState: connectionState.state,
    degradationLevel: connectionState.degradation,
    isHealthy,
    joinRoom,
    leaveRoom,
    sendTyping,
    getPresence,
    onlineUsers,
    refreshUserRooms,
    userRoomIds,
    onNewMessage: messageCallbacks.onNewMessage,
    onMessageUpdated: messageCallbacks.onMessageUpdated,
    onMessageDeleted: messageCallbacks.onMessageDeleted,
    setMessageCallbacks: setMessageCallbacksWithErrorHandling,
    forceReconnect,
    clearErrors: clearHistory,
    connectionMetrics,
  };

  return (
    <SupabaseRealtimeContext.Provider value={contextValue}>
      {children}
    </SupabaseRealtimeContext.Provider>
  );
};

export const useSupabaseRealtimeContext = (): SupabaseRealtimeContextType => {
  const context = useContext(SupabaseRealtimeContext);
  if (!context) {
    throw new Error('useSupabaseRealtimeContext must be used within a SupabaseRealtimeProvider');
  }
  return context;
};

export default SupabaseRealtimeProvider;
'use client';

import { useEffect, useCallback } from 'react';
import { useSupabaseRealtimeContext } from '@/context/SupabaseRealtimeContext';
import { MessageWithRelations } from '@/types/chat-app';

interface UseChatMessagesOptions {
  onNewMessage?: (message: MessageWithRelations) => void;
  onMessageUpdated?: (message: MessageWithRelations) => void;
  onMessageDeleted?: (messageId: string, roomId: string) => void;
}

/**
 * Hook for handling real-time chat messages
 * This is a convenience hook that sets up message callbacks with the realtime context
 */
export const useChatMessages = ({
  onNewMessage,
  onMessageUpdated,
  onMessageDeleted,
}: UseChatMessagesOptions = {}) => {
  const {
    isConnected,
    connectionError,
    userRoomIds,
    setMessageCallbacks,
    refreshUserRooms,
  } = useSupabaseRealtimeContext();

  // Setup message callbacks
  useEffect(() => {
    setMessageCallbacks({
      onNewMessage,
      onMessageUpdated,
      onMessageDeleted,
    });
  }, [onNewMessage, onMessageUpdated, onMessageDeleted, setMessageCallbacks]);

  // Provide a way to manually refresh room memberships
  const refreshRooms = useCallback(() => {
    refreshUserRooms();
  }, [refreshUserRooms]);

  return {
    isConnected,
    connectionError,
    userRoomIds,
    refreshRooms,
  };
};

export default useChatMessages;
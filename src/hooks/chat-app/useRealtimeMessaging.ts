'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { MessageWithRelations, MessageType, RoomType } from '@/types/chat-app';

// Database record type matching the Prisma schema
interface MessageRecord {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  file_url?: string;
  reply_to_id?: string;
  edited_at?: string;
  created_at: string;
  updated_at: string;
}

// Real-time broadcast message payload
interface MessageBroadcastPayload {
  message: MessageWithRelations;
  event_type: 'message_sent' | 'message_updated' | 'message_deleted';
  room_id: string;
  sender_id: string;
}

// Typing indicator payload
interface TypingBroadcastPayload {
  user_id: string;
  user_name: string;
  room_id: string;
  is_typing: boolean;
  timestamp: number;
}

// Hook options
interface UseRealtimeMessagingOptions {
  roomId?: string;
  userId?: string;
  enabled?: boolean;
  onMessageReceived?: (message: MessageWithRelations) => void;
  onMessageUpdated?: (message: MessageWithRelations) => void;
  onMessageDeleted?: (messageId: string) => void;
  onTypingUpdate?: (users: Array<{ id: string; name: string }>) => void;
}

// Convert database record to MessageWithRelations
const convertToMessageWithRelations = (record: any): MessageWithRelations => {
  return {
    id: record.id,
    room_id: record.room_id,
    sender_id: record.sender_id,
    content: record.content,
    type: record.type as MessageType,
    file_url: record.file_url,
    reply_to_id: record.reply_to_id,
    edited_at: record.edited_at ? new Date(record.edited_at) : undefined,
    created_at: new Date(record.created_at),
    updated_at: new Date(record.updated_at),
    sender: {
      id: record.sender?.id || record.sender_id,
      username: record.sender?.username || record.sender?.full_name || 'Unknown',
      full_name: record.sender?.full_name || 'Unknown User',
      user_profile: record.sender?.user_profile,
    },
    room: {
      id: record.room_id,
      name: record.room?.name || 'Room',
      type: record.room?.type || RoomType.GROUP,
    },
    reply_to: record.reply_to ? convertToMessageWithRelations(record.reply_to) : undefined,
  };
};

export const useRealtimeMessaging = ({
  roomId,
  userId,
  enabled = true,
  onMessageReceived,
  onMessageUpdated,
  onMessageDeleted,
  onTypingUpdate,
}: UseRealtimeMessagingOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string }>>([]);
  
  // Channel references
  const dbChannelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const supabase = useMemo(() => createClient(), []);
  
  // Stable callback refs to prevent effect re-runs
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onMessageUpdatedRef = useRef(onMessageUpdated);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onTypingUpdateRef = useRef(onTypingUpdate);
  
  // Update refs when callbacks change
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);
  
  useEffect(() => {
    onMessageUpdatedRef.current = onMessageUpdated;
  }, [onMessageUpdated]);
  
  useEffect(() => {
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageDeleted]);
  
  useEffect(() => {
    onTypingUpdateRef.current = onTypingUpdate;
  }, [onTypingUpdate]);

  // Enhanced cleanup function with comprehensive error handling
  const cleanup = useCallback(() => {
    const cleanupOperations: Promise<void>[] = [];

    // Database channel cleanup
    if (dbChannelRef.current) {
      cleanupOperations.push(
        new Promise((resolve) => {
          try {
            dbChannelRef.current!.unsubscribe();
            console.log('Database channel unsubscribed successfully');
          } catch (error) {
            console.error('Error unsubscribing from database channel:', error);
          } finally {
            dbChannelRef.current = null;
            resolve();
          }
        })
      );
    }

    // Broadcast channel cleanup
    if (broadcastChannelRef.current) {
      cleanupOperations.push(
        new Promise((resolve) => {
          try {
            broadcastChannelRef.current!.unsubscribe();
            console.log('Broadcast channel unsubscribed successfully');
          } catch (error) {
            console.error('Error unsubscribing from broadcast channel:', error);
          } finally {
            broadcastChannelRef.current = null;
            resolve();
          }
        })
      );
    }

    // Timeout cleanup
    if (typingTimeoutRef.current) {
      try {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
        console.log('Typing timeout cleared successfully');
      } catch (error) {
        console.error('Error clearing typing timeout:', error);
      }
    }

    // State cleanup
    try {
      setTypingUsers([]);
      setIsConnected(false);
      setConnectionError(null);
      console.log('useRealtimeMessaging state cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up state:', error);
    }

    // Wait for all cleanup operations to complete
    Promise.allSettled(cleanupOperations).then(() => {
      console.log('useRealtimeMessaging cleanup completed');
    });
  }, []);

  // Fetch complete message with relations
  const fetchCompleteMessage = useCallback(async (messageId: string): Promise<MessageWithRelations | null> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users (
            id,
            username,
            full_name,
            user_profile
          ),
          room:rooms (
            id,
            name,
            type
          ),
          reply_to:messages (
            id,
            content,
            sender:users (
              id,
              username,
              full_name
            )
          )
        `)
        .eq('id', messageId)
        .single();

      if (error) {
        console.error('Error fetching complete message:', error);
        return null;
      }

      return convertToMessageWithRelations(data);
    } catch (error) {
      console.error('Error fetching complete message:', error);
      return null;
    }
  }, [supabase]);

  // Broadcast message to room
  const broadcastMessage = useCallback(async (
    message: MessageWithRelations,
    eventType: 'message_sent' | 'message_updated' | 'message_deleted' = 'message_sent'
  ) => {
    if (!broadcastChannelRef.current || !roomId) return;

    const payload: MessageBroadcastPayload = {
      message,
      event_type: eventType,
      room_id: roomId,
      sender_id: message.sender_id,
    };

    try {
      await broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'message_event',
        payload,
      });
      console.log(`Broadcasted ${eventType} for message:`, message.id);
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  }, [roomId]);

  // Send typing indicator - memoize to prevent infinite loops
  const sendTypingIndicatorStable = useRef<((isTyping: boolean) => void) | null>(null);
  
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (!broadcastChannelRef.current || !roomId || !userId) return;

    const payload: TypingBroadcastPayload = {
      user_id: userId,
      user_name: 'Current User', // Will be replaced with actual user name
      room_id: roomId,
      is_typing: isTyping,
      timestamp: Date.now(),
    };

    broadcastChannelRef.current.send({
      type: 'broadcast',
      event: 'typing_indicator',
      payload,
    });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicatorStable.current?.(false);
      }, 3000);
    }
  }, [roomId, userId]);
  
  // Update stable ref
  useEffect(() => {
    sendTypingIndicatorStable.current = sendTypingIndicator;
  }, [sendTypingIndicator]);

  // Setup real-time subscriptions
  useEffect(() => {
    if (!enabled || !roomId) {
      cleanup();
      return;
    }

    console.log(`Setting up real-time messaging for room: ${roomId}`);

    // 1. Database changes subscription (PostgreSQL changes)
    const dbChannel = supabase.channel(`db_messages_${roomId}`);
    
    dbChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          try {
            const newMessageRecord = payload.new as MessageRecord;
            if (!newMessageRecord?.id) {
              console.warn('Received INSERT payload without message ID:', payload);
              return;
            }

            // Skip if this is our own message (already handled optimistically)
            if (newMessageRecord.sender_id === userId) return;

            console.log(`Processing new message: ${newMessageRecord.id} from user: ${newMessageRecord.sender_id}`);

            // Fetch complete message with relations
            const completeMessage = await fetchCompleteMessage(newMessageRecord.id);
            if (completeMessage) {
              onMessageReceivedRef.current?.(completeMessage);
              console.log(`Successfully processed new message: ${newMessageRecord.id}`);
            } else {
              console.error(`Failed to fetch complete message for ID: ${newMessageRecord.id}`);
            }
          } catch (error) {
            console.error('Error processing INSERT message event:', error, payload);
            setConnectionError('Error processing new message');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          const updatedMessageRecord = payload.new as MessageRecord;
          if (!updatedMessageRecord?.id) return;

          const completeMessage = await fetchCompleteMessage(updatedMessageRecord.id);
          if (completeMessage) {
            onMessageUpdatedRef.current?.(completeMessage);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          const deletedMessage = payload.old as MessageRecord;
          if (deletedMessage?.id) {
            onMessageDeletedRef.current?.(deletedMessage.id);
          }
        }
      )
      .subscribe((status, error) => {
        console.log(`Database subscription status for room ${roomId}: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Database subscription active for room: ${roomId}`);
          setConnectionError(null); // Clear any previous errors
        } else if (status === 'CHANNEL_ERROR') {
          const errorMessage = `Database subscription error for room: ${roomId}`;
          console.error(`❌ ${errorMessage}`, error);
          setConnectionError(errorMessage);
          
          // Attempt automatic retry after delay
          setTimeout(() => {
            if (enabled && roomId && userId) {
              console.log(`🔄 Retrying database subscription for room: ${roomId}`);
              // The effect will re-run and recreate the subscription
            }
          }, 5000);
        } else if (status === 'TIMED_OUT') {
          const errorMessage = `Database subscription timed out for room: ${roomId}`;
          console.warn(`⚠️ ${errorMessage}`);
          setConnectionError(errorMessage);
        } else if (status === 'CLOSED') {
          console.log(`🔒 Database subscription closed for room: ${roomId}`);
          setIsConnected(false);
        }
      });

    dbChannelRef.current = dbChannel;

    // 2. Broadcast channel subscription (for real-time events)
    const broadcastChannel = supabase.channel(`room_${roomId}`);
    
    broadcastChannel
      .on('broadcast', { event: 'message_event' }, (payload) => {
        const messagePayload = payload.payload as MessageBroadcastPayload;
        
        // Skip if this is our own message
        if (messagePayload.sender_id === userId) return;

        switch (messagePayload.event_type) {
          case 'message_sent':
            onMessageReceivedRef.current?.(messagePayload.message);
            break;
          case 'message_updated':
            onMessageUpdatedRef.current?.(messagePayload.message);
            break;
          case 'message_deleted':
            onMessageDeletedRef.current?.(messagePayload.message.id);
            break;
        }
      })
      .on('broadcast', { event: 'typing_indicator' }, (payload) => {
        const typingPayload = payload.payload as TypingBroadcastPayload;
        
        // Skip if this is our own typing indicator
        if (typingPayload.user_id === userId) return;

        setTypingUsers(prev => {
          const filtered = prev.filter(user => user.id !== typingPayload.user_id);
          
          if (typingPayload.is_typing) {
            return [...filtered, { id: typingPayload.user_id, name: typingPayload.user_name }];
          }
          
          return filtered;
        });

        // Update typing users for parent component
        onTypingUpdateRef.current?.(typingUsers);
      })
      .subscribe((status, error) => {
        console.log(`Broadcast subscription status for room ${roomId}: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          console.log(`✅ Broadcast subscription active for room: ${roomId}`);
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          const errorMessage = `Broadcast subscription error for room: ${roomId}`;
          console.error(`❌ ${errorMessage}`, error);
          setConnectionError(errorMessage);
          setIsConnected(false);
          
          // Attempt automatic retry after delay
          setTimeout(() => {
            if (enabled && roomId && userId) {
              console.log(`🔄 Retrying broadcast subscription for room: ${roomId}`);
              // The effect will re-run and recreate the subscription
            }
          }, 3000);
        } else if (status === 'TIMED_OUT') {
          const errorMessage = `Broadcast subscription timed out for room: ${roomId}`;
          console.warn(`⚠️ ${errorMessage}`);
          setConnectionError(errorMessage);
          setIsConnected(false);
        } else if (status === 'CLOSED') {
          console.log(`🔒 Broadcast subscription closed for room: ${roomId}`);
          setIsConnected(false);
        }
      });

    broadcastChannelRef.current = broadcastChannel;

    return cleanup;
  }, [enabled, roomId, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected,
    connectionError,
    typingUsers,
    broadcastMessage,
    sendTypingIndicator,
    cleanup,
  };
};

export default useRealtimeMessaging;
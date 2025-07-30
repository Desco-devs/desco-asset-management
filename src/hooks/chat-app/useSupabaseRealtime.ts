'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { MessageWithRelations, MessageCallbacks } from '@/types/chat-app';

interface UseSupabaseRealtimeOptions {
  userId?: string;
  enabled?: boolean;
  messageCallbacks?: MessageCallbacks;
}

/**
 * Enhanced Supabase Realtime Hook for Chat System
 * 
 * This hook provides comprehensive real-time functionality for the chat system including:
 * - Database change subscriptions for messages (INSERT, UPDATE, DELETE)
 * - Room membership change detection
 * - Presence tracking for online users
 * - Broadcast events for typing indicators
 * - Automatic room filtering based on user memberships
 * - Error handling and reconnection logic
 * 
 * Key Features:
 * - Messages are automatically filtered by rooms the user is a member of
 * - Subscriptions are automatically updated when user joins/leaves rooms
 * - Provides callbacks for handling real-time message events
 * - Maintains existing presence and broadcast functionality
 * - Includes proper cleanup and error handling
 * 
 * @param options Configuration options
 * @param options.userId - The current user's ID
 * @param options.enabled - Whether the realtime connection is enabled
 * @param options.messageCallbacks - Callbacks for handling message events
 * 
 * @returns Object with connection state and methods for interaction
 */

export const useSupabaseRealtime = ({ 
  userId, 
  enabled = true,
  messageCallbacks
}: UseSupabaseRealtimeOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [userRoomIds, setUserRoomIds] = useState<string[]>([]);
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const roomMembershipsChannelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user's room memberships
  const fetchUserRooms = useCallback(async () => {
    if (!userId) return;

    try {
      const supabase = createClient();
      const { data: memberships, error } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user rooms:', error);
        return;
      }

      const roomIds = memberships?.map(m => m.room_id) || [];
      setUserRoomIds(roomIds);
    } catch (error) {
      console.error('Error fetching user rooms:', error);
    }
  }, [userId]);

  // Handle reconnection with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log('Attempting to reconnect...');
      fetchUserRooms();
    }, 3000);
  }, [fetchUserRooms]);

  // Setup messages subscription with database changes
  const setupMessagesSubscription = useCallback(() => {
    if (!enabled || !userId || userRoomIds.length === 0) return;

    const supabase = createClient();
    
    // Unsubscribe from existing messages channel
    if (messagesChannelRef.current) {
      messagesChannelRef.current.unsubscribe();
    }

    const messagesChannel = supabase
      .channel('messages-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=in.(${userRoomIds.join(',')})`
        },
        async (payload) => {
          try {
            // Fetch complete message with relations
            const { data: message, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users!messages_sender_id_fkey (
                  id,
                  username,
                  full_name,
                  user_profile
                ),
                room:rooms!messages_room_id_fkey (
                  id,
                  name,
                  type
                ),
                reply_to:messages!messages_reply_to_id_fkey (
                  *,
                  sender:users!messages_sender_id_fkey (
                    id,
                    username,
                    full_name,
                    user_profile
                  )
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching new message:', error);
              return;
            }

            if (message && messageCallbacks?.onNewMessage) {
              messageCallbacks.onNewMessage(message as MessageWithRelations);
            }
          } catch (error) {
            console.error('Error processing new message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=in.(${userRoomIds.join(',')})`
        },
        async (payload) => {
          try {
            // Fetch complete updated message with relations
            const { data: message, error } = await supabase
              .from('messages')
              .select(`
                *,
                sender:users!messages_sender_id_fkey (
                  id,
                  username,
                  full_name,
                  user_profile
                ),
                room:rooms!messages_room_id_fkey (
                  id,
                  name,
                  type
                ),
                reply_to:messages!messages_reply_to_id_fkey (
                  *,
                  sender:users!messages_sender_id_fkey (
                    id,
                    username,
                    full_name,
                    user_profile
                  )
                )
              `)
              .eq('id', payload.new.id)
              .single();

            if (error) {
              console.error('Error fetching updated message:', error);
              return;
            }

            if (message && messageCallbacks?.onMessageUpdated) {
              messageCallbacks.onMessageUpdated(message as MessageWithRelations);
            }
          } catch (error) {
            console.error('Error processing updated message:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `room_id=in.(${userRoomIds.join(',')})`
        },
        (payload) => {
          try {
            if (messageCallbacks?.onMessageDeleted && payload.old) {
              messageCallbacks.onMessageDeleted(payload.old.id, payload.old.room_id);
            }
          } catch (error) {
            console.error('Error processing deleted message:', error);
          }
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.log('Messages subscription active');
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Messages subscription error:', error);
          setConnectionError('Failed to connect to messages');
          attemptReconnect();
        } else if (status === 'TIMED_OUT') {
          console.warn('Messages subscription timed out');
          setConnectionError('Connection timed out');
          attemptReconnect();
        } else if (status === 'CLOSED') {
          console.log('Messages subscription closed');
          setIsConnected(false);
        }
      });

    messagesChannelRef.current = messagesChannel;
  }, [enabled, userId, userRoomIds, messageCallbacks, attemptReconnect]);

  // Setup room memberships subscription to detect when user joins/leaves rooms
  const setupRoomMembershipsSubscription = useCallback(() => {
    if (!enabled || !userId) return;

    const supabase = createClient();
    
    // Unsubscribe from existing room memberships channel
    if (roomMembershipsChannelRef.current) {
      roomMembershipsChannelRef.current.unsubscribe();
    }

    const roomMembershipsChannel = supabase
      .channel('room-memberships-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_members',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('User joined a room:', payload.new);
          // Refresh user rooms when they join a new room
          fetchUserRooms();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_members',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('User left a room:', payload.old);
          // Refresh user rooms when they leave a room
          fetchUserRooms();
        }
      )
      .subscribe((status, error) => {
        if (status === 'SUBSCRIBED') {
          console.log('Room memberships subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Room memberships subscription error:', error);
        } else if (status === 'TIMED_OUT') {
          console.warn('Room memberships subscription timed out');
        }
      });

    roomMembershipsChannelRef.current = roomMembershipsChannel;
  }, [enabled, userId, fetchUserRooms]);

  // Setup presence channel for online status
  useEffect(() => {
    if (!enabled || !userId) return;

    const supabase = createClient();
    const presenceChannel = supabase.channel('presence', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log('Presence synced');
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    presenceChannelRef.current = presenceChannel;

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [userId, enabled]);

  // Effect to fetch user rooms on mount and when userId changes
  useEffect(() => {
    if (enabled && userId) {
      fetchUserRooms();
    }
  }, [enabled, userId]);

  // Effect to setup room memberships subscription
  useEffect(() => {
    if (enabled && userId) {
      setupRoomMembershipsSubscription();
    }

    return () => {
      if (roomMembershipsChannelRef.current) {
        roomMembershipsChannelRef.current.unsubscribe();
        roomMembershipsChannelRef.current = null;
      }
    };
  }, [enabled, userId]);

  // Effect to setup messages subscription when user rooms change
  useEffect(() => {
    if (enabled && userId && userRoomIds.length > 0) {
      setupMessagesSubscription();
    }

    return () => {
      if (messagesChannelRef.current) {
        messagesChannelRef.current.unsubscribe();
        messagesChannelRef.current = null;
      }
    };
  }, [enabled, userId, userRoomIds]);

  // Join room channel
  const joinRoom = (roomId: string) => {
    if (!roomId || channelsRef.current.has(roomId)) return;

    const supabase = createClient();
    const channel = supabase.channel(`room:${roomId}`);
    
    channel
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('Typing event:', payload);
      })
      .on('broadcast', { event: 'message' }, (payload) => {
        console.log('Message broadcast:', payload);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Joined room: ${roomId}`);
        }
      });

    channelsRef.current.set(roomId, channel);
  };

  // Leave room channel
  const leaveRoom = (roomId: string) => {
    const channel = channelsRef.current.get(roomId);
    if (channel) {
      channel.unsubscribe();
      channelsRef.current.delete(roomId);
      console.log(`Left room: ${roomId}`);
    }
  };

  // Send typing indicator
  const sendTyping = (roomId: string, isTyping: boolean) => {
    const channel = channelsRef.current.get(roomId);
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, isTyping, timestamp: Date.now() },
      });
    }
  };

  // Get presence state
  const getPresence = (): RealtimePresenceState => {
    return presenceChannelRef.current?.presenceState() || {};
  };

  // Refresh user rooms (call this when user joins/leaves rooms)
  const refreshUserRooms = useCallback(() => {
    fetchUserRooms();
  }, [fetchUserRooms]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear reconnection timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      // Unsubscribe from all channels
      channelsRef.current.forEach((channel) => {
        channel.unsubscribe();
      });
      channelsRef.current.clear();

      // Unsubscribe from presence channel
      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
      }

      // Unsubscribe from messages channel
      if (messagesChannelRef.current) {
        messagesChannelRef.current.unsubscribe();
      }

      // Unsubscribe from room memberships channel
      if (roomMembershipsChannelRef.current) {
        roomMembershipsChannelRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    isConnected,
    connectionError,
    joinRoom,
    leaveRoom,
    sendTyping,
    getPresence,
    refreshUserRooms,
    userRoomIds,
  };
};

export default useSupabaseRealtime;
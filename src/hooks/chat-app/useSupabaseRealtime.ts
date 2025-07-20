'use client';

import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

interface UseSupabaseRealtimeOptions {
  userId?: string;
  enabled?: boolean;
}

export const useSupabaseRealtime = ({ 
  userId, 
  enabled = true 
}: UseSupabaseRealtimeOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all channels
      channelsRef.current.forEach((channel) => {
        channel.unsubscribe();
      });
      channelsRef.current.clear();

      if (presenceChannelRef.current) {
        presenceChannelRef.current.unsubscribe();
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
  };
};

export default useSupabaseRealtime;
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';

// User presence data
interface UserPresence {
  user_id: string;
  username: string;
  full_name: string;
  user_profile?: string;
  online_at: string;
  last_seen?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

// Typing indicator data
interface TypingIndicator {
  user_id: string;
  username: string;
  room_id: string;
  started_at: number;
  last_update: number;
}

// Hook options
interface UsePresenceAndTypingOptions {
  userId?: string;
  roomId?: string;
  enabled?: boolean;
  typingTimeout?: number; // milliseconds after which typing stops
  presenceHeartbeatInterval?: number; // milliseconds between presence updates
  onUserPresenceChanged?: (userId: string, isOnline: boolean) => void;
  onTypingChanged?: (typingUsers: TypingIndicator[]) => void;
}

export const usePresenceAndTyping = ({
  userId,
  roomId,
  enabled = true,
  typingTimeout = 3000, // 3 seconds
  presenceHeartbeatInterval = 30000, // 30 seconds
  onUserPresenceChanged,
  onTypingChanged,
}: UsePresenceAndTypingOptions) => {
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map());
  const [isPresenceConnected, setIsPresenceConnected] = useState(false);
  const [isTypingConnected, setIsTypingConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Channel references
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  
  // Timers
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const presenceHeartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const typingCleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const supabase = createClient();

  // Enhanced cleanup function with comprehensive error handling
  const cleanup = useCallback(() => {
    console.log('🧹 Starting presence and typing cleanup...');
    
    // Clear all timers with error handling
    const timers = [
      { ref: typingTimeoutRef, name: 'typing timeout' },
      { ref: presenceHeartbeatRef, name: 'presence heartbeat' },
      { ref: typingCleanupIntervalRef, name: 'typing cleanup interval' }
    ];

    timers.forEach(({ ref, name }) => {
      if (ref.current) {
        try {
          clearTimeout(ref.current);
          ref.current = null;
          console.log(`✅ Cleared ${name}`);
        } catch (error) {
          console.error(`❌ Error clearing ${name}:`, error);
        }
      }
    });

    // Unsubscribe from channels with error handling
    const channels = [
      { ref: presenceChannelRef, name: 'presence' },
      { ref: typingChannelRef, name: 'typing' }
    ];

    channels.forEach(({ ref, name }) => {
      if (ref.current) {
        try {
          // Untrack presence before unsubscribing
          if (name === 'presence') {
            ref.current.untrack();
            console.log(`✅ Untracked ${name} channel`);
          }
          
          ref.current.unsubscribe();
          ref.current = null;
          console.log(`✅ Unsubscribed from ${name} channel`);
        } catch (error) {
          console.error(`❌ Error cleaning up ${name} channel:`, error);
          // Still set to null to prevent memory leaks
          ref.current = null;
        }
      }
    });

    // Clear state with error handling
    try {
      setOnlineUsers(new Map());
      setTypingUsers(new Map());
      setIsPresenceConnected(false);
      setIsTypingConnected(false);
      setError(null);
      console.log('✅ Presence and typing state cleared');
    } catch (error) {
      console.error('❌ Error clearing presence and typing state:', error);
    }

    console.log('🧹 Presence and typing cleanup completed');
  }, []);

  // Get current user data for presence
  const getCurrentUserData = useCallback(async (): Promise<UserPresence | null> => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, full_name, user_profile')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user data:', error);
        return null;
      }

      return {
        user_id: data.id,
        username: data.username || data.full_name,
        full_name: data.full_name,
        user_profile: data.user_profile,
        online_at: new Date().toISOString(),
        status: 'online',
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  }, [userId, supabase]);

  // Setup global presence channel
  useEffect(() => {
    if (!enabled || !userId) {
      cleanup();
      return;
    }

    const setupPresence = async () => {
      const userData = await getCurrentUserData();
      if (!userData) return;

      console.log('Setting up presence for user:', userId);

      const presenceChannel = supabase.channel('global_presence', {
        config: {
          presence: {
            key: userId,
          },
        },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          console.log('Presence synced, online users:', Object.keys(state).length);
          
          const presenceMap = new Map<string, UserPresence>();
          Object.entries(state).forEach(([key, presences]) => {
            const presence = (presences as any[])[0];
            if (presence) {
              presenceMap.set(key, presence);
            }
          });
          
          setOnlineUsers(presenceMap);
          setIsPresenceConnected(true);
          setError(null);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined presence:', key);
          const presence = (newPresences as any[])[0];
          if (presence) {
            setOnlineUsers(prev => new Map(prev).set(key, presence));
            onUserPresenceChanged?.(key, true);
          }
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left presence:', key);
          setOnlineUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(key);
            return newMap;
          });
          onUserPresenceChanged?.(key, false);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Presence channel subscribed');
            
            // Track our presence
            await presenceChannel.track(userData);
            
            // Setup heartbeat to maintain presence
            presenceHeartbeatRef.current = setInterval(async () => {
              const currentUserData = await getCurrentUserData();
              if (currentUserData) {
                await presenceChannel.track(currentUserData);
              }
            }, presenceHeartbeatInterval);
          } else if (status === 'CHANNEL_ERROR') {
            console.error('Presence channel error');
            setError('Presence connection failed');
            setIsPresenceConnected(false);
          }
        });

      presenceChannelRef.current = presenceChannel;
    };

    setupPresence();

    return cleanup;
  }, [enabled, userId, supabase, getCurrentUserData, presenceHeartbeatInterval, onUserPresenceChanged, cleanup]);

  // Setup room-specific typing channel
  useEffect(() => {
    if (!enabled || !userId || !roomId) {
      if (typingChannelRef.current) {
        typingChannelRef.current.unsubscribe();
        typingChannelRef.current = null;
      }
      return;
    }

    console.log('Setting up typing indicators for room:', roomId);

    const typingChannel = supabase.channel(`room_typing_${roomId}`);

    // Typing cleanup interval - remove stale typing indicators
    typingCleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setTypingUsers(prev => {
        const updated = new Map(prev);
        let hasChanges = false;

        updated.forEach((typing, key) => {
          if (now - typing.last_update > typingTimeout) {
            updated.delete(key);
            hasChanges = true;
          }
        });

        if (hasChanges) {
          const typingArray = Array.from(updated.values());
          onTypingChanged?.(typingArray);
          return updated;
        }
        return prev;
      });
    }, 1000); // Check every second

    typingChannel
      .on('broadcast', { event: 'typing_start' }, (payload) => {
        const typing = payload.payload as TypingIndicator;
        if (typing.user_id === userId) return; // Skip our own typing

        setTypingUsers(prev => {
          const updated = new Map(prev);
          updated.set(typing.user_id, {
            ...typing,
            last_update: Date.now(),
          });
          onTypingChanged?.(Array.from(updated.values()));
          return updated;
        });
      })
      .on('broadcast', { event: 'typing_stop' }, (payload) => {
        const typing = payload.payload as TypingIndicator;
        if (typing.user_id === userId) return; // Skip our own typing

        setTypingUsers(prev => {
          const updated = new Map(prev);
          updated.delete(typing.user_id);
          onTypingChanged?.(Array.from(updated.values()));
          return updated;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Typing channel subscribed for room: ${roomId}`);
          setIsTypingConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Typing channel error for room: ${roomId}`);
          setError('Typing indicators connection failed');
          setIsTypingConnected(false);
        }
      });

    typingChannelRef.current = typingChannel;

    return () => {
      if (typingChannelRef.current) {
        typingChannelRef.current.unsubscribe();
        typingChannelRef.current = null;
      }
      if (typingCleanupIntervalRef.current) {
        clearInterval(typingCleanupIntervalRef.current);
        typingCleanupIntervalRef.current = null;
      }
    };
  }, [enabled, userId, roomId, supabase, typingTimeout, onTypingChanged]);

  // Start typing indicator
  const startTyping = useCallback(async () => {
    if (!typingChannelRef.current || !userId || !roomId) return;

    const userData = await getCurrentUserData();
    if (!userData) return;

    const typingData: TypingIndicator = {
      user_id: userId,
      username: userData.username,
      room_id: roomId,
      started_at: Date.now(),
      last_update: Date.now(),
    };

    try {
      await typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing_start',
        payload: typingData,
      });

      // Auto-stop typing after timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, typingTimeout);
    } catch (error) {
      console.error('Error sending typing start:', error);
    }
  }, [userId, roomId, getCurrentUserData, typingTimeout]);

  // Stop typing indicator
  const stopTyping = useCallback(async () => {
    if (!typingChannelRef.current || !userId || !roomId) return;

    const userData = await getCurrentUserData();
    if (!userData) return;

    const typingData: TypingIndicator = {
      user_id: userId,
      username: userData.username,
      room_id: roomId,
      started_at: 0,
      last_update: Date.now(),
    };

    try {
      await typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing_stop',
        payload: typingData,
      });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    } catch (error) {
      console.error('Error sending typing stop:', error);
    }
  }, [userId, roomId, getCurrentUserData]);

  // Update user status
  const updateStatus = useCallback(async (status: 'online' | 'away' | 'busy') => {
    if (!presenceChannelRef.current) return;

    const userData = await getCurrentUserData();
    if (!userData) return;

    try {
      await presenceChannelRef.current.track({
        ...userData,
        status,
        online_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  }, [getCurrentUserData]);

  // Get online users for a specific room
  const getRoomOnlineUsers = useCallback((roomMemberIds: string[]) => {
    const roomOnlineUsers: UserPresence[] = [];
    roomMemberIds.forEach(memberId => {
      const user = onlineUsers.get(memberId);
      if (user) {
        roomOnlineUsers.push(user);
      }
    });
    return roomOnlineUsers;
  }, [onlineUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    onlineUsers: Array.from(onlineUsers.values()),
    typingUsers: Array.from(typingUsers.values()),
    isPresenceConnected,
    isTypingConnected,
    isConnected: isPresenceConnected && isTypingConnected,
    error,
    
    // Actions
    startTyping,
    stopTyping,
    updateStatus,
    getRoomOnlineUsers,
    cleanup,
    
    // Utilities
    isUserOnline: (userId: string) => onlineUsers.has(userId),
    isUserTyping: (userId: string) => typingUsers.has(userId),
    getOnlineCount: () => onlineUsers.size,
    getTypingCount: () => typingUsers.size,
  };
};

export default usePresenceAndTyping;
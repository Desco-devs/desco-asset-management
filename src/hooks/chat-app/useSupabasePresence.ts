import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/app/context/AuthContext';

interface PresenceState {
  user_id: string;
  username: string;
  full_name: string;
  user_profile?: string;
  online_at: string;
}

interface PresenceJoin {
  key: string;
  newPresences: PresenceState[];
  currentPresences: PresenceState[];
}

interface PresenceLeave {
  key: string;
  leftPresences: PresenceState[];
  currentPresences: PresenceState[];
}

interface UseSupabasePresenceOptions {
  channelName: string;
  enabled?: boolean;
}

interface UseSupabasePresenceReturn {
  presences: Map<string, PresenceState>;
  isOnline: (userId: string) => boolean;
  getPresence: (userId: string) => PresenceState | undefined;
  onlineUserIds: string[];
  isConnected: boolean;
  error: Error | null;
}

export const useSupabasePresence = ({
  channelName,
  enabled = true,
}: UseSupabasePresenceOptions): UseSupabasePresenceReturn => {
  const { user } = useAuth();
  const [presences, setPresences] = useState<Map<string, PresenceState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const channelRef = useRef<any>(null);
  const supabaseRef = useRef(createClient());

  const updatePresence = useCallback((newPresences: PresenceState[]) => {
    setPresences(prev => {
      const updated = new Map(prev);
      newPresences.forEach(presence => {
        updated.set(presence.user_id, presence);
      });
      return updated;
    });
  }, []);

  const removePresence = useCallback((leftPresences: PresenceState[]) => {
    setPresences(prev => {
      const updated = new Map(prev);
      leftPresences.forEach(presence => {
        updated.delete(presence.user_id);
      });
      return updated;
    });
  }, []);

  const initializePresence = useCallback(async () => {
    if (!enabled || !user || !channelName) {
      return;
    }

    try {
      const supabase = supabaseRef.current;
      
      // Remove existing channel if it exists
      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      // Create new channel for presence
      const channel = supabase.channel(channelName, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channelRef.current = channel;

      // Handle presence join events
      channel.on('presence', { event: 'join' }, ({ key, newPresences, currentPresences }: PresenceJoin) => {
        console.log('Presence join:', { key, newPresences, currentPresences });
        updatePresence(currentPresences);
        setIsConnected(true);
        setError(null);
      });

      // Handle presence leave events
      channel.on('presence', { event: 'leave' }, ({ key, leftPresences, currentPresences }: PresenceLeave) => {
        console.log('Presence leave:', { key, leftPresences, currentPresences });
        removePresence(leftPresences);
        updatePresence(currentPresences);
      });

      // Handle presence sync events (initial state and reconnections)
      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        console.log('Presence sync:', state);
        
        const allPresences: PresenceState[] = [];
        Object.values(state).forEach((presenceArray: any) => {
          if (Array.isArray(presenceArray)) {
            allPresences.push(...presenceArray);
          }
        });
        
        setPresences(new Map(allPresences.map(p => [p.user_id, p])));
        setIsConnected(true);
        setError(null);
      });

      // Subscribe to the channel
      const status = await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track current user's presence
          const presenceData: PresenceState = {
            user_id: user.id,
            username: (user as any).user_metadata?.username || (user as any).email?.split('@')[0] || 'Anonymous',
            full_name: (user as any).user_metadata?.full_name || (user as any).user_metadata?.name || 'Anonymous User',
            user_profile: (user as any).user_metadata?.user_profile,
            online_at: new Date().toISOString(),
          };

          await channel.track(presenceData);
          setIsConnected(true);
          setError(null);
        } else if (status === 'CHANNEL_ERROR') {
          setError(new Error('Failed to connect to presence channel'));
          setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
          setError(new Error('Connection timed out'));
          setIsConnected(false);
        }
      });

    } catch (err) {
      console.error('Failed to initialize presence:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize presence'));
      setIsConnected(false);
    }
  }, [enabled, user, channelName]);

  // Initialize presence on mount and when dependencies change
  useEffect(() => {
    initializePresence();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [initializePresence]);

  // Utility functions
  const isOnline = useCallback((userId: string): boolean => {
    return presences.has(userId);
  }, [presences]);

  const getPresence = useCallback((userId: string): PresenceState | undefined => {
    return presences.get(userId);
  }, [presences]);

  const onlineUserIds = Array.from(presences.keys());

  return {
    presences,
    isOnline,
    getPresence,
    onlineUserIds,
    isConnected,
    error,
  };
};

export default useSupabasePresence;
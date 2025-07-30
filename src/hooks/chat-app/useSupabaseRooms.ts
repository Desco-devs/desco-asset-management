'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { RoomListItem, RoomType } from '@/types/chat-app';
import { useRealtimeRooms } from './useRealtimeRooms';

// Database record types (matches schema.prisma)
interface RoomRecord {
  id: string;
  name: string;
  type: 'DIRECT' | 'GROUP';
  description?: string;
  avatar_url?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

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

interface RoomMemberRecord {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  last_read?: string;
}

// Convert database record to RoomListItem
const convertToRoomListItem = (record: any, currentUserId: string): RoomListItem => {
  const userMembership = record.members?.find((m: any) => m.user_id === currentUserId);
  const lastRead = userMembership?.last_read;
  const unreadCount = lastRead 
    ? record.messages?.filter((m: any) => m.created_at > lastRead).length || 0
    : record.messages?.length || 0;
  
  const latestMessage = record.messages?.[record.messages.length - 1];
  
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    type: record.type as RoomType,
    avatar_url: record.avatar_url,
    owner_id: record.owner_id,
    member_count: record.members?.length || 0,
    unread_count: unreadCount,
    is_owner: record.owner_id === currentUserId,
    created_at: new Date(record.created_at),
    updated_at: new Date(record.updated_at),
    lastMessage: latestMessage ? {
      content: latestMessage.content,
      sender_name: latestMessage.sender?.full_name || 'Unknown',
      created_at: new Date(latestMessage.created_at),
      type: latestMessage.type
    } : undefined,
    members: record.members?.map((m: any) => ({
      user_id: m.user_id,
      user: {
        id: m.user.id,
        username: m.user.username || m.user.full_name,
        full_name: m.user.full_name,
        user_profile: m.user.user_profile,
      }
    })) || [],
    owner: record.owner ? {
      id: record.owner.id,
      username: record.owner.username || record.owner.full_name,
      full_name: record.owner.full_name,
      user_profile: record.owner.user_profile,
    } : undefined,
  };
};

interface UseSupabaseRoomsOptions {
  userId?: string;
  enabled?: boolean;
  onRoomAdded?: (room: RoomListItem) => void;
  onRoomUpdated?: (roomUpdate: Partial<RoomListItem> & { id: string }) => void;
  onRoomDeleted?: (roomId: string) => void;
  onMembershipChanged?: (roomId: string, memberCount: number) => void;
  onUnreadCountUpdated?: (roomId: string, unreadCount: number) => void;
}

export const useSupabaseRooms = ({ 
  userId, 
  enabled = true,
  onRoomAdded: externalOnRoomAdded,
  onRoomUpdated: externalOnRoomUpdated,
  onRoomDeleted: externalOnRoomDeleted,
  onMembershipChanged: externalOnMembershipChanged,
  onUnreadCountUpdated: externalOnUnreadCountUpdated,
}: UseSupabaseRoomsOptions = {}) => {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Real-time room handlers
  const handleRoomAdded = useCallback((room: RoomListItem) => {
    setRooms(prev => {
      // Check if room already exists
      const exists = prev.some(r => r.id === room.id);
      if (exists) return prev;
      
      // Add room and sort by updated_at
      const newRooms = [...prev, room];
      return newRooms.sort((a, b) => (b.updated_at?.getTime() || 0) - (a.updated_at?.getTime() || 0));
    });
    
    // Call external handler if provided
    externalOnRoomAdded?.(room);
  }, [externalOnRoomAdded]);

  const handleRoomUpdated = useCallback((roomUpdate: Partial<RoomListItem> & { id: string }) => {
    setRooms(prev => 
      prev.map(room => 
        room.id === roomUpdate.id 
          ? { ...room, ...roomUpdate }
          : room
      ).sort((a, b) => (b.updated_at?.getTime() || 0) - (a.updated_at?.getTime() || 0))
    );
    
    // Call external handler if provided
    externalOnRoomUpdated?.(roomUpdate);
  }, [externalOnRoomUpdated]);

  const handleRoomDeleted = useCallback((roomId: string) => {
    setRooms(prev => prev.filter(room => room.id !== roomId));
    
    // Call external handler if provided
    externalOnRoomDeleted?.(roomId);
  }, [externalOnRoomDeleted]);

  const handleMembershipChanged = useCallback((roomId: string, memberCount: number) => {
    setRooms(prev => 
      prev.map(room => 
        room.id === roomId 
          ? { ...room, member_count: memberCount }
          : room
      )
    );
    
    // Call external handler if provided
    externalOnMembershipChanged?.(roomId, memberCount);
  }, [externalOnMembershipChanged]);

  const handleUnreadCountUpdated = useCallback((roomId: string, unreadCount: number) => {
    setRooms(prev => 
      prev.map(room => 
        room.id === roomId 
          ? { ...room, unread_count: unreadCount }
          : room
      )
    );
    
    // Call external handler if provided
    externalOnUnreadCountUpdated?.(roomId, unreadCount);
  }, [externalOnUnreadCountUpdated]);

  // Real-time rooms hook
  const {
    isConnected: realtimeConnected,
    connectionError: realtimeError,
    roomStates,
    broadcastRoomUpdate,
  } = useRealtimeRooms({
    userId,
    enabled: enabled && !!userId,
    onRoomAdded: handleRoomAdded,
    onRoomUpdated: handleRoomUpdated,
    onRoomDeleted: handleRoomDeleted,
    onMembershipChanged: handleMembershipChanged,
    onUnreadCountUpdated: handleUnreadCountUpdated,
  });

  // Extract fetchRooms function to be used by both initial load and subscriptions
  const fetchRooms = useCallback(async () => {
    if (!enabled || !userId) {
      setRooms([]);
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();

      // First get the room IDs for the user
      const { data: userRooms, error: roomMembersError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', userId);

      if (roomMembersError) throw roomMembersError;
      
      const roomIds = userRooms?.map(rm => rm.room_id) || [];
      
      if (roomIds.length === 0) {
        setRooms([]);
        return;
      }

      const { data, error } = await supabase
        .from('rooms')
        .select(`
          *,
          owner:users (
            id,
            username,
            full_name,
            user_profile
          ),
          members:room_members (
            user_id,
            joined_at,
            last_read,
            user:users (
              id,
              username,
              full_name,
              user_profile,
              is_online
            )
          ),
          messages (
            id,
            content,
            created_at,
            type,
            sender:users (
              full_name
            )
          )
        `)
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Convert to RoomListItem format
      const convertedRooms = (data || []).map(room => convertToRoomListItem(room, userId));
      setRooms(convertedRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      console.error('Full error details:', JSON.stringify(err, null, 2));
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rooms';
      setError(`Database error: ${errorMessage}`);
      // Set empty rooms on error so app doesn't crash
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, userId]);

  // Fetch initial rooms
  useEffect(() => {
    fetchRooms();
  }, [enabled, userId]);

  // Note: Real-time subscriptions are now handled by useRealtimeRooms hook

  // Mark room as read
  const markRoomAsRead = async (roomId: string) => {
    if (!userId) return;
    
    const supabase = createClient();

    const { error } = await supabase
      .from('room_members')
      .update({ last_read: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', userId);

    if (!error) {
      setRooms(prev => 
        prev.map(room => 
          room.id === roomId 
            ? { ...room, unread_count: 0 }
            : room
        )
      );
    }
  };

  return {
    rooms,
    loading,
    error: error || realtimeError,
    markRoomAsRead,
    refetch: fetchRooms,
    roomStates,
    broadcastRoomUpdate,
    isRealtimeConnected: realtimeConnected,
  };
};

export default useSupabaseRooms;
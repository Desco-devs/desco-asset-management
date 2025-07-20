'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { RoomListItem, RoomType } from '@/types/chat-app';

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

export const useSupabaseRooms = () => {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract fetchRooms function to be used by both initial load and subscriptions
  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('User not authenticated, skipping room fetch');
        setRooms([]);
        return;
      }

      // First get the room IDs for the user
      const { data: userRooms, error: roomMembersError } = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id);

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
          owner:users!rooms_owner_id_fkey (
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
            sender:users!messages_sender_id_fkey (
              full_name
            )
          )
        `)
        .in('id', roomIds)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Convert to RoomListItem format
      const convertedRooms = (data || []).map(room => convertToRoomListItem(room, user.id));
      setRooms(convertedRooms);
    } catch (err) {
      console.error('Error fetching rooms:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch rooms';
      setError(`Chat setup incomplete: ${errorMessage}`);
      // Set empty rooms on error so app doesn't crash
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial rooms
  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // Subscribe to real-time changes (disabled until Supabase Realtime is enabled)
  useEffect(() => {
    // TODO: Enable this once Supabase Realtime is configured
    console.log('Realtime subscriptions disabled until Supabase setup is complete');
    return;
    
    const supabase = createClient();
    
    // Subscribe to room changes
    const roomSubscription = supabase
      .channel('rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
        },
        (payload: RealtimePostgresChangesPayload<RoomRecord>) => {
          if (payload.eventType === 'INSERT') {
            // New room created, refetch to get complete data
            fetchRooms();
          } else if (payload.eventType === 'UPDATE') {
            const updatedRoom = payload.new as RoomRecord;
            if (updatedRoom?.id) {
              setRooms(prev => 
                prev.map(room => 
                  room.id === updatedRoom.id 
                    ? { ...room, name: updatedRoom.name, description: updatedRoom.description, updated_at: new Date(updatedRoom.updated_at) }
                    : room
                )
              );
            }
          } else if (payload.eventType === 'DELETE') {
            const deletedRoom = payload.old as RoomRecord;
            if (deletedRoom?.id) {
              setRooms(prev => prev.filter(room => room.id !== deletedRoom.id));
            }
          }
        }
      )
      .subscribe();

    // Subscribe to room member changes
    const memberSubscription = supabase
      .channel('room_members')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
        },
        () => {
          // Refetch rooms when membership changes
          fetchRooms();
        }
      )
      .subscribe();

    // Subscribe to message changes for unread counts
    const messageSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          // Check if we have new data and required fields
          const newMessage = payload.new as MessageRecord;
          if (!newMessage?.room_id || !newMessage?.created_at) return;
          
          // Update room's updated_at and increment unread count
          setRooms(prev => 
            prev.map(room => {
              if (room.id === newMessage.room_id) {
                return {
                  ...room,
                  updated_at: new Date(newMessage.created_at),
                  unread_count: (room.unread_count || 0) + 1,
                };
              }
              return room;
            })
          );
        }
      )
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
      memberSubscription.unsubscribe();
      messageSubscription.unsubscribe();
    };
  }, []);

  // Mark room as read
  const markRoomAsRead = async (roomId: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('room_members')
      .update({ last_read: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

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
    error,
    markRoomAsRead,
    refetch: fetchRooms,
  };
};

export default useSupabaseRooms;
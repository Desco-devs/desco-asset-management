'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase';
import { RoomListItem, RoomType } from '@/types/chat-app';

// Database record types matching the Prisma schema
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

interface RoomMemberRecord {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
  last_read?: string;
}

interface MessageRecord {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  created_at: string;
}

// Real-time broadcast payloads
interface RoomUpdateBroadcastPayload {
  room_id: string;
  event_type: 'room_updated' | 'room_deleted' | 'member_joined' | 'member_left';
  data: any;
  updated_by: string;
}

interface RoomStateSyncPayload {
  room_id: string;
  member_count: number;
  last_activity: string;
  unread_counts: Record<string, number>;
}

// Hook options
interface UseRealtimeRoomsOptions {
  userId?: string;
  enabled?: boolean;
  onRoomAdded?: (room: RoomListItem) => void;
  onRoomUpdated?: (room: Partial<RoomListItem> & { id: string }) => void;
  onRoomDeleted?: (roomId: string) => void;
  onMembershipChanged?: (roomId: string, memberCount: number) => void;
  onUnreadCountUpdated?: (roomId: string, unreadCount: number) => void;
}

export const useRealtimeRooms = ({
  userId,
  enabled = true,
  onRoomAdded,
  onRoomUpdated,
  onRoomDeleted,
  onMembershipChanged,
  onUnreadCountUpdated,
}: UseRealtimeRoomsOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [roomStates, setRoomStates] = useState<Record<string, RoomStateSyncPayload>>({});
  
  // Channel references
  const roomsChannelRef = useRef<RealtimeChannel | null>(null);
  const membersChannelRef = useRef<RealtimeChannel | null>(null);
  const messagesChannelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<RealtimeChannel | null>(null);
  
  const supabase = useMemo(() => createClient(), []);

  // Cleanup function with proper state reset guards
  const cleanup = useCallback(() => {
    [roomsChannelRef, membersChannelRef, messagesChannelRef, broadcastChannelRef].forEach(ref => {
      if (ref.current) {
        ref.current.unsubscribe();
        ref.current = null;
      }
    });
    
    // Use functional updates to avoid dependency issues
    setRoomStates(prev => Object.keys(prev).length > 0 ? {} : prev);
    setIsConnected(prev => prev ? false : prev);
    setConnectionError(prev => prev ? null : prev);
  }, []);


  // Broadcast room state update
  const broadcastRoomUpdate = useCallback(async (
    roomId: string,
    eventType: 'room_updated' | 'room_deleted' | 'member_joined' | 'member_left',
    data: any
  ) => {
    if (!broadcastChannelRef.current || !userId) return;

    const payload: RoomUpdateBroadcastPayload = {
      room_id: roomId,
      event_type: eventType,
      data,
      updated_by: userId,
    };

    try {
      await broadcastChannelRef.current.send({
        type: 'broadcast',
        event: 'room_update',
        payload,
      });
      console.log(`Broadcasted ${eventType} for room:`, roomId);
    } catch (error) {
      console.error('Error broadcasting room update:', error);
    }
  }, [userId]);


  // Setup real-time subscriptions
  useEffect(() => {
    if (!enabled || !userId) {
      cleanup();
      return;
    }

    console.log('Setting up real-time room synchronization for user:', userId);

    // Create fresh callbacks inside the effect to avoid stale closures
    const currentFetchCompleteRoom = async (roomId: string): Promise<RoomListItem | null> => {
      if (!userId) return null;

      try {
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
          .eq('id', roomId)
          .single();

        if (error) {
          console.error('Error fetching complete room:', error);
          return null;
        }

        // Convert to RoomListItem format
        const userMembership = data.members?.find((m: any) => m.user_id === userId);
        const lastRead = userMembership?.last_read;
        const unreadCount = lastRead 
          ? data.messages?.filter((m: any) => m.created_at > lastRead).length || 0
          : data.messages?.length || 0;
        
        const latestMessage = data.messages?.[data.messages.length - 1];
        
        return {
          id: data.id,
          name: data.name,
          description: data.description,
          type: data.type as RoomType,
          avatar_url: data.avatar_url,
          owner_id: data.owner_id,
          member_count: data.members?.length || 0,
          unread_count: unreadCount,
          is_owner: data.owner_id === userId,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
          lastMessage: latestMessage ? {
            content: latestMessage.content,
            sender_name: latestMessage.sender?.full_name || 'Unknown',
            created_at: new Date(latestMessage.created_at),
            type: latestMessage.type
          } : undefined,
          members: data.members?.map((m: any) => ({
            user_id: m.user_id,
            user: {
              id: m.user.id,
              username: m.user.username || m.user.full_name,
              full_name: m.user.full_name,
              user_profile: m.user.user_profile,
            }
          })) || [],
          owner: data.owner ? {
            id: data.owner.id,
            username: data.owner.username || data.owner.full_name,
            full_name: data.owner.full_name,
            user_profile: data.owner.user_profile,
          } : undefined,
        };
      } catch (error) {
        console.error('Error fetching complete room:', error);
        return null;
      }
    };

    // Update room state function inside the effect
    const currentUpdateRoomState = (roomId: string, updates: Partial<RoomStateSyncPayload>) => {
      setRoomStates(prev => ({
        ...prev,
        [roomId]: {
          ...prev[roomId],
          room_id: roomId,
          member_count: prev[roomId]?.member_count || 0,
          last_activity: prev[roomId]?.last_activity || new Date().toISOString(),
          unread_counts: prev[roomId]?.unread_counts || {},
          ...updates,
        }
      }));
    };

    // 1. Rooms table subscription
    const roomsChannel = supabase.channel('global_rooms');
    
    roomsChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'rooms',
        },
        async (payload: RealtimePostgresChangesPayload<RoomRecord>) => {
          const newRoom = payload.new as RoomRecord;
          if (!newRoom?.id) return;

          // Check if user is a member of this new room
          const { data: membership } = await supabase
            .from('room_members')
            .select('id')
            .eq('room_id', newRoom.id)
            .eq('user_id', userId)
            .single();

          if (membership) {
            const completeRoom = await currentFetchCompleteRoom(newRoom.id);
            if (completeRoom) {
              onRoomAdded?.(completeRoom);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
        },
        async (payload: RealtimePostgresChangesPayload<RoomRecord>) => {
          const updatedRoom = payload.new as RoomRecord;
          if (!updatedRoom?.id) return;

          // Check if user is a member of this room
          const { data: membership } = await supabase
            .from('room_members')
            .select('id')
            .eq('room_id', updatedRoom.id)
            .eq('user_id', userId)
            .single();

          if (membership) {
            onRoomUpdated?.({
              id: updatedRoom.id,
              name: updatedRoom.name,
              description: updatedRoom.description,
              avatar_url: updatedRoom.avatar_url,
              updated_at: new Date(updatedRoom.updated_at),
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'rooms',
        },
        (payload: RealtimePostgresChangesPayload<RoomRecord>) => {
          const deletedRoom = payload.old as RoomRecord;
          if (deletedRoom?.id) {
            onRoomDeleted?.(deletedRoom.id);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Rooms subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Rooms subscription error');
          setConnectionError('Rooms subscription failed');
        }
      });

    roomsChannelRef.current = roomsChannel;

    // 2. Room members subscription
    const membersChannel = supabase.channel('global_room_members');
    
    membersChannel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
        },
        async (payload: RealtimePostgresChangesPayload<RoomMemberRecord>) => {
          const memberData = (payload.new || payload.old) as RoomMemberRecord;
          if (!memberData?.room_id) return;

          // Get updated member count
          const { count } = await supabase
            .from('room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', memberData.room_id);

          const memberCount = count || 0;

          // Update room state and notify
          currentUpdateRoomState(memberData.room_id, { 
            member_count: memberCount,
            last_activity: new Date().toISOString(),
          });

          onMembershipChanged?.(memberData.room_id, memberCount);

          // If user was added/removed from a room, fetch complete room data
          if (memberData.user_id === userId) {
            if (payload.eventType === 'INSERT') {
              const completeRoom = await currentFetchCompleteRoom(memberData.room_id);
              if (completeRoom) {
                onRoomAdded?.(completeRoom);
              }
            } else if (payload.eventType === 'DELETE') {
              onRoomDeleted?.(memberData.room_id);
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Room members subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Room members subscription error');
          setConnectionError('Members subscription failed');
        }
      });

    membersChannelRef.current = membersChannel;

    // 3. Messages subscription for unread count updates
    const messagesChannel = supabase.channel('global_messages');
    
    messagesChannel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          const newMessage = payload.new as MessageRecord;
          if (!newMessage?.room_id) return;

          // Skip our own messages
          if (newMessage.sender_id === userId) return;

          // Update room state with new activity
          currentUpdateRoomState(newMessage.room_id, {
            last_activity: newMessage.created_at,
          });

          // Get user's unread count for this room
          const { data: membership } = await supabase
            .from('room_members')
            .select('last_read')
            .eq('room_id', newMessage.room_id)
            .eq('user_id', userId)
            .single();

          if (membership) {
            const { count: unreadCount } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', newMessage.room_id)
              .gt('created_at', membership.last_read || '1970-01-01T00:00:00Z');

            onUnreadCountUpdated?.(newMessage.room_id, unreadCount || 0);
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Messages subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Messages subscription error');
          setConnectionError('Messages subscription failed');
        }
      });

    messagesChannelRef.current = messagesChannel;

    // 4. Broadcast channel for real-time room updates
    const broadcastChannel = supabase.channel('room_updates');
    
    broadcastChannel
      .on('broadcast', { event: 'room_update' }, (payload) => {
        const updatePayload = payload.payload as RoomUpdateBroadcastPayload;
        
        // Skip our own updates
        if (updatePayload.updated_by === userId) return;

        switch (updatePayload.event_type) {
          case 'room_updated':
            onRoomUpdated?.(updatePayload.data);
            break;
          case 'room_deleted':
            onRoomDeleted?.(updatePayload.room_id);
            break;
          case 'member_joined':
          case 'member_left':
            onMembershipChanged?.(updatePayload.room_id, updatePayload.data.member_count);
            break;
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Room updates broadcast subscription active');
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Room updates broadcast subscription error');
          setConnectionError('Broadcast subscription failed');
          setIsConnected(false);
        }
      });

    broadcastChannelRef.current = broadcastChannel;

    return cleanup;
  }, [enabled, userId]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, []);

  return {
    isConnected,
    connectionError,
    roomStates,
    broadcastRoomUpdate,
    cleanup,
  };
};

export default useRealtimeRooms;
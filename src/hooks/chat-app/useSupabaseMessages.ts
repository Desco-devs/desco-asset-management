'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { MessageWithRelations, MessageType, RoomType } from '@/types/chat-app';

// Database record type (matches the actual table structure from schema.prisma)
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
      id: record.sender.id,
      username: record.sender.username || record.sender.full_name,
      full_name: record.sender.full_name,
      user_profile: record.sender.user_profile,
    },
    room: {
      id: record.room_id,
      name: 'Room', // We'll need to pass this from context or fetch it
      type: RoomType.GROUP, // Default for now
    },
    reply_to: record.reply_to ? convertToMessageWithRelations(record.reply_to) : undefined,
  };
};

interface UseSupabaseMessagesOptions {
  roomId?: string;
  enabled?: boolean;
}

export const useSupabaseMessages = ({ 
  roomId, 
  enabled = true 
}: UseSupabaseMessagesOptions) => {
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial messages
  useEffect(() => {
    if (!enabled || !roomId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('messages')
          .select(`
            *,
            sender:users!messages_sender_id_fkey (
              id,
              full_name,
              user_profile
            ),
            reply_to:messages!messages_reply_to_id_fkey (
              id,
              content,
              sender:users!messages_sender_id_fkey (
                id,
                full_name
              )
            )
          `)
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        const convertedMessages = (data || []).map(convertToMessageWithRelations);
        setMessages(convertedMessages);
      } catch (err) {
        console.error('Error fetching messages:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
        setError(`Chat setup incomplete: ${errorMessage}`);
        // Set empty messages on error so app doesn't crash
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [roomId, enabled]);

  // Subscribe to real-time changes (disabled until Supabase Realtime is enabled)
  useEffect(() => {
    if (!enabled || !roomId) return;
    
    // TODO: Enable this once Supabase Realtime is configured
    console.log('Realtime subscriptions disabled until Supabase setup is complete');
    return;

    const supabase = createClient();
    const subscription = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: RealtimePostgresChangesPayload<MessageRecord>) => {
          // Check if we have new data and required id
          const newMessageRecord = payload.new as MessageRecord;
          if (!newMessageRecord?.id) return;
          
          // Fetch the complete message with relations
          const supabase = createClient();
          const { data: messageWithRelations } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey (
                id,
                full_name,
                user_profile
              ),
              reply_to:messages!messages_reply_to_id_fkey (
                id,
                content,
                sender:users!messages_sender_id_fkey (
                  id,
                  full_name
                )
              )
            `)
            .eq('id', newMessageRecord.id)
            .single();

          if (messageWithRelations) {
            const convertedMessage = convertToMessageWithRelations(messageWithRelations);
            setMessages(prev => [...prev, convertedMessage]);
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
          // Check if we have new data and required id
          const updatedMessageRecord = payload.new as MessageRecord;
          if (!updatedMessageRecord?.id) return;
          
          // Fetch the updated message with relations
          const supabase = createClient();
          const { data: messageWithRelations } = await supabase
            .from('messages')
            .select(`
              *,
              sender:users!messages_sender_id_fkey (
                id,
                full_name,
                user_profile
              ),
              reply_to:messages!messages_reply_to_id_fkey (
                id,
                content,
                sender:users!messages_sender_id_fkey (
                  id,
                  full_name
                )
              )
            `)
            .eq('id', updatedMessageRecord.id)
            .single();

          if (messageWithRelations) {
            const convertedMessage = convertToMessageWithRelations(messageWithRelations);
            setMessages(prev => 
              prev.map(msg => 
                msg.id === updatedMessageRecord.id ? convertedMessage : msg
              )
            );
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
          // Check if we have old data and required id
          const deletedMessage = payload.old as MessageRecord;
          if (!deletedMessage?.id) return;
          
          setMessages(prev => 
            prev.filter(msg => msg.id !== deletedMessage.id)
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId, enabled]);

  // Send message function
  const sendMessage = async (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', replyToId?: string) => {
    if (!roomId) throw new Error('No room ID');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: user.id,
        content,
        type,
        reply_to_id: replyToId,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
  };
};

export default useSupabaseMessages;
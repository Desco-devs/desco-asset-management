'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { MessageWithRelations, MessageType, RoomType } from '@/types/chat-app';
import { useRealtimeMessaging } from './useRealtimeMessaging';

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      name: 'Room', // We'll need to pass this from context or fetch it
      type: RoomType.GROUP, // Default for now
    },
    // Temporarily disable reply_to until we fix the foreign key relationship
    reply_to: undefined,
  };
};

interface UseSupabaseMessagesOptions {
  roomId?: string;
  userId?: string;
  enabled?: boolean;
}

export const useSupabaseMessages = ({ 
  roomId, 
  userId,
  enabled = true 
}: UseSupabaseMessagesOptions) => {
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ id: string; name: string }>>([]);

  // Real-time message handlers
  const handleMessageReceived = useCallback((message: MessageWithRelations) => {
    setMessages(prev => {
      // Check if message already exists (avoid duplicates)
      const exists = prev.some(m => m.id === message.id);
      if (exists) return prev;
      
      // Insert message in chronological order
      const newMessages = [...prev, message];
      return newMessages.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    });
  }, []);

  const handleMessageUpdated = useCallback((message: MessageWithRelations) => {
    setMessages(prev => 
      prev.map(m => m.id === message.id ? message : m)
    );
  }, []);

  const handleMessageDeleted = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const handleTypingUpdate = useCallback((users: Array<{ id: string; name: string }>) => {
    setTypingUsers(users);
  }, []);

  // Real-time messaging hook
  const {
    isConnected: realtimeConnected,
    connectionError: realtimeError,
    broadcastMessage,
    sendTypingIndicator,
  } = useRealtimeMessaging({
    roomId,
    userId,
    enabled: enabled && !!roomId && !!userId,
    onMessageReceived: handleMessageReceived,
    onMessageUpdated: handleMessageUpdated,
    onMessageDeleted: handleMessageDeleted,
    onTypingUpdate: handleTypingUpdate,
  });

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
            sender:users (
              id,
              full_name,
              user_profile
            )
          `)
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        const convertedMessages = (data || []).map(convertToMessageWithRelations);
        setMessages(convertedMessages);
      } catch (err) {
        console.error('Error fetching messages:', err);
        console.error('Full error details:', JSON.stringify(err, null, 2));
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
        setError(`Database error: ${errorMessage}`);
        // Set empty messages on error so app doesn't crash
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [roomId, enabled]);

  // Note: Real-time subscriptions are now handled by useRealtimeMessaging hook

  // Send message function
  const sendMessage = async (content: string, type: 'TEXT' | 'IMAGE' | 'FILE' = 'TEXT', replyToId?: string) => {
    try {
      if (!roomId) throw new Error('No room ID');

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Sending message:', { roomId, userId: user.id, content, type });

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

      if (error) {
        console.error('Error inserting message:', error);
        console.error('Full error details:', JSON.stringify(error, null, 2));
        throw error;
      }
      
      console.log('Message sent successfully:', data);
      return data;
    } catch (err) {
      console.error('Send message error:', err);
      throw err;
    }
  };

  return {
    messages,
    loading,
    error: error || realtimeError,
    sendMessage,
    typingUsers,
    sendTypingIndicator,
    broadcastMessage,
    isRealtimeConnected: realtimeConnected,
  };
};

export default useSupabaseMessages;
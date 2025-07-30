/**
 * Main Chat Application Hook - Phase 2: Real-time Layer Complete
 * 
 * This hook provides comprehensive chat functionality including:
 * - Room management with real-time synchronization
 * - Message handling with instant delivery and updates
 * - User management and authentication integration
 * - Full real-time layer with Supabase subscriptions
 * 
 * Phase 1 Features:
 * - ✅ Room selection and navigation
 * - ✅ Message loading with pagination
 * - ✅ Message sending with optimistic updates
 * - ✅ Room invitations (accept/decline)
 * - ✅ Room creation
 * - ✅ Authentication integration with Supabase
 * - ✅ Error handling and loading states
 * - ✅ Integration with existing API routes
 * 
 * Phase 2 Features (Real-time Layer):
 * - ✅ Supabase realtime subscriptions for live message delivery
 * - ✅ Real-time room state synchronization
 * - ✅ Typing indicators with auto-timeout
 * - ✅ Online status tracking and presence management
 * - ✅ Efficient subscription management with auto-cleanup
 * - ✅ Message broadcasting across room members
 * - ✅ Room membership change notifications
 * 
 * Future enhancements:
 * - [ ] Message reactions and replies
 * - [ ] File attachments with real-time progress
 * - [ ] Message search and filtering
 * - [ ] Push notifications integration
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRooms } from './useRooms';
import { useUsers } from './useUsers';
import { useChatMutations } from './useChatMutations';
import { useOnlineStatus } from './useOnlineStatus';
import { useRoomPresence } from './useRoomPresence';
import { useRealtimeMessaging } from './useRealtimeMessaging';
import { 
  RoomListItem, 
  MessageWithRelations, 
  ChatUser, 
  RoomType,
  SendMessageData,
  MessageType 
} from '@/types/chat-app';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface UseChatAppReturn {
  // Room Management
  selectedRoom: RoomListItem | null;
  invitationRoom: RoomListItem | null;
  currentRoom: RoomListItem | null;
  rooms: RoomListItem[];
  
  // Messages
  messages: MessageWithRelations[];
  
  // Users
  users: ChatUser[];
  
  // Presence
  isUserOnline: (userId: string) => boolean;
  onlineUserIds: string[];
  onlineMemberCount: number;
  roomMembersWithPresence: Array<ChatUser & { isOnline: boolean }>;
  isPresenceConnected: boolean;
  presenceError: Error | null;
  
  // Real-time Status
  isRealtimeConnected: boolean;
  realtimeConnectionError: string | null;
  typingUsers: Array<{ id: string; name: string }>;
  
  // Loading States
  isLoading: boolean;
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: boolean;
  isCreatingRoom: boolean;
  isRespondingToInvitation: boolean;
  isSendingMessage: boolean;
  
  // Error States
  error: Error | null;
  createRoomError: Error | null;
  invitationResponseError: Error | null;
  messagesError: Error | null;
  
  // Actions
  handleRoomSelect: (room: RoomListItem) => void;
  handleAcceptInvitation: (invitationId: string) => Promise<void>;
  handleDeclineInvitation: (invitationId: string) => Promise<void>;
  handleCreateRoom: (data: {
    name: string;
    description?: string;
    type: RoomType;
    invitedUsers: ChatUser[];
    inviteUsername?: string;
  }) => Promise<void>;
  handleSendMessage: (content: string, replyToId?: string) => Promise<void>;
  setInvitationRoom: (room: RoomListItem | null) => void;
  loadMoreMessages: () => void;
  sendTypingIndicator: (isTyping: boolean) => void;
  
  // Room Messages Query
  refetchMessages: () => void;
}

// Query key factory for messages
const messageKeys = {
  room: (roomId: string) => ['messages', roomId] as const,
  roomWithPagination: (roomId: string, limit: number, offset: number) => 
    ['messages', roomId, limit, offset] as const,
};

export const useChatApp = (): UseChatAppReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Local state
  const [selectedRoom, setSelectedRoom] = useState<RoomListItem | null>(null);
  const [invitationRoom, setInvitationRoom] = useState<RoomListItem | null>(null);
  const [messagesOffset, setMessagesOffset] = useState(0);
  const [allMessages, setAllMessages] = useState<MessageWithRelations[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<MessageWithRelations[]>([]);
  
  // Hooks
  const { 
    data: rooms = [], 
    isLoading: isLoadingRooms, 
    error: roomsError 
  } = useRooms({ 
    userId: user?.id, 
    enabled: !!user?.id 
  });
  
  const { 
    data: users = [], 
    isLoading: isLoadingUsers,
    error: usersError 
  } = useUsers();
  
  const {
    createRoom,
    respondToInvitation,
    isCreatingRoom,
    isRespondingToInvitation,
    createRoomError,
    invitationResponseError,
  } = useChatMutations(user?.id);
  
  // Global presence tracking
  const {
    isUserOnline,
    onlineUserIds,
    isConnected: isPresenceConnected,
    presenceError,
  } = useOnlineStatus({
    channelName: 'global-presence',
    enablePresence: true,
  });
  
  // Room-specific presence tracking
  const roomMembers = useMemo(() => {
    if (!selectedRoom?.members) return [];
    return selectedRoom.members.map(member => ({
      id: member.user_id,
      username: member.user?.username || 'Unknown',
      full_name: member.user?.full_name || 'Unknown User',
      email: member.user?.username || '',
      user_profile: member.user?.user_profile,
      user_status: 'ACTIVE' as const,
      role: 'VIEWER' as const,
    }));
  }, [selectedRoom?.members]);
  
  const {
    onlineMemberCount,
    roomPresences,
  } = useRoomPresence({
    roomId: selectedRoom?.id || '',
    roomMembers,
    enabled: !!selectedRoom?.id,
  });
  
  // Combine user data with presence information
  const roomMembersWithPresence = useMemo(() => {
    return roomMembers.map(member => {
      const presence = roomPresences.get(member.id);
      return {
        ...member,
        isOnline: presence?.isOnline || false,
      };
    });
  }, [roomMembers, roomPresences]);
  
  // Messages query for selected room
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    error: messagesError,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: messageKeys.roomWithPagination(selectedRoom?.id || '', 50, messagesOffset),
    queryFn: async () => {
      if (!selectedRoom?.id || !user?.id) {
        return { messages: [], has_more: false };
      }
      
      const response = await fetch(
        `/api/messages/${selectedRoom.id}?userId=${user.id}&limit=50&offset=${messagesOffset}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    enabled: !!selectedRoom?.id && !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: true,
  });
  
  // Send message mutation
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  // Real-time message callbacks
  const handleNewMessage = useCallback((message: MessageWithRelations) => {
    if (!selectedRoom || message.room_id !== selectedRoom.id) return;
    
    setAllMessages(prev => {
      // Check if message already exists (to prevent duplicates)
      const exists = prev.some(msg => msg.id === message.id);
      if (exists) return prev;
      
      // Remove optimistic message if it exists
      const filteredMessages = prev.filter(msg => !msg.pending || msg.sender_id !== message.sender_id || msg.content !== message.content);
      
      // Add new message at the beginning (most recent first)
      return [message, ...filteredMessages];
    });
    
    // Remove from optimistic messages
    setOptimisticMessages(prev => 
      prev.filter(msg => msg.sender_id !== message.sender_id || msg.content !== message.content)
    );
  }, [selectedRoom]);
  
  const handleMessageUpdated = useCallback((message: MessageWithRelations) => {
    if (!selectedRoom || message.room_id !== selectedRoom.id) return;
    
    setAllMessages(prev => 
      prev.map(msg => msg.id === message.id ? message : msg)
    );
  }, [selectedRoom]);
  
  const handleMessageDeleted = useCallback((messageId: string) => {
    setAllMessages(prev => prev.filter(msg => msg.id !== messageId));
    setOptimisticMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);
  
  const handleTypingUpdate = useCallback((users: Array<{ id: string; name: string }>) => {
    // This will be handled by the typing users state from real-time hook
  }, []);
  
  // Real-time messaging hook
  const {
    isConnected: isRealtimeConnected,
    connectionError: realtimeConnectionError,
    typingUsers,
    sendTypingIndicator,
  } = useRealtimeMessaging({
    roomId: selectedRoom?.id,
    userId: user?.id,
    enabled: !!selectedRoom?.id && !!user?.id,
    onMessageReceived: handleNewMessage,
    onMessageUpdated: handleMessageUpdated,
    onMessageDeleted: handleMessageDeleted,
    onTypingUpdate: handleTypingUpdate,
  });
  
  // Update messages when data changes
  useEffect(() => {
    if (messagesData?.messages) {
      if (messagesOffset === 0) {
        // Fresh load - replace all messages (but preserve optimistic messages)
        setAllMessages(messagesData.messages);
      } else {
        // Load more - append to existing messages
        setAllMessages(prev => [...prev, ...messagesData.messages]);
      }
    }
  }, [messagesData, messagesOffset]);
  
  // Reset messages when room changes
  useEffect(() => {
    if (selectedRoom) {
      setMessagesOffset(0);
      setAllMessages([]);
      setOptimisticMessages([]);
    }
  }, [selectedRoom?.id]);
  
  // Computed values
  const currentRoom = selectedRoom;
  // Combine real messages with optimistic messages (optimistic messages first)
  const messages = useMemo(() => {
    const combined = [...optimisticMessages, ...allMessages];
    // Remove duplicates by ID, keeping the first occurrence (optimistic messages take precedence)
    const uniqueMessages = combined.reduce((acc, message) => {
      if (!acc.some(msg => msg.id === message.id && !message.pending)) {
        acc.push(message);
      }
      return acc;
    }, [] as MessageWithRelations[]);
    return uniqueMessages;
  }, [optimisticMessages, allMessages]);
  
  const hasMoreMessages = messagesData?.has_more || false;
  const isLoadingMoreMessages = isLoadingMessages && messagesOffset > 0;
  const isLoading = isLoadingRooms || isLoadingUsers;
  const error: Error | null = null; // Simplified for now - TODO: handle query errors properly
  
  // Handlers
  const handleRoomSelect = useCallback((room: RoomListItem) => {
    setSelectedRoom(room);
    setMessagesOffset(0);
    setAllMessages([]);
    
    // Mark room as read when selected
    if (room.unread_count > 0) {
      fetch(`/api/rooms/${room.id}/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch(console.error);
    }
  }, []);
  
  const handleAcceptInvitation = useCallback(async (invitationId: string) => {
    if (!user?.id) return;
    
    try {
      await new Promise<void>((resolve, reject) => {
        respondToInvitation({
          invitationId,
          userId: user.id,
          action: 'ACCEPTED',
        }, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
      
      setInvitationRoom(null);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  }, [user?.id, respondToInvitation]);
  
  const handleDeclineInvitation = useCallback(async (invitationId: string) => {
    if (!user?.id) return;
    
    try {
      await new Promise<void>((resolve, reject) => {
        respondToInvitation({
          invitationId,
          userId: user.id,
          action: 'DECLINED',
        }, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
      
      setInvitationRoom(null);
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      throw error;
    }
  }, [user?.id, respondToInvitation]);
  
  const handleCreateRoom = useCallback(async (data: {
    name: string;
    description?: string;
    type: RoomType;
    invitedUsers: ChatUser[];
    inviteUsername?: string;
  }) => {
    if (!user?.id) return;
    
    try {
      await new Promise<void>((resolve, reject) => {
        createRoom({
          ...data,
          ownerId: user.id,
        }, {
          onSuccess: () => resolve(),
          onError: (error) => reject(error),
        });
      });
    } catch (error) {
      console.error('Failed to create room:', error);
      throw error;
    }
  }, [user?.id, createRoom]);
  
  const handleSendMessage = useCallback(async (content: string, replyToId?: string) => {
    if (!selectedRoom?.id || !user?.id || !content.trim()) return;
    
    setIsSendingMessage(true);
    
    // Create optimistic message for immediate UI feedback
    const optimisticMessage: MessageWithRelations = {
      id: `temp-${Date.now()}`, // Temporary ID
      room_id: selectedRoom.id,
      sender_id: user.id,
      content: content.trim(),
      type: MessageType.TEXT,
      file_url: replyToId || undefined,
      reply_to_id: replyToId || undefined,
      created_at: new Date(),
      updated_at: new Date(),
      sender: {
        id: user.id,
        username: user.username || 'You',
        full_name: user.full_name || 'You',
        user_profile: user.user_profile || undefined,
      },
      room: {
        id: selectedRoom.id,
        name: selectedRoom.name,
        type: selectedRoom.type,
      },
      pending: true, // Mark as optimistic/pending
    };
    
    // Add optimistic message immediately
    setOptimisticMessages(prev => [optimisticMessage, ...prev]);
    
    try {
      // Send data in the format expected by the API validation schema
      const messageData = {
        roomId: selectedRoom.id,
        content: content.trim(),
        type: MessageType.TEXT,
        replyToId: replyToId || null,
        fileUrl: null,
      };
      
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      const result = await response.json();
      const actualMessage = result.message as MessageWithRelations;
      
      // Remove optimistic message and add the real message
      setOptimisticMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      
      // The real message will be added via real-time subscription
      // But add it locally as fallback if real-time is not connected
      if (!isRealtimeConnected) {
        setAllMessages(prev => [actualMessage, ...prev]);
      }
      
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({
        queryKey: messageKeys.room(selectedRoom.id),
      });
      
      // Invalidate rooms to update last message
      if (user.id) {
        queryClient.invalidateQueries({
          queryKey: ['rooms', user.id],
        });
      }
      
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Mark optimistic message as failed
      setOptimisticMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, failed: true, pending: false }
            : msg
        )
      );
      
      throw error;
    } finally {
      setIsSendingMessage(false);
    }
  }, [selectedRoom?.id, user?.id, user?.username, user?.full_name, user?.user_profile, selectedRoom?.name, selectedRoom?.type, queryClient, isRealtimeConnected]);
  
  const loadMoreMessages = useCallback(() => {
    if (hasMoreMessages && !isLoadingMoreMessages) {
      setMessagesOffset(prev => prev + 50);
    }
  }, [hasMoreMessages, isLoadingMoreMessages]);
  
  return {
    // Room Management
    selectedRoom,
    invitationRoom,
    currentRoom,
    rooms,
    
    // Messages
    messages,
    
    // Users
    users,
    
    // Presence
    isUserOnline,
    onlineUserIds,
    onlineMemberCount,
    roomMembersWithPresence,
    isPresenceConnected,
    presenceError,
    
    // Real-time Status
    isRealtimeConnected,
    realtimeConnectionError,
    typingUsers,
    
    // Loading States
    isLoading,
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    isCreatingRoom,
    isRespondingToInvitation,
    isSendingMessage,
    
    // Error States
    error,
    createRoomError,
    invitationResponseError,
    messagesError,
    
    // Actions
    handleRoomSelect,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleCreateRoom,
    handleSendMessage,
    setInvitationRoom,
    loadMoreMessages,
    sendTypingIndicator,
    refetchMessages,
  };
};
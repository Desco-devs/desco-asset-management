import { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRooms } from './useRooms';
import { useUsers } from './useUsers';
import { useChatMutations } from './useChatMutations';
import { RoomListItem, InvitationStatus } from '@/types/chat-app';

interface UseChatAppOptions {
  userId?: string;
  enabled?: boolean;
}

// Messages state management
interface MessagesState {
  [roomId: string]: {
    messages: MessageWithRelations[];
    hasMore: boolean;
    nextCursor: string | null;
    isLoadingMore: boolean;
  };
}

type MessagesAction =
  | { type: 'SET_MESSAGES'; roomId: string; messages: MessageWithRelations[]; hasMore: boolean; nextCursor: string | null }
  | { type: 'PREPEND_MESSAGES'; roomId: string; messages: MessageWithRelations[]; hasMore: boolean; nextCursor: string | null }
  | { type: 'ADD_MESSAGE'; roomId: string; message: MessageWithRelations }
  | { type: 'UPDATE_MESSAGE'; roomId: string; messageId: string; updates: Partial<MessageWithRelations> }
  | { type: 'REMOVE_MESSAGE'; roomId: string; messageId: string }
  | { type: 'SET_LOADING_MORE'; roomId: string; isLoadingMore: boolean }
  | { type: 'CLEAR_ROOM'; roomId: string }
  | { type: 'CLEAR_ALL' };

const messagesReducer = (state: MessagesState, action: MessagesAction): MessagesState => {
  switch (action.type) {
    case 'SET_MESSAGES':
      return {
        ...state,
        [action.roomId]: {
          messages: action.messages,
          hasMore: action.hasMore,
          nextCursor: action.nextCursor,
          isLoadingMore: false
        }
      };
    case 'PREPEND_MESSAGES':
      const existingRoom = state[action.roomId];
      return {
        ...state,
        [action.roomId]: {
          messages: [...action.messages, ...(existingRoom?.messages || [])],
          hasMore: action.hasMore,
          nextCursor: action.nextCursor,
          isLoadingMore: false
        }
      };
    case 'ADD_MESSAGE':
      const currentRoom = state[action.roomId];
      return {
        ...state,
        [action.roomId]: {
          ...currentRoom,
          messages: [...(currentRoom?.messages || []), action.message]
        }
      };
    case 'UPDATE_MESSAGE':
      const roomToUpdate = state[action.roomId];
      return {
        ...state,
        [action.roomId]: {
          ...roomToUpdate,
          messages: (roomToUpdate?.messages || []).map(msg =>
            msg.id === action.messageId ? { ...msg, ...action.updates } : msg
          )
        }
      };
    case 'REMOVE_MESSAGE':
      const roomToRemoveFrom = state[action.roomId];
      return {
        ...state,
        [action.roomId]: {
          ...roomToRemoveFrom,
          messages: (roomToRemoveFrom?.messages || []).filter(msg => msg.id !== action.messageId)
        }
      };
    case 'SET_LOADING_MORE':
      const roomForLoading = state[action.roomId];
      return {
        ...state,
        [action.roomId]: {
          ...roomForLoading,
          isLoadingMore: action.isLoadingMore
        }
      };
    case 'CLEAR_ROOM':
      return {
        ...state,
        [action.roomId]: {
          messages: [],
          hasMore: false,
          nextCursor: null,
          isLoadingMore: false
        }
      };
    case 'CLEAR_ALL':
      return {};
    default:
      return state;
  }
};

export const useChatApp = ({ userId, enabled = true }: UseChatAppOptions) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [invitationRoom, setInvitationRoom] = useState<RoomListItem | null>(null);
  const queryClient = useQueryClient();

  // Supabase hooks
  const { rooms, loading: isLoadingRooms, error: roomsError, markRoomAsRead } = useSupabaseRooms();
  const { messages, loading: isLoadingMessages, error: messagesError, sendMessage } = useSupabaseMessages({
    roomId: selectedRoom || undefined,
    enabled: enabled && !!selectedRoom
  });
  const { isConnected, joinRoom, leaveRoom } = useSupabaseRealtime({ userId, enabled });

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useUsers();

  const {
    createRoomAsync,
    isCreatingRoom,
    createRoomError,
    respondToInvitationAsync,
    isRespondingToInvitation,
    invitationResponseError,
    markAsReadAsync,
    isMarkingAsRead,
    markAsReadError,
  } = useChatMutations(userId);

  // Auto-select first accepted room when rooms are loaded
  useEffect(() => {
    console.log('Auto-select effect:', { roomsLength: rooms.length, selectedRoom });
    if (rooms.length > 0 && !selectedRoom) {
      const firstAcceptedRoom = rooms.find(
        room => room.invitation_status !== InvitationStatus.PENDING
      );
      console.log('First accepted room found:', firstAcceptedRoom?.name);
      if (firstAcceptedRoom) {
        setSelectedRoom(firstAcceptedRoom.id);
      }
    }
  }, [rooms, selectedRoom]);

  // Load messages for a room via HTTP API (initial load only)
  const loadRoomMessages = useCallback(async (roomId: string) => {
    if (!userId) return;

    setIsLoadingMessages(true);
    try {
      // Load latest 20 messages initially
      const response = await fetch(`/api/messages/${roomId}?userId=${userId}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        dispatchMessages({
          type: 'SET_MESSAGES',
          roomId,
          messages: data.messages || [],
          hasMore: data.hasMore || false,
          nextCursor: data.nextCursor || null
        });
      }
    } catch (error) {
      console.error('Error loading room messages:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [userId]);

  // Load older messages when scrolling up
  const loadMoreMessages = useCallback(async (roomId: string) => {
    if (!userId) return;

    const roomData = messagesState[roomId];
    if (!roomData || !roomData.hasMore || roomData.isLoadingMore) return;

    dispatchMessages({ type: 'SET_LOADING_MORE', roomId, isLoadingMore: true });

    try {
      const response = await fetch(
        `/api/messages/${roomId}?userId=${userId}&limit=20&cursor=${roomData.nextCursor}`
      );
      if (response.ok) {
        const data = await response.json();
        dispatchMessages({
          type: 'PREPEND_MESSAGES',
          roomId,
          messages: data.messages || [],
          hasMore: data.hasMore || false,
          nextCursor: data.nextCursor || null
        });
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      dispatchMessages({ type: 'SET_LOADING_MORE', roomId, isLoadingMore: false });
    }
  }, [userId, messagesState]);

  // Handle room changes - join/leave Socket.io rooms and load messages
  useEffect(() => {
    console.log('Room change effect:', { selectedRoom, isConnected });
    if (!selectedRoom || !isConnected) return;

    console.log(`Selected room changed to: ${selectedRoom}`);

    // Join the Socket.io room
    joinRoom(selectedRoom);

    // Load initial messages for this room if not already loaded
    if (!loadedRoomsRef.current.has(selectedRoom)) {
      console.log(`Loading messages for room: ${selectedRoom}`);
      loadedRoomsRef.current.add(selectedRoom);
      loadRoomMessages(selectedRoom);
    } else {
      console.log(`Messages already loaded for room: ${selectedRoom}`);
    }

    // Leave room on cleanup
    return () => {
      if (selectedRoom) {
        leaveRoom(selectedRoom);
      }
    };
  }, [selectedRoom, isConnected, joinRoom, leaveRoom]);

  const handleRoomSelect = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    // Regular room selection
    setSelectedRoom(roomId);

    // Immediately update the room's unread count to 0 in the cache for instant UI feedback
    if (userId && room.unread_count > 0) {
      queryClient.setQueryData<RoomListItem[]>(
        ['rooms', userId],
        (oldRooms = []) => {
          return oldRooms.map(r =>
            r.id === roomId ? { ...r, unread_count: 0 } : r
          );
        }
      );

      // Mark messages as read on the server
      if (userId && room.unread_count && room.unread_count > 0) {
        try {
          await markRoomAsRead(roomId);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      }
    };

    const handleAcceptInvitation = async (invitationId: string) => {
      if (!userId) return;

      try {
        await respondToInvitationAsync({
          invitationId,
          userId,
          action: 'ACCEPTED',
        });

        // Select the accepted room if it exists in the updated rooms list
        if (invitationRoom) {
          setSelectedRoom(invitationRoom.id);
        }
        setInvitationRoom(null);
      } catch (error) {
        console.error('Error accepting invitation:', error);
      }
    };

    const handleDeclineInvitation = async (invitationId: string) => {
      if (!userId) return;

      try {
        await respondToInvitationAsync({
          invitationId,
          userId,
          action: 'DECLINED',
        });

        setInvitationRoom(null);
      } catch (error) {
        console.error('Error declining invitation:', error);
      }
    };

    const handleCreateRoom = async (roomData: {
      name: string;
      description?: string;
      type: any;
      invitedUsers: any[];
      inviteUsername?: string;
    }) => {
      if (!userId) return;

      try {
        const result = await createRoomAsync({
          ...roomData,
          ownerId: userId,
        });

        // Select the new room after creation
        if (result?.room?.id) {
          setSelectedRoom(result.room.id);
        }
      } catch (error) {
        console.error('Error creating room:', error);
      }
    };

    // Send message via API route (bypasses Supabase permission issues)
    const handleSendMessage = useCallback(async (content: string) => {
      if (!selectedRoom || !userId) {
        console.error('Cannot send message: missing selectedRoom or userId');
        return;
      }

      const currentRoom = rooms.find(room => room.id === selectedRoom);
      if (!currentRoom) {
        console.error('Cannot send message: room not found');
        return;
      }

      console.log(`Sending message to room ${currentRoom.name}:`, content);

      setIsSendingMessage(true);

      // Create a temporary message ID for tracking
      const tempMessageId = `temp-${Date.now()}-${Math.random()}`;

      // Create optimistic message for immediate UI feedback
      const optimisticMessage: MessageWithRelations = {
        id: tempMessageId,
        room_id: selectedRoom,
        sender_id: userId,
        content,
        type: MessageType.TEXT,
        created_at: new Date(),
        updated_at: new Date(),
        pending: true,
        sender: {
          id: userId,
          username: 'you',
          full_name: 'You',
          user_profile: '',
        },
        room: {
          id: selectedRoom,
          name: currentRoom.name,
          type: currentRoom.type,
        },
      };

      // Add optimistic message immediately
      dispatchMessages({
        type: 'ADD_MESSAGE',
        roomId: selectedRoom,
        message: optimisticMessage
      });

      try {
        // Send via Socket.io
        emit('message:send', {
          roomId: selectedRoom,
          content: content.trim(),
          senderId: userId,
          type: MessageType.TEXT,
          tempId: tempMessageId // Include temp ID for tracking
        });

        // Update to "sent" state
        dispatchMessages({
          type: 'UPDATE_MESSAGE',
          roomId: selectedRoom,
          messageId: tempMessageId,
          updates: { pending: false, sent: true }
        });

      } catch (error) {
        console.error('Error sending message:', error);

        // Mark message as failed
        dispatchMessages({
          type: 'UPDATE_MESSAGE',
          roomId: selectedRoom,
          messageId: tempMessageId,
          updates: { pending: false, failed: true }
        });
      } finally {
        setIsSendingMessage(false);
      }
    }, [selectedRoom, userId, rooms]);

    const currentRoom = rooms.find(room => room.id === selectedRoom);

    // Debug logging
    console.log('useChatApp state:', {
      selectedRoom,
      currentRoom: currentRoom?.name,
      messagesCount: messages.length,
      isLoadingMessages,
      roomsCount: rooms.length,
      isConnected
    });

    // Handle Socket.io events for real-time messages
    useEffect(() => {
      if (!socket || !userId) return;

      // Handle new messages from Socket.io
      const handleNewMessage = (message: MessageWithRelations) => {
        console.log('Received new message via Socket.io:', message);

        // Add message to the appropriate room
        dispatchMessages({
          type: 'ADD_MESSAGE',
          roomId: message.room_id,
          message
        });

        // If this message corresponds to our optimistic message, remove the optimistic one
        const roomMessages = messagesState[message.room_id] || [];
        const optimisticMessage = roomMessages.find(msg =>
          msg.pending === false &&
          msg.sent === true &&
          msg.sender_id === message.sender_id &&
          msg.content === message.content &&
          msg.id.startsWith('temp-')
        );

        if (optimisticMessage) {
          dispatchMessages({
            type: 'REMOVE_MESSAGE',
            roomId: message.room_id,
            messageId: optimisticMessage.id
          });
          console.log('Removed optimistic message after real message arrived');
        }
      };

      // Handle message acknowledgments (when server confirms receipt)
      const handleMessageAck = (data: { tempId: string; message: MessageWithRelations }) => {
        console.log('Message acknowledged:', data);

        // Replace temp message with real message
        dispatchMessages({
          type: 'REMOVE_MESSAGE',
          roomId: data.message.room_id,
          messageId: data.tempId
        });

        dispatchMessages({
          type: 'ADD_MESSAGE',
          roomId: data.message.room_id,
          message: data.message
        });
      };

      // Handle message errors
      const handleMessageError = (data: { tempId: string; error: string }) => {
        console.error('Message error:', data);

        // Find the temp message and mark it as failed
        Object.keys(messagesState).forEach(roomId => {
          const roomMessages = messagesState[roomId] || [];
          const tempMessage = roomMessages.find(msg => msg.id === data.tempId);
          if (tempMessage) {
            dispatchMessages({
              type: 'UPDATE_MESSAGE',
              roomId,
              messageId: data.tempId,
              updates: { pending: false, failed: true, sent: false }
            });
          }
        });
      };

      socket.on('message:new', handleNewMessage);
      socket.on('message:ack', handleMessageAck);
      socket.on('message:error', handleMessageError);

      return () => {
        socket.off('message:new', handleNewMessage);
        socket.off('message:ack', handleMessageAck);
        socket.off('message:error', handleMessageError);
      };
    }, [socket, userId, messagesState]);

    // Messages are now directly managed in local state - no complex merging needed
    const allMessages = messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return {
      // State
      selectedRoom,
      invitationRoom,
      messages,
      currentRoom,

      // Data
      rooms,
      users,

      // Loading states
      isLoading: isLoadingRooms || isLoadingUsers,
      isLoadingRooms,
      isLoadingUsers,
      isLoadingMessages,
      isCreatingRoom,
      isRespondingToInvitation,
      isMarkingAsRead,

      // Errors
      error: roomsError || usersError || messagesError,
      roomsError,
      usersError,
      messagesError,
      createRoomError,
      invitationResponseError,
      markAsReadError,

      // Actions
      handleRoomSelect,
      handleAcceptInvitation,
      handleDeclineInvitation,
      handleCreateRoom,
      handleSendMessage,
      setInvitationRoom,

      // Connection state
      isConnected,
    };
  };
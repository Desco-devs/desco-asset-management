import { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRooms, useInvalidateRooms } from './useRooms';
import { useUsers } from './useUsers';
import { useChatMutations } from './useChatMutations';
import { useSocketContext } from '@/context/SocketContext';
import { RoomListItem, MessageWithRelations, MessageType, InvitationStatus } from '@/types/chat-app';

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
  const [messagesState, dispatchMessages] = useReducer(messagesReducer, {});
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const loadedRoomsRef = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { socket, emit, joinRoom, leaveRoom, isConnected } = useSocketContext();

  // Clear messages when user changes
  useEffect(() => {
    if (userId) {
      dispatchMessages({ type: 'CLEAR_ALL' });
      loadedRoomsRef.current.clear();
    }
  }, [userId]);

  // TanStack Query hooks
  const {
    data: rooms = [],
    isLoading: isLoadingRooms,
    error: roomsError,
    refetch: refetchRooms,
  } = useRooms({ userId, enabled });

  const {
    data: users = [],
    isLoading: isLoadingUsers,
    error: usersError,
  } = useUsers();

  // Get messages for current room
  const roomData = selectedRoom ? messagesState[selectedRoom] : undefined;
  const messages = roomData?.messages || [];
  const hasMoreMessages = roomData?.hasMore || false;
  const isLoadingMoreMessages = roomData?.isLoadingMore || false;

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

  const { addRoomToCache } = useInvalidateRooms();

  // Auto-select first accepted room when rooms are loaded
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      const firstAcceptedRoom = rooms.find(
        room => room.invitation_status !== InvitationStatus.PENDING
      );
      if (firstAcceptedRoom) {
        setSelectedRoom(firstAcceptedRoom.id);
      }
    }
  }, [rooms, selectedRoom]);

  // Clean up selectedRoom if current room is no longer available
  useEffect(() => {
    if (selectedRoom && rooms.length > 0) {
      const roomExists = rooms.find(room => room.id === selectedRoom);
      if (!roomExists) {
        console.log("Selected room no longer exists, clearing selection");
        setSelectedRoom(null);
        // Optionally auto-select another room
        const firstAcceptedRoom = rooms.find(
          room => room.invitation_status !== InvitationStatus.PENDING
        );
        if (firstAcceptedRoom) {
          setSelectedRoom(firstAcceptedRoom.id);
        }
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
    if (!selectedRoom || !isConnected) return;

    console.log(`Selected room changed to: ${selectedRoom}`);

    // Join the Socket.io room
    joinRoom(selectedRoom);

    // Load initial messages for this room if not already loaded
    if (!loadedRoomsRef.current.has(selectedRoom)) {
      loadedRoomsRef.current.add(selectedRoom);
      loadRoomMessages(selectedRoom);
    }

    // Leave room on cleanup
    return () => {
      if (selectedRoom) {
        leaveRoom(selectedRoom);
      }
    };
  }, [selectedRoom, isConnected, joinRoom, leaveRoom, loadRoomMessages]);

  const handleRoomSelect = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return;

    // Check if this is a pending invitation
    if (room.invitation_status === InvitationStatus.PENDING) {
      setInvitationRoom(room);
      return;
    }

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
      try {
        await markAsReadAsync(roomId);
      } catch (error) {
        console.error('Error marking messages as read:', error);
        // Revert the optimistic update on error
        queryClient.setQueryData<RoomListItem[]>(
          ['rooms', userId],
          (oldRooms = []) => {
            return oldRooms.map(r =>
              r.id === roomId ? { ...r, unread_count: room.unread_count } : r
            );
          }
        );
      }
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    if (!userId) return;

    try {
      const result = await respondToInvitationAsync({
        invitationId,
        userId,
        action: 'ACCEPTED',
      });

      console.log('Invitation accepted:', result);

      // Select the accepted room and load its messages
      if (invitationRoom) {
        console.log('Auto-selecting accepted room:', invitationRoom.id);

        // Select the room immediately (it should already be in the rooms list)
        setSelectedRoom(invitationRoom.id);

        // Load messages for the accepted room
        loadRoomMessages(invitationRoom.id);

        // Join the room via Socket.io for real-time updates
        if (joinRoom) {
          joinRoom(invitationRoom.id);
        }
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

      console.log('Room created successfully:', result);

      // Select the new room after creation and load its messages
      if (result?.room?.id && userId) {
        console.log('Auto-selecting newly created room:', result.room.id);

        // Create a RoomListItem structure for the cache
        const newRoomForCache: RoomListItem = {
          id: result.room.id,
          name: result.room.name,
          description: result.room.description || '',
          type: result.room.type,
          avatar_url: result.room.avatar_url || '',
          owner_id: result.room.owner_id || userId, // Fallback to userId if not provided
          member_count: 1, // Just the creator initially
          unread_count: 0,
          lastMessage: undefined,
          invitation_status: InvitationStatus.ACCEPTED, // Creator is automatically accepted
          invited_by: undefined,
          invitation_id: undefined,
          created_at: result.room.created_at || new Date().toISOString(),
          updated_at: result.room.updated_at || new Date().toISOString(),
          is_owner: true, // Creator is always the owner
          // Add member data for filtering
          members: [{
            user_id: userId,
            user: {
              id: userId,
              username: 'you', // TODO: Get actual username from user context
              full_name: 'You',
              user_profile: '',
            }
          }],
          owner: {
            id: userId,
            username: 'you',
            full_name: 'You',
            user_profile: '',
          }
        };

        console.log("useChatApp - Creating room cache with owner data:");
        console.log("- result.room.owner_id:", result.room.owner_id);
        console.log("- userId:", userId);
        console.log("- newRoomForCache.owner_id:", newRoomForCache.owner_id);
        console.log("- newRoomForCache.is_owner:", newRoomForCache.is_owner);

        // Add room to cache immediately for instant UI update
        addRoomToCache(userId, newRoomForCache);

        // Select the room immediately
        setSelectedRoom(result.room.id);

        // Load messages for the new room immediately  
        loadRoomMessages(result.room.id);

        // Join the room via Socket.io for real-time updates
        if (joinRoom) {
          joinRoom(result.room.id);
        }
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  // Send message via Socket.io (primary method)
  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedRoom || !userId || !isConnected) return;

    const currentRoom = rooms.find(room => room.id === selectedRoom);
    if (!currentRoom) return;

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
  }, [selectedRoom, userId, isConnected, rooms, emit, dispatchMessages]);

  const currentRoom = rooms.find(room => room.id === selectedRoom);

  // Debug logging for currentRoom calculation
  useEffect(() => {
    if (selectedRoom) {
      console.log("useChatApp - selectedRoom:", selectedRoom);
      console.log("useChatApp - currentRoom found:", currentRoom?.id, currentRoom?.name);
      console.log("useChatApp - available rooms:", rooms.map(r => ({ id: r.id, name: r.name })));
    }
  }, [selectedRoom, currentRoom, rooms]);

  // Handle Socket.io events for real-time messages
  useEffect(() => {
    if (!socket || !userId) return;

    // Handle new messages from Socket.io
    const handleNewMessage = (message: MessageWithRelations) => {
      console.log('Received new message via Socket.io:', message);

      // Check if message is valid
      if (!message || !message.room_id) {
        console.error('Received invalid message in useChatApp:', message);
        return;
      }

      // Add message to the appropriate room
      dispatchMessages({
        type: 'ADD_MESSAGE',
        roomId: message.room_id,
        message
      });

      // If this message corresponds to our optimistic message, remove the optimistic one
      const roomData = messagesState[message.room_id];
      const roomMessages = roomData?.messages || [];
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
        const roomData = messagesState[roomId];
        const roomMessages = roomData?.messages || [];
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
    messages: allMessages,
    currentRoom,

    // Data
    rooms,
    users,

    // Loading states
    isLoading: isLoadingRooms || isLoadingUsers,
    isLoadingRooms,
    isLoadingUsers,
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    isCreatingRoom,
    isRespondingToInvitation,
    isSendingMessage,
    isMarkingAsRead,

    // Errors
    error: roomsError || usersError,
    roomsError,
    usersError,
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
    loadMoreMessages,

    // Utilities
    refetchRooms,
  };
};
import { useState, useEffect } from 'react';
import { useRooms, useRoomMessages } from './useRooms';
import { useUsers } from './useUsers';
import { useChatMutations } from './useChatMutations';
import { RoomListItem, InvitationStatus, MessageWithRelations, SendMessageData, MessageType } from '@/types/chat-app';

interface UseChatAppOptions {
  userId?: string;
  enabled?: boolean;
}

export const useChatApp = ({ userId, enabled = true }: UseChatAppOptions) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [invitationRoom, setInvitationRoom] = useState<RoomListItem | null>(null);
  const [pendingMessages, setPendingMessages] = useState<Map<string, MessageWithRelations>>(new Map());

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

  // Get messages for selected room
  const {
    data: messages = [],
    isLoading: isLoadingMessages,
    error: messagesError,
  } = useRoomMessages({
    roomId: selectedRoom || undefined,
    userId,
    enabled: !!selectedRoom && !!userId
  });

  const {
    createRoomAsync,
    isCreatingRoom,
    createRoomError,
    respondToInvitationAsync,
    isRespondingToInvitation,
    invitationResponseError,
    sendMessageAsync,
    isSendingMessage,
    sendMessageError,
    markAsReadAsync,
    isMarkingAsRead,
    markAsReadError,
  } = useChatMutations(userId);

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

  // Log when selected room changes (messages will be fetched automatically by useRoomMessages)
  useEffect(() => {
    if (selectedRoom) {
      console.log(`Selected room changed to: ${selectedRoom}`);
    }
  }, [selectedRoom]);

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
    
    // Mark messages as read when user opens the conversation
    if (userId && room.unread_count > 0) {
      try {
        await markAsReadAsync(roomId);
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

  const handleSendMessage = async (content: string) => {
    if (!selectedRoom || !userId) return;

    const currentRoom = rooms.find(room => room.id === selectedRoom);
    if (!currentRoom) return;

    console.log(`Sending message to room ${currentRoom.name}:`, content);
    
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

    // Add to pending messages for UI feedback
    setPendingMessages(prev => new Map(prev).set(tempMessageId, optimisticMessage));
    
    try {
      await sendMessageAsync({
        room_id: selectedRoom,
        content,
        sender_id: userId,
        type: MessageType.TEXT,
      });
      
      // Remove from pending messages on success
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempMessageId);
        return newMap;
      });
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as failed
      setPendingMessages(prev => {
        const newMap = new Map(prev);
        const failedMessage = newMap.get(tempMessageId);
        if (failedMessage) {
          newMap.set(tempMessageId, {
            ...failedMessage,
            pending: false,
            failed: true,
          });
        }
        return newMap;
      });
    }
  };

  const currentRoom = rooms.find(room => room.id === selectedRoom);

  // Combine real messages with pending messages
  const allMessages = [
    ...messages,
    ...Array.from(pendingMessages.values()).filter(msg => msg.room_id === selectedRoom)
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

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
    isCreatingRoom,
    isRespondingToInvitation,
    isSendingMessage,
    isMarkingAsRead,

    // Errors
    error: roomsError || usersError || messagesError,
    roomsError,
    usersError,
    messagesError,
    createRoomError,
    invitationResponseError,
    sendMessageError,
    markAsReadError,

    // Actions
    handleRoomSelect,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleCreateRoom,
    handleSendMessage,
    setInvitationRoom,

    // Utilities
    refetchRooms,
  };
};
import { useState, useEffect, useReducer, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSupabaseRooms } from './useSupabaseRooms';
import { useSupabaseMessages } from './useSupabaseMessages';
import { useSupabaseRealtime } from './useSupabaseRealtime';
import { useUsers } from './useUsers';
import { useChatMutations } from './useChatMutations';
import { RoomListItem, InvitationStatus } from '@/types/chat-app';

interface UseChatAppOptions {
  userId?: string;
  enabled?: boolean;
}



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

  // Auto-select first room when rooms are loaded
  useEffect(() => {
    if (rooms.length > 0 && !selectedRoom) {
      setSelectedRoom(rooms[0].id);
    }
  }, [rooms, selectedRoom]);

  // Clean up selectedRoom if current room is no longer available
  useEffect(() => {
    if (selectedRoom && rooms.length > 0) {
      const roomExists = rooms.find(room => room.id === selectedRoom);
      if (!roomExists) {
        console.log("Selected room no longer exists, clearing selection");
        setSelectedRoom(null);
        if (rooms.length > 0) {
          setSelectedRoom(rooms[0].id);
        }
      }
    }
  }, [rooms, selectedRoom]);


  // Handle room changes - join/leave Supabase rooms
  useEffect(() => {
    if (!selectedRoom || !isConnected) return;

    console.log(`Selected room changed to: ${selectedRoom}`);

    // Join the Supabase room
    joinRoom(selectedRoom);

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
      const result = await respondToInvitationAsync({
        invitationId,
        userId,
        action: 'ACCEPTED',
      });

      console.log('Invitation accepted:', result);

      // Select the accepted room
      if (invitationRoom) {
        console.log('Auto-selecting accepted room:', invitationRoom.id);
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

      console.log('Room created successfully:', result);

      // Select the new room after creation
      if (result?.room?.id) {
        console.log('Auto-selecting newly created room:', result.room.id);
        setSelectedRoom(result.room.id);
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  // Send message via Supabase
  const handleSendMessage = useCallback(async (content: string) => {
    if (!selectedRoom || !userId) return;

    const currentRoom = rooms.find(room => room.id === selectedRoom);
    if (!currentRoom) return;

    console.log(`Sending message to room ${currentRoom.name}:`, content);

    try {
      await sendMessage(content.trim());
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [selectedRoom, userId, rooms, sendMessage]);

  const currentRoom = rooms.find(room => room.id === selectedRoom);

  // Debug logging for currentRoom calculation
  useEffect(() => {
    if (selectedRoom) {
      console.log("useChatApp - selectedRoom:", selectedRoom);
      console.log("useChatApp - currentRoom found:", currentRoom?.id, currentRoom?.name);
      console.log("useChatApp - available rooms:", rooms.map(r => ({ id: r.id, name: r.name })));
    }
  }, [selectedRoom, currentRoom, rooms]);

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
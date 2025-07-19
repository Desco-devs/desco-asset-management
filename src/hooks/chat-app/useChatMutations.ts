import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RoomType, ChatUser, InvitationStatus, SendMessageData } from '@/types/chat-app';
import { ROOMS_QUERY_KEYS } from './useRooms';

interface CreateRoomData {
  name: string;
  description?: string;
  type: RoomType;
  ownerId: string;
  invitedUsers: ChatUser[];
  inviteUsername?: string;
}

interface InvitationResponse {
  invitationId: string;
  userId: string;
  action: 'ACCEPTED' | 'DECLINED';
}

// Using SendMessageData from @/types/chat-app (imported above)

export const useChatMutations = (currentUserId?: string) => {
  const queryClient = useQueryClient();

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: CreateRoomData) => {
      const response = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(roomData),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (currentUserId) {
        // Invalidate and refetch rooms query immediately for instant updates
        queryClient.invalidateQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
        queryClient.refetchQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
      }
    },
  });

  const respondToInvitationMutation = useMutation({
    mutationFn: async (data: InvitationResponse) => {
      const response = await fetch('/api/room-invitations/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to respond to invitation');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (currentUserId) {
        // Invalidate and refetch rooms query immediately for instant updates
        queryClient.invalidateQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
        queryClient.refetchQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: SendMessageData) => {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: data.room_id,
          content: data.content,
          senderId: data.sender_id || currentUserId,
          type: data.type || 'TEXT',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch room messages immediately
      queryClient.invalidateQueries({
        queryKey: ROOMS_QUERY_KEYS.roomMessages(variables.room_id),
      });
      queryClient.refetchQueries({
        queryKey: ROOMS_QUERY_KEYS.roomMessages(variables.room_id),
      });
      
      // Update rooms list to show new last message
      if (currentUserId) {
        queryClient.invalidateQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
        queryClient.refetchQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
      }
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await fetch(`/api/rooms/${roomId}/mark-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to mark messages as read');
      }

      return response.json();
    },
    onSuccess: (data, roomId) => {
      // Update rooms list to clear unread count
      if (currentUserId) {
        queryClient.invalidateQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
        queryClient.refetchQueries({
          queryKey: ROOMS_QUERY_KEYS.rooms(currentUserId),
        });
      }
    },
  });

  return {
    // Room creation
    createRoom: createRoomMutation.mutate,
    createRoomAsync: createRoomMutation.mutateAsync,
    isCreatingRoom: createRoomMutation.isPending,
    createRoomError: createRoomMutation.error,

    // Invitation responses
    respondToInvitation: respondToInvitationMutation.mutate,
    respondToInvitationAsync: respondToInvitationMutation.mutateAsync,
    isRespondingToInvitation: respondToInvitationMutation.isPending,
    invitationResponseError: respondToInvitationMutation.error,

    // Send message
    sendMessage: sendMessageMutation.mutate,
    sendMessageAsync: sendMessageMutation.mutateAsync,
    isSendingMessage: sendMessageMutation.isPending,
    sendMessageError: sendMessageMutation.error,

    // Mark messages as read
    markAsRead: markAsReadMutation.mutate,
    markAsReadAsync: markAsReadMutation.mutateAsync,
    isMarkingAsRead: markAsReadMutation.isPending,
    markAsReadError: markAsReadMutation.error,

    // Access to raw mutations if needed
    mutations: {
      createRoom: createRoomMutation,
      respondToInvitation: respondToInvitationMutation,
      sendMessage: sendMessageMutation,
      markAsRead: markAsReadMutation,
    },
  };
};
"use client";

import React, { createContext, useContext, useEffect } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/app/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { ROOMS_QUERY_KEYS } from '@/hooks/chat-app/useRooms';
import { RoomListItem, RoomInvitationWithRelations } from '@/types/chat-app';

interface SocketContextType {
  socket: ReturnType<typeof useSocket>['socket'];
  isConnected: boolean;
  connectionError: string | null;
  emit: (event: string, ...args: any[]) => void;
  on: (event: string, listener: (...args: any[]) => void) => void;
  off: (event: string, listener?: (...args: any[]) => void) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export const useSocketContext = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const socketMethods = useSocket({
    userId: user?.id,
    enabled: false, // Temporarily disable Socket.io to prevent xhr poll errors
  });

  const { socket, on, off } = socketMethods;

  useEffect(() => {
    if (!socket || !user?.id) return;

    // Handle room invitation received
    const handleInvitationReceived = (data: {
      room: RoomListItem;
      invitation: any;
      inviter: any;
    }) => {
      console.log('Invitation received:', data);
      
      // Invalidate rooms query to refetch with new invitation
      queryClient.invalidateQueries({
        queryKey: ROOMS_QUERY_KEYS.rooms(user.id),
      });
    };

    // Handle invitation accepted by someone else
    const handleInvitationAccepted = (data: {
      roomId: string;
      userId: string;
      invitationId: string;
    }) => {
      console.log('Invitation accepted:', data);
      
      // Invalidate rooms query to update member count and status
      queryClient.invalidateQueries({
        queryKey: ROOMS_QUERY_KEYS.rooms(user.id),
      });
    };

    // Handle member joined room
    const handleMemberJoined = (data: {
      roomId: string;
      userId: string;
      user: any;
    }) => {
      console.log('Member joined room:', data);
      
      // Invalidate rooms query to update member count
      queryClient.invalidateQueries({
        queryKey: ROOMS_QUERY_KEYS.rooms(user.id),
      });
    };

    // Handle new messages
    const handleNewMessage = (message: any) => {
      console.log('New message received:', message);
      
      // Invalidate rooms query to update last message
      queryClient.invalidateQueries({
        queryKey: ROOMS_QUERY_KEYS.rooms(user.id),
      });
      
      // Invalidate room messages if we have that query
      queryClient.invalidateQueries({
        queryKey: ROOMS_QUERY_KEYS.roomMessages(message.room_id),
      });
    };

    // Handle user online/offline status
    const handleUserOnline = (userId: string) => {
      console.log('User came online:', userId);
      // Could update user status in cache if needed
    };

    const handleUserOffline = (userId: string) => {
      console.log('User went offline:', userId);
      // Could update user status in cache if needed
    };

    // Handle errors
    const handleError = (error: { message: string; code?: string }) => {
      console.error('Socket error:', error);
    };

    // Register event listeners
    on('invitation:received', handleInvitationReceived);
    on('invitation:updated', handleInvitationAccepted);
    on('member:added', handleMemberJoined);
    on('message:new', handleNewMessage);
    on('user:online', handleUserOnline);
    on('user:offline', handleUserOffline);
    on('error', handleError);

    // Cleanup listeners on unmount
    return () => {
      off('invitation:received', handleInvitationReceived);
      off('invitation:updated', handleInvitationAccepted);
      off('member:added', handleMemberJoined);
      off('message:new', handleNewMessage);
      off('user:online', handleUserOnline);
      off('user:offline', handleUserOffline);
      off('error', handleError);
    };
  }, [socket, user?.id, queryClient, on, off]);

  return (
    <SocketContext.Provider value={socketMethods}>
      {children}
    </SocketContext.Provider>
  );
};
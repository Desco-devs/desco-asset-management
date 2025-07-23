// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD
// TODO: Re-enable when chat app is ready for production

// "use client";

// import React, { createContext, useContext, useEffect } from 'react';
// import { useSocket } from '@/hooks/useSocket';
// import { useAuth } from '@/app/context/AuthContext';
// import { useQueryClient } from '@tanstack/react-query';
// import { ROOMS_QUERY_KEYS } from '@/hooks/chat-app/useRooms';
// import { useOnlineStatus } from '@/hooks/chat-app/useOnlineStatus';
// import { RoomListItem } from '@/types/chat-app';

import React from 'react';

interface SocketContextType {
  socket: null;
  isConnected: boolean;
  connectionError: string | null;
  emit: (event: string, ...args: unknown[]) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  off: (event: string, listener?: (...args: unknown[]) => void) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  isUserOnline: (userId: string) => boolean;
  getUserLastSeen: (userId: string) => Date | undefined;
}

const SocketContext = React.createContext<SocketContextType | null>(null);

export const useSocketContext = () => {
  const context = React.useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  // Disabled socket context for production build
  const disabledSocketContext: SocketContextType = {
    socket: null,
    isConnected: false,
    connectionError: 'Chat app temporarily disabled',
    emit: () => {},
    on: () => {},
    off: () => {},
    joinRoom: () => {},
    leaveRoom: () => {},
    isUserOnline: () => false,
    getUserLastSeen: () => undefined,
  };

  return (
    <SocketContext.Provider value={disabledSocketContext}>
      {children}
    </SocketContext.Provider>
  );
};
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSupabaseRealtime } from '@/hooks/chat-app/useSupabaseRealtime';
import { RealtimePresenceState } from '@supabase/supabase-js';

interface SupabaseRealtimeContextType {
  isConnected: boolean;
  connectionError: string | null;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  sendTyping: (roomId: string, isTyping: boolean) => void;
  getPresence: () => RealtimePresenceState;
  onlineUsers: string[];
}

const SupabaseRealtimeContext = createContext<SupabaseRealtimeContextType | null>(null);

interface SupabaseRealtimeProviderProps {
  children: React.ReactNode;
}

export const SupabaseRealtimeProvider: React.FC<SupabaseRealtimeProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  
  const {
    isConnected,
    connectionError,
    joinRoom,
    leaveRoom,
    sendTyping,
    getPresence,
  } = useSupabaseRealtime({
    userId: user?.id,
    enabled: !!user,
  });

  // Update online users when presence changes
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      const presence = getPresence();
      const userIds = Object.keys(presence).filter(key => {
        const presenceData = presence[key];
        // Check if user is still active (presence data exists)
        return presenceData && presenceData.length > 0;
      });
      setOnlineUsers(userIds);
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected, getPresence]);

  const contextValue: SupabaseRealtimeContextType = {
    isConnected,
    connectionError,
    joinRoom,
    leaveRoom,
    sendTyping,
    getPresence,
    onlineUsers,
  };

  return (
    <SupabaseRealtimeContext.Provider value={contextValue}>
      {children}
    </SupabaseRealtimeContext.Provider>
  );
};

export const useSupabaseRealtimeContext = (): SupabaseRealtimeContextType => {
  const context = useContext(SupabaseRealtimeContext);
  if (!context) {
    throw new Error('useSupabaseRealtimeContext must be used within a SupabaseRealtimeProvider');
  }
  return context;
};

export default SupabaseRealtimeProvider;
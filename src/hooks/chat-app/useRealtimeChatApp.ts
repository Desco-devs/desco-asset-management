/**
 * Real-time Chat Application Hook - Enhanced Version
 * 
 * This hook extends useChatApp with advanced real-time room synchronization:
 * - Real-time room state updates
 * - Invitation notifications
 * - Room membership change handling
 * - Cache invalidation with real-time events
 * - Optimistic UI updates
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/app/context/AuthContext';
import { useChatApp } from './useChatApp';
import { useRealtimeRooms } from './useRealtimeRooms';
import { useChatCacheManager } from './useChatCacheManager';
import { RoomListItem } from '@/types/chat-app';

interface RoomInvitationNotification {
  id: string;
  roomId: string;
  roomName: string;
  invitedBy: string;
  invitedByName: string;
  timestamp: Date;
  read: boolean;
}

interface UseRealtimeChatAppReturn extends ReturnType<typeof useChatApp> {
  // Enhanced real-time features
  isRealtimeConnected: boolean;
  realtimeError: string | null;
  roomInvitationNotifications: RoomInvitationNotification[];
  unreadInvitationCount: number;
  
  // Enhanced room management
  refreshRooms: () => Promise<void>;
  markInvitationAsRead: (notificationId: string) => void;
  clearAllInvitationNotifications: () => void;
  
  // Real-time room state
  roomConnectionStates: Record<string, {
    memberCount: number;
    lastActivity: string;
    isActive: boolean;
  }>;
}

export const useRealtimeChatApp = (): UseRealtimeChatAppReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [invitationNotifications, setInvitationNotifications] = useState<RoomInvitationNotification[]>([]);
  const [roomConnectionStates, setRoomConnectionStates] = useState<Record<string, any>>({});

  // Get base chat app functionality
  const baseChatApp = useChatApp();
  const { rooms } = baseChatApp;
  
  // Get cache manager directly
  const cacheManager = useChatCacheManager(user?.id);

  // Enhanced room event handlers
  const handleRoomAdded = useCallback((room: RoomListItem) => {
    console.log('[RealtimeChatApp] Room added:', room.name);
    
    // Use cache manager from useRooms
    if (cacheManager) {
      cacheManager.addRoomToCache(room);
      cacheManager.handleRoomEvent('created', room.id, room);
    }
    
    // Check if this is from an invitation
    if (room.owner_id !== user?.id) {
      // This might be a room we were invited to
      const notification: RoomInvitationNotification = {
        id: `${room.id}-${Date.now()}`,
        roomId: room.id,
        roomName: room.name,
        invitedBy: room.owner_id || 'unknown',
        invitedByName: room.owner?.full_name || 'Unknown User',
        timestamp: new Date(),
        read: false,
      };
      
      setInvitationNotifications(prev => [notification, ...prev]);
    }
  }, [cacheManager, user?.id]);

  const handleRoomUpdated = useCallback((roomUpdate: Partial<RoomListItem> & { id: string }) => {
    console.log('[RealtimeChatApp] Room updated:', roomUpdate.id);
    if (cacheManager) {
      cacheManager.updateRoomInCache(roomUpdate);
      cacheManager.handleRoomEvent('updated', roomUpdate.id, roomUpdate);
    }
  }, [cacheManager]);

  const handleRoomDeleted = useCallback((roomId: string) => {
    console.log('[RealtimeChatApp] Room deleted:', roomId);
    if (cacheManager) {
      cacheManager.removeRoomFromCache(roomId);
      cacheManager.handleRoomEvent('deleted', roomId);
    }
    
    // Remove any notifications for this room
    setInvitationNotifications(prev => 
      prev.filter(notification => notification.roomId !== roomId)
    );
    
    // Navigate away if this was the selected room
    if (baseChatApp.selectedRoom?.id === roomId) {
      const otherRoom = rooms.find(room => room.id !== roomId);
      if (otherRoom) {
        baseChatApp.handleRoomSelect(otherRoom);
      } else {
        baseChatApp.setInvitationRoom(null);
      }
    }
  }, [cacheManager, baseChatApp, rooms]);

  const handleMembershipChanged = useCallback((roomId: string, memberCount: number) => {
    console.log('[RealtimeChatApp] Membership changed:', roomId, memberCount);
    if (cacheManager) {
      cacheManager.updateRoomInCache({ id: roomId, member_count: memberCount });
      cacheManager.handleRoomEvent('member_joined', roomId, { member_count: memberCount });
    }
    
    // Update room connection state
    setRoomConnectionStates(prev => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        memberCount,
        lastActivity: new Date().toISOString(),
        isActive: memberCount > 0,
      }
    }));
  }, [cacheManager]);

  const handleUnreadCountUpdated = useCallback((roomId: string, unreadCount: number) => {
    console.log('[RealtimeChatApp] Unread count updated:', roomId, unreadCount);
    if (cacheManager) {
      cacheManager.updateRoomInCache({ id: roomId, unread_count: unreadCount });
    }
  }, [cacheManager]);

  // Real-time room synchronization
  const {
    isConnected: isRealtimeConnected,
    connectionError: realtimeError,
    roomStates,
    broadcastRoomUpdate,
  } = useRealtimeRooms({
    userId: user?.id,
    enabled: !!user?.id,
    onRoomAdded: handleRoomAdded,
    onRoomUpdated: handleRoomUpdated,
    onRoomDeleted: handleRoomDeleted,
    onMembershipChanged: handleMembershipChanged,
    onUnreadCountUpdated: handleUnreadCountUpdated,
  });

  // Update room connection states from real-time data
  useEffect(() => {
    setRoomConnectionStates(prev => ({
      ...prev,
      ...Object.keys(roomStates).reduce((acc, roomId) => {
        const state = roomStates[roomId];
        acc[roomId] = {
          memberCount: state.member_count,
          lastActivity: state.last_activity,
          isActive: state.member_count > 0,
        };
        return acc;
      }, {} as Record<string, any>)
    }));
  }, [roomStates]);

  // Enhanced room management functions
  const refreshRooms = useCallback(async () => {
    if (!user?.id) return;
    
    console.log('[RealtimeChatApp] Refreshing rooms...');
    
    // Invalidate room-related queries
    await queryClient.invalidateQueries({
      queryKey: ['rooms', user.id],
    });
    
    // Refresh rooms via cache manager
    await cacheManager.invalidateRooms({ refetch: true });
  }, [user?.id, queryClient, cacheManager]);

  const markInvitationAsRead = useCallback((notificationId: string) => {
    setInvitationNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const clearAllInvitationNotifications = useCallback(() => {
    setInvitationNotifications([]);
  }, []);

  // Enhanced room creation handler
  const handleCreateRoomWithBroadcast = useCallback(async (data: Parameters<typeof baseChatApp.handleCreateRoom>[0]) => {
    try {
      await baseChatApp.handleCreateRoom(data);
      
      // Broadcast room creation to other users
      if (data.invitedUsers?.length > 0) {
        console.log('[RealtimeChatApp] Broadcasting room creation to invited users');
        // The real-time subscriptions will handle notifying invited users
      }
      
      // Refresh rooms to ensure consistency
      await refreshRooms();
    } catch (error) {
      console.error('[RealtimeChatApp] Failed to create room:', error);
      throw error;
    }
  }, [baseChatApp.handleCreateRoom, refreshRooms]);

  // Enhanced invitation response handlers
  const handleAcceptInvitationWithBroadcast = useCallback(async (invitationId: string) => {
    try {
      await baseChatApp.handleAcceptInvitation(invitationId);
      
      // Mark related notifications as read
      setInvitationNotifications(prev =>
        prev.map(notification => ({ ...notification, read: true }))
      );
      
      // Refresh rooms to get the updated room
      await refreshRooms();
    } catch (error) {
      console.error('[RealtimeChatApp] Failed to accept invitation:', error);
      throw error;
    }
  }, [baseChatApp.handleAcceptInvitation, refreshRooms]);

  const handleDeclineInvitationWithBroadcast = useCallback(async (invitationId: string) => {
    try {
      await baseChatApp.handleDeclineInvitation(invitationId);
      
      // Remove related notifications
      setInvitationNotifications(prev =>
        prev.filter(notification => notification.id !== invitationId)
      );
    } catch (error) {
      console.error('[RealtimeChatApp] Failed to decline invitation:', error);
      throw error;
    }
  }, [baseChatApp.handleDeclineInvitation]);

  // Computed values
  const unreadInvitationCount = useMemo(() => 
    invitationNotifications.filter(notification => !notification.read).length,
    [invitationNotifications]
  );

  return {
    ...baseChatApp,
    
    // Enhanced real-time features
    isRealtimeConnected,
    realtimeError,
    roomInvitationNotifications: invitationNotifications,
    unreadInvitationCount,
    
    // Enhanced room management
    refreshRooms,
    markInvitationAsRead,
    clearAllInvitationNotifications,
    
    // Real-time room state
    roomConnectionStates,
    
    // Override handlers with enhanced versions
    handleCreateRoom: handleCreateRoomWithBroadcast,
    handleAcceptInvitation: handleAcceptInvitationWithBroadcast,
    handleDeclineInvitation: handleDeclineInvitationWithBroadcast,
  };
};

export default useRealtimeChatApp;
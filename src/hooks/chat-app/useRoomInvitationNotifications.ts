/**
 * Room Invitation Notifications Hook
 * 
 * Provides real-time notifications for room invitations using Supabase subscriptions
 * Handles invitation status changes, new invitations, and notification management
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

interface RoomInvitation {
  id: string;
  room_id: string;
  invited_user: string;
  invited_by: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  created_at: string;
  updated_at: string;
}

interface InvitationNotification {
  id: string;
  invitationId: string;
  roomId: string;
  roomName: string;
  invitedBy: string;
  invitedByName: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  timestamp: Date;
  read: boolean;
}

interface UseRoomInvitationNotificationsOptions {
  userId?: string;
  enabled?: boolean;
  onNewInvitation?: (notification: InvitationNotification) => void;
  onInvitationStatusChanged?: (invitationId: string, status: string) => void;
}

export const useRoomInvitationNotifications = ({
  userId,
  enabled = true,
  onNewInvitation,
  onInvitationStatusChanged,
}: UseRoomInvitationNotificationsOptions) => {
  const [notifications, setNotifications] = useState<InvitationNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  
  // Stable callback refs to prevent effect re-runs
  const onNewInvitationRef = useRef(onNewInvitation);
  const onInvitationStatusChangedRef = useRef(onInvitationStatusChanged);
  
  // Update refs when callbacks change
  useEffect(() => {
    onNewInvitationRef.current = onNewInvitation;
  }, [onNewInvitation]);
  
  useEffect(() => {
    onInvitationStatusChangedRef.current = onInvitationStatusChanged;
  }, [onInvitationStatusChanged]);

  // Fetch room details for notification
  const fetchRoomDetails = useCallback(async (roomId: string) => {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select(`
          id,
          name,
          owner:users (
            id,
            full_name,
            username
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching room details:', err);
      return null;
    }
  }, [supabase]);

  // Fetch user details
  const fetchUserDetails = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, username')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Error fetching user details:', err);
      return null;
    }
  }, [supabase]);

  // Create notification from invitation data
  const createNotificationFromInvitation = useCallback(async (invitation: RoomInvitation): Promise<InvitationNotification | null> => {
    const roomDetails = await fetchRoomDetails(invitation.room_id);
    const inviterDetails = await fetchUserDetails(invitation.invited_by);

    if (!roomDetails || !inviterDetails) return null;

    return {
      id: `invitation-${invitation.id}`,
      invitationId: invitation.id,
      roomId: invitation.room_id,
      roomName: roomDetails.name,
      invitedBy: invitation.invited_by,
      invitedByName: inviterDetails.full_name || inviterDetails.username || 'Unknown User',
      status: invitation.status,
      timestamp: new Date(invitation.created_at),
      read: false,
    };
  }, [fetchRoomDetails, fetchUserDetails]);

  // Load existing pending invitations on mount
  const loadPendingInvitations = useCallback(async () => {
    if (!userId || !enabled) return;

    try {
      const { data: invitations, error } = await supabase
        .from('room_invitations')
        .select('*')
        .eq('invited_user', userId)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert invitations to notifications
      const notifications: InvitationNotification[] = [];
      for (const invitation of invitations || []) {
        const notification = await createNotificationFromInvitation(invitation);
        if (notification) {
          notifications.push(notification);
        }
      }

      setNotifications(notifications);
    } catch (err) {
      console.error('Error loading pending invitations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invitations');
    }
  }, [userId, enabled, supabase, createNotificationFromInvitation]);

  // Set up real-time subscription
  useEffect(() => {
    if (!enabled || !userId) {
      setNotifications([]);
      setIsConnected(false);
      return;
    }

    console.log('[InvitationNotifications] Setting up subscription for user:', userId);
    
    // Define loadPendingInvitations inside the effect to avoid dependency issues
    const loadPendingInvitationsInternal = async () => {
      try {
        const { data: invitations, error } = await supabase
          .from('room_invitations')
          .select('*')
          .eq('invited_user', userId)
          .eq('status', 'PENDING')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Convert invitations to notifications
        const notifications: InvitationNotification[] = [];
        for (const invitation of invitations || []) {
          const notification = await createNotificationFromInvitation(invitation);
          if (notification) {
            notifications.push(notification);
          }
        }

        setNotifications(notifications);
      } catch (err) {
        console.error('Error loading pending invitations:', err);
        setError(err instanceof Error ? err.message : 'Failed to load invitations');
      }
    };

    const channel = supabase.channel('room-invitations');

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'room_invitations',
          filter: `invited_user=eq.${userId}`,
        },
        async (payload: RealtimePostgresChangesPayload<RoomInvitation>) => {
          const newInvitation = payload.new as RoomInvitation;
          console.log('[InvitationNotifications] New invitation received:', newInvitation);

          const notification = await createNotificationFromInvitation(newInvitation);
          if (notification) {
            setNotifications(prev => [notification, ...prev]);
            onNewInvitationRef.current?.(notification);

            // Invalidate room invitations queries
            queryClient.invalidateQueries({
              queryKey: ['room-invitations'],
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'room_invitations',
          filter: `invited_user=eq.${userId}`,
        },
        async (payload: RealtimePostgresChangesPayload<RoomInvitation>) => {
          const updatedInvitation = payload.new as RoomInvitation;
          console.log('[InvitationNotifications] Invitation updated:', updatedInvitation);

          setNotifications(prev =>
            prev.map(notification =>
              notification.invitationId === updatedInvitation.id
                ? { ...notification, status: updatedInvitation.status, read: true }
                : notification
            )
          );

          onInvitationStatusChangedRef.current?.(updatedInvitation.id, updatedInvitation.status);

          // If invitation was accepted, invalidate rooms query to show the new room
          if (updatedInvitation.status === 'ACCEPTED') {
            queryClient.invalidateQueries({
              queryKey: ['rooms', userId],
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'room_invitations',
          filter: `invited_user=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<RoomInvitation>) => {
          const deletedInvitation = payload.old as RoomInvitation;
          console.log('[InvitationNotifications] Invitation deleted:', deletedInvitation);

          setNotifications(prev =>
            prev.filter(notification => notification.invitationId !== deletedInvitation.id)
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[InvitationNotifications] Subscription active');
          setIsConnected(true);
          setError(null);
          
          // Load existing invitations
          loadPendingInvitationsInternal();
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[InvitationNotifications] Subscription error');
          setError('Failed to connect to invitation notifications');
          setIsConnected(false);
        }
      });

    return () => {
      console.log('[InvitationNotifications] Cleaning up subscription');
      channel.unsubscribe();
      setIsConnected(false);
    };
  }, [enabled, userId]);

  // Notification management functions
  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  const removeNotification = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.filter(notification => notification.id !== notificationId)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Computed values
  const unreadCount = notifications.filter(n => !n.read).length;
  const pendingInvitations = notifications.filter(n => n.status === 'PENDING');

  return {
    notifications,
    unreadCount,
    pendingInvitations,
    isConnected,
    error,
    
    // Actions
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
    refresh: loadPendingInvitations,
  };
};

export default useRoomInvitationNotifications;
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";
import { profileKeys } from "./useProfileQuery";

/**
 * Simple Profile Realtime Hook
 * 
 * This hook listens to Supabase realtime changes on the users table
 * and invalidates TanStack Query cache to trigger refetch with fresh data.
 * 
 * SIMPLE & EFFECTIVE - Following the golden rule: Keep it simple, stupid!
 */
export function useProfileRealtime(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    // Single channel for profile changes
    const channel = supabase
      .channel('profile-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',                    // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'users',
          // Optional: Filter by specific user if userId provided
          ...(userId && { filter: `id=eq.${userId}` })
        },
        (payload) => {
          // Just invalidate cache - let TanStack Query handle the rest
          
          // Invalidate current profile queries
          queryClient.invalidateQueries({ queryKey: profileKeys.current() });
          
          // If we have a specific user ID, also invalidate that user's profile
          if (userId) {
            queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) });
          }
          
          // If the change was for a specific user in the payload, invalidate that too
          if ((payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id) {
            const changedUserId = (payload.new as Record<string, unknown>)?.id || (payload.old as Record<string, unknown>)?.id;
            if (changedUserId && typeof changedUserId === 'string') {
              queryClient.invalidateQueries({ queryKey: profileKeys.detail(changedUserId) });
            }
          }
          
          // Also invalidate any user-related queries that might be affected
          queryClient.invalidateQueries({ queryKey: ['users'] });
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, userId]);

  // Return connection status if needed (optional)
  return { isListening: true };
}

/**
 * Global User Changes Realtime Hook
 * 
 * Listens to all user changes for admin dashboard or user management views
 */
export function useUsersRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users'
        },
        () => {
          // Invalidate all user-related queries
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: profileKeys.all });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  return { isListening: true };
}

/**
 * Current User Status Realtime Hook
 * 
 * Specifically listens to online status changes for the current user
 */
export function useCurrentUserStatusRealtime(currentUserId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    const channel = supabase
      .channel('user-status-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${currentUserId}`
        },
        (payload) => {
          // Check if online status or last_seen changed
          const oldRecord = payload.old;
          const newRecord = payload.new;
          
          if (
            oldRecord?.is_online !== newRecord?.is_online ||
            oldRecord?.last_seen !== newRecord?.last_seen
          ) {
            // Only invalidate current profile for status changes
            queryClient.invalidateQueries({ queryKey: profileKeys.current() });
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient, currentUserId]);

  return { isListening: true };
}
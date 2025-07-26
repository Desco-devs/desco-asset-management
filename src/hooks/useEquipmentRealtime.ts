"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase";

/**
 * Simple Equipment Realtime Hook
 * 
 * This hook listens to Supabase realtime changes on the equipment table
 * and invalidates TanStack Query cache to trigger refetch with fresh data.
 * 
 * SIMPLE & EFFECTIVE - No overcomplicated error handling or transformations.
 */
export function useEquipmentRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();

    // Single channel for all equipment changes
    const channel = supabase
      .channel('equipment-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',                    // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'equipment'
        },
        () => {
          // Just invalidate cache - let TanStack Query handle the rest
          queryClient.invalidateQueries({ queryKey: ['equipments'] });
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  // Return connection status if needed (optional)
  return { isListening: true };
}
'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

export function useEquipmentRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('equipment-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'equipment',
        },
        () => {
          // Just invalidate - let TanStack Query handle the rest
          queryClient.invalidateQueries({ queryKey: ['equipments'] })
        }
      )
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [queryClient])
}

// Removed useMaintenanceReportsRealtime() - duplicate functionality
// useEquipmentsQuery.ts already handles maintenance reports realtime with optimistic updates
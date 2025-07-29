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
          console.log('🔄 Realtime equipment update detected');
          
          // Add delay to let server responses finish first
          setTimeout(() => {
            console.log('⏰ Processing realtime update after delay');
            queryClient.invalidateQueries({ queryKey: ['equipments'] })
            queryClient.invalidateQueries({ queryKey: ['equipments', 'list'] })
          }, 500); // Increased delay to ensure server response completes
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [queryClient])
}

export function useMaintenanceReportsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('maintenance-reports-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_equipment_report',
        },
        () => {
          // Just invalidate - let TanStack Query handle the rest
          queryClient.invalidateQueries({ queryKey: ['maintenance-reports'] })
          queryClient.invalidateQueries({ queryKey: ['equipments'] }) // Equipment might have new reports
          queryClient.invalidateQueries({ queryKey: ['equipments', 'list'] }) // Match query pattern
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [queryClient])
}
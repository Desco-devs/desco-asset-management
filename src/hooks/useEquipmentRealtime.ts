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

    return () => channel.unsubscribe()
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
          queryClient.invalidateQueries({ queryKey: ['equipments'] })
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [queryClient])
}
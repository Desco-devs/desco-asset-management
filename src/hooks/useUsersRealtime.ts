'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

export function useUsersRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('users-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
        },
        () => {
          // Just invalidate - let TanStack Query handle the rest
          queryClient.invalidateQueries({ queryKey: ['users'] })
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [queryClient])
}
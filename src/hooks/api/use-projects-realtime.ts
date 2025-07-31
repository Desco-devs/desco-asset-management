'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { projectsKeys } from './use-projects'

/**
 * Simple projects realtime hook following REALTIME_PATTERN.md
 * Just invalidates cache - let TanStack Query handle the rest
 */
export function useProjectsRealtime() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('projects-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'locations'
      }, () => {
        queryClient.invalidateQueries({ queryKey: projectsKeys.locations() })
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients'
      }, () => {
        queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
        // Also invalidate location-specific client queries
        queryClient.invalidateQueries({ queryKey: ['clients'] })
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects'
      }, () => {
        queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
        // Also invalidate client-specific project queries
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      })
      .subscribe()

    return () => channel.unsubscribe()
  }, [queryClient])
}
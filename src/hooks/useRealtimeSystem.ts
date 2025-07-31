'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'

/**
 * Consolidated Realtime System Hook - Following REALTIME_PATTERN.md
 * 
 * Single hook to handle all realtime subscriptions across the application
 * Just invalidates cache - let TanStack Query handle the rest
 * 
 * Usage: Call this once in your main layout or app component
 */
export function useRealtimeSystem() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    // Single channel for all realtime updates
    const channel = supabase
      .channel('system-realtime')
      
      // Dashboard data tables
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'locations'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['locations'] })
      })
      
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'clients'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['clients'] })
      })
      
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['projects'] })
      })
      
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehicles'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      })
      
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'equipment'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['equipments'] })
      })
      
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'maintenance_reports'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] })
        queryClient.invalidateQueries({ queryKey: ['maintenance-reports'] })
      })
      
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'maintenance_equipment_report'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-data'] })
        queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] })
        queryClient.invalidateQueries({ queryKey: ['maintenance-reports'] })
        queryClient.invalidateQueries({ queryKey: ['equipments'] })
      })
      
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['users'] })
      })
      
      .subscribe()

    return () => channel.unsubscribe()
  }, [queryClient])
}

/**
 * Simple hook to get realtime connection status
 * Returns true if we have an active connection
 */
export function useRealtimeStatus() {
  // For now, we assume connection is active
  // Could be enhanced to track actual connection state
  return { isConnected: true }
}
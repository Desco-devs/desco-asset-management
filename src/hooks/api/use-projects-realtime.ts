'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { projectsKeys } from './use-projects'
import type { Location, Client, Project } from '@/types/projects'
import { toast } from 'sonner'

/**
 * Hook to setup Supabase realtime subscriptions for projects module
 * Follows the proper pattern: Supabase → Streams DB changes → TanStack Query cache updates
 */
export function useProjectsRealtime() {
  const queryClient = useQueryClient()
  const processedEvents = useRef<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    
    console.log('🔌 Setting up Projects realtime subscriptions...')

    // Locations realtime subscription
    const locationsChannel = supabase
      .channel(`locations-realtime-${Math.random().toString(36).substring(2, 11)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'locations'
        },
        (payload) => {
          try {
            if (!payload || typeof payload !== 'object') {
              console.warn('Invalid location payload:', payload)
              return
            }

            const eventType = (payload as any).eventType || (payload as any).event
            if (!eventType) {
              console.warn('Invalid location payload (no event type):', payload)
              return
            }

            console.log('🏢 Location realtime event:', eventType, payload)

            if (eventType === 'INSERT' && payload.new) {
              const locationData = payload.new as Location
              
              queryClient.setQueryData<Location[]>(projectsKeys.locations(), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return [locationData]
                const existing = oldData.find(loc => loc.id === locationData.id)
                if (existing) return oldData
                return [locationData, ...oldData]
              })
            } else if (eventType === 'UPDATE' && payload.new) {
              const locationData = payload.new as Location
              
              queryClient.setQueryData<Location[]>(projectsKeys.locations(), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return [locationData]
                return oldData.map(location => 
                  location.id === locationData.id ? locationData : location
                )
              })
            } else if (eventType === 'DELETE' && payload.old) {
              const deletedLocation = payload.old as Location
              console.log('🗑️ REALTIME: Processing location delete event for:', deletedLocation.id, '(NO TOAST)')
              
              queryClient.setQueryData<Location[]>(projectsKeys.locations(), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return []
                return oldData.filter(location => location.id !== deletedLocation.id)
              })
            }
          } catch (error) {
            console.error('Error handling realtime location event:', error)
            queryClient.invalidateQueries({ queryKey: projectsKeys.locations() })
          }
        }
      )
      .subscribe()

    // Clients realtime subscription  
    const clientsChannel = supabase
      .channel(`clients-realtime-${Math.random().toString(36).substring(2, 11)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clients'
        },
        (payload) => {
          try {
            if (!payload || typeof payload !== 'object') {
              console.warn('Invalid client payload:', payload)
              return
            }

            const eventType = (payload as any).eventType || (payload as any).event
            if (!eventType) {
              console.warn('Invalid client payload (no event type):', payload)
              return
            }

            console.log('👥 Client realtime event:', eventType, payload)

            if (eventType === 'INSERT' && payload.new) {
              const clientData = payload.new as Client
              
              queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return [clientData]
                const existing = oldData.find(client => client.id === clientData.id)
                if (existing) return oldData
                return [clientData, ...oldData]
              })
              // Update location-specific query too
              queryClient.setQueryData<Client[]>(projectsKeys.clientsByLocation(clientData.location_id), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return [clientData]
                const existing = oldData.find(client => client.id === clientData.id)
                if (existing) return oldData
                return [clientData, ...oldData]
              })
            } else if (eventType === 'UPDATE' && payload.new) {
              const clientData = payload.new as Client
              
              queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return [clientData]
                return oldData.map(client => 
                  client.id === clientData.id ? clientData : client
                )
              })
              // Update location-specific queries
              queryClient.setQueryData<Client[]>(projectsKeys.clientsByLocation(clientData.location_id), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return [clientData]
                return oldData.map(client => 
                  client.id === clientData.id ? clientData : client
                )
              })
            } else if (eventType === 'DELETE' && payload.old) {
              const deletedClient = payload.old as Client
              console.log('🗑️ REALTIME: Processing client delete event for:', deletedClient.id, '(NO TOAST)')
              
              queryClient.setQueryData<Client[]>(projectsKeys.clients(), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return []
                return oldData.filter(client => client.id !== deletedClient.id)
              })
              // Update location-specific query
              queryClient.setQueryData<Client[]>(projectsKeys.clientsByLocation(deletedClient.location_id), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return []
                return oldData.filter(client => client.id !== deletedClient.id)
              })
            }
          } catch (error) {
            console.error('Error handling realtime client event:', error)
            queryClient.invalidateQueries({ queryKey: projectsKeys.clients() })
          }
        }
      )
      .subscribe()

    // Projects realtime subscription
    const projectsChannel = supabase
      .channel(`projects-realtime-${Math.random().toString(36).substring(2, 11)}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        (payload) => {
          try {
            if (!payload || typeof payload !== 'object') {
              console.warn('Invalid project payload:', payload)
              return
            }

            const eventType = (payload as any).eventType || (payload as any).event
            if (!eventType) {
              console.warn('Invalid project payload (no event type):', payload)
              return
            }

            console.log('📋 Project realtime event:', eventType, payload)

            if (eventType === 'INSERT' && payload.new) {
              const projectData = payload.new as Project
              
              queryClient.setQueryData(projectsKeys.projects(), (oldData: any) => {
                if (!oldData) {
                  return { data: [projectData], permissions: null }
                }
                if (!oldData.data || !Array.isArray(oldData.data)) {
                  return { data: [projectData], permissions: oldData?.permissions || null }
                }
                const existing = oldData.data.find((project: Project) => project.id === projectData.id)
                if (existing) return oldData
                return { ...oldData, data: [projectData, ...oldData.data] }
              })
              // Update client-specific query too
              queryClient.setQueryData<Project[]>(projectsKeys.projectsByClient(projectData.client_id), (oldData) => {
                if (!oldData) return [projectData]
                if (!Array.isArray(oldData)) return [projectData]
                const existing = oldData.find(project => project.id === projectData.id)
                if (existing) return oldData
                return [projectData, ...oldData]
              })
            } else if (eventType === 'UPDATE' && payload.new) {
              const projectData = payload.new as Project
              
              queryClient.setQueryData(projectsKeys.projects(), (oldData: any) => {
                if (!oldData) {
                  return { data: [projectData], permissions: null }
                }
                if (!oldData.data || !Array.isArray(oldData.data)) {
                  return { data: [projectData], permissions: oldData?.permissions || null }
                }
                return { 
                  ...oldData, 
                  data: oldData.data.map((project: Project) => 
                    project.id === projectData.id ? projectData : project
                  )
                }
              })
              // Update client-specific query
              queryClient.setQueryData<Project[]>(projectsKeys.projectsByClient(projectData.client_id), (oldData) => {
                if (!oldData) return [projectData]
                if (!Array.isArray(oldData)) return [projectData]
                return oldData.map(project => 
                  project.id === projectData.id ? projectData : project
                )
              })
            } else if (eventType === 'DELETE' && payload.old) {
              const deletedProject = payload.old as Project
              console.log('🗑️ REALTIME: Processing project delete event for:', deletedProject.id, '(NO TOAST)')
              
              queryClient.setQueryData(projectsKeys.projects(), (oldData: any) => {
                if (!oldData) {
                  return { data: [], permissions: null }
                }
                if (!oldData.data || !Array.isArray(oldData.data)) {
                  return { data: [], permissions: oldData?.permissions || null }
                }
                return { 
                  ...oldData, 
                  data: oldData.data.filter((project: Project) => project.id !== deletedProject.id)
                }
              })
              // Update client-specific query
              queryClient.setQueryData<Project[]>(projectsKeys.projectsByClient(deletedProject.client_id), (oldData) => {
                if (!oldData || !Array.isArray(oldData)) return []
                return oldData.filter(project => project.id !== deletedProject.id)
              })
            }
          } catch (error) {
            console.error('Error handling realtime project event:', error)
            queryClient.invalidateQueries({ queryKey: projectsKeys.projects() })
          }
        }
      )
      .subscribe()

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up Projects realtime subscriptions...')
      locationsChannel.unsubscribe()
      clientsChannel.unsubscribe() 
      projectsChannel.unsubscribe()
    }
  }, [queryClient])
}
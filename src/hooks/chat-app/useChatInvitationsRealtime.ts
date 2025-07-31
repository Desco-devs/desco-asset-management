'use client'

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { CHAT_QUERY_KEYS, INVITATIONS_QUERY_KEYS } from './queryKeys'
import type { ChatUser } from '@/types/chat-app'

/**
 * Chat Invitations Real-time Hook
 * 
 * Simple real-time sync for invitations following REALTIME_PATTERN.md:
 * - Listens to invitation broadcasts
 * - Invalidates cache for fresh data
 * - No complex error handling or data transformation
 */
export function useChatInvitationsRealtime(currentUser?: ChatUser) {
  const queryClient = useQueryClient()

  const invalidateInvitationQueries = useCallback(() => {
    if (!currentUser) return

    // Invalidate all invitation-related queries
    queryClient.invalidateQueries({ 
      queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser.id) 
    })
    
    // Also invalidate rooms since accepting invitations affects room membership
    queryClient.invalidateQueries({ 
      queryKey: CHAT_QUERY_KEYS.rooms(currentUser.id) 
    })
    
    console.log('📨 Invalidated invitation queries for user:', currentUser.id)
  }, [queryClient, currentUser?.id])

  useEffect(() => {
    if (!currentUser) return

    const supabase = createClient()
    
    console.log('📨 Setting up invitations real-time...')

    const channel = supabase
      .channel('room-invitations', {
        config: {
          broadcast: { self: false } // Don't receive our own broadcasts
        }
      })
      .on('broadcast', { event: 'invitation_created' }, (payload) => {
        const { invited_user } = payload.payload
        
        // Only invalidate if this user received an invitation
        if (invited_user === currentUser.id) {
          console.log('📨 New invitation received')
          invalidateInvitationQueries()
        }
      })
      .on('broadcast', { event: 'invitation_responded' }, (payload) => {
        const { invitation } = payload.payload
        
        // Invalidate if this user was involved (sender or receiver)
        if (invitation.invited_by === currentUser.id || invitation.invited_user === currentUser.id) {
          console.log('📨 Invitation response received')
          invalidateInvitationQueries()
        }
      })
      .on('broadcast', { event: 'invitation_cancelled' }, (payload) => {
        const { invited_user } = payload.payload
        
        // Invalidate if this user's invitation was cancelled
        if (invited_user === currentUser.id) {
          console.log('📨 Invitation cancelled')
          invalidateInvitationQueries()
        }
      })
      .subscribe((status) => {
        console.log('📨 Invitations realtime status:', status)
      })

    return () => {
      console.log('📨 Cleaning up invitations real-time...')
      channel.unsubscribe()
    }
  }, [currentUser?.id, invalidateInvitationQueries])

  return {
    // Just indicate if real-time is active
    isConnected: !!currentUser
  }
}


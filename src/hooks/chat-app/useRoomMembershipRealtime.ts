'use client'

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { CHAT_QUERY_KEYS } from './queryKeys'
import type { ChatUser } from '@/types/chat-app'

/**
 * Room Membership Real-time Hook
 * 
 * Dedicated hook for handling real-time room membership changes.
 * This hook specifically listens to the broadcast events sent by the API
 * when users join or leave rooms through invitations.
 */
export function useRoomMembershipRealtime(currentUser?: ChatUser) {
  const queryClient = useQueryClient()

  const invalidateRoomQueries = useCallback((roomId?: string) => {
    if (!currentUser?.id) return

    console.log('🔄 Invalidating room queries for user:', currentUser.id, 'room:', roomId)

    // Always invalidate the user's room list
    queryClient.invalidateQueries({ 
      queryKey: CHAT_QUERY_KEYS.rooms(currentUser.id),
      exact: true
    })

    // If specific room, also invalidate its messages
    if (roomId) {
      queryClient.invalidateQueries({ 
        queryKey: CHAT_QUERY_KEYS.roomMessages(roomId),
        exact: true
      })
    }
  }, [queryClient, currentUser?.id])

  useEffect(() => {
    if (!currentUser?.id) return

    const supabase = createClient()
    
    console.log('👥 Setting up room membership real-time for user:', currentUser.id)

    // Helper function to handle member_added events
    const handleMemberAdded = (payload: any) => {
      const { room_id, user_id, member } = payload.payload
      
      console.log('👥 Member added to room:', { room_id, user_id, member_name: member?.full_name })
      
      // If current user was added to the room, invalidate their queries
      if (user_id === currentUser.id) {
        console.log('✅ Current user joined room, invalidating queries')
        invalidateRoomQueries(room_id)
      } else {
        // If someone else joined a room the current user is in, 
        // we still need to update the room info (member count, etc.)
        invalidateRoomQueries()
      }
    }

    // Helper function to handle member_removed events
    const handleMemberRemoved = (payload: any) => {
      const { room_id, user_id } = payload.payload
      
      console.log('👥 Member removed from room:', { room_id, user_id })
      
      // If current user was removed, clear their room-specific data
      if (user_id === currentUser.id) {
        console.log('❌ Current user removed from room, clearing data')
        queryClient.removeQueries({ 
          queryKey: CHAT_QUERY_KEYS.roomMessages(room_id),
          exact: true
        })
        invalidateRoomQueries()
      } else {
        // If someone else left, just update room info
        invalidateRoomQueries()
      }
    }

    // Helper function to handle invitation responses
    const handleInvitationResponse = (payload: any) => {
      const { invitation, status, room_id, invited_user } = payload.payload
      
      console.log('📨 Invitation responded:', { status, room_id, invited_user })
      
      // If current user accepted an invitation, invalidate their room queries
      if (status === 'ACCEPTED' && invited_user === currentUser.id) {
        console.log('✅ Current user accepted invitation, invalidating queries')
        invalidateRoomQueries(room_id)
      }
    }

    // Set up the main chat-rooms channel (primary channel used by API)
    const chatRoomsChannel = supabase
      .channel('chat-rooms', {
        config: {
          broadcast: { self: false }, // Don't receive our own broadcasts
        }
      })
      .on('broadcast', { event: 'member_added' }, handleMemberAdded)
      .on('broadcast', { event: 'member_removed' }, handleMemberRemoved)
      .on('broadcast', { event: 'invitation_responded' }, handleInvitationResponse)
      .subscribe((status) => {
        console.log('👥 Chat rooms channel status:', status)
      })

    // Set up the backup room-membership-updates channel
    const membershipChannel = supabase
      .channel('room-membership-updates', {
        config: {
          broadcast: { self: false }, // Don't receive our own broadcasts
        }
      })
      .on('broadcast', { event: 'member_added' }, handleMemberAdded)
      .on('broadcast', { event: 'member_removed' }, handleMemberRemoved)
      .on('broadcast', { event: 'invitation_responded' }, handleInvitationResponse)
      .subscribe((status) => {
        console.log('👥 Membership channel status:', status)
      })

    return () => {
      console.log('👥 Cleaning up room membership real-time...')
      chatRoomsChannel.unsubscribe()
      membershipChannel.unsubscribe()
    }
  }, [currentUser?.id, invalidateRoomQueries, queryClient])

  return {
    isConnected: !!currentUser?.id
  }
}
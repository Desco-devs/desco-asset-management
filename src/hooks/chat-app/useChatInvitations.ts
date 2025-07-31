'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { invitation_status } from '@prisma/client'
import type { 
  RoomInvitationWithRelations, 
  SendInvitationData,
  ChatUser 
} from '@/types/chat-app'
import { CHAT_QUERY_KEYS, INVITATIONS_QUERY_KEYS } from './queryKeys'

/**
 * Chat Invitations Query Hook
 * 
 * Manages room invitations following REALTIME_PATTERN.md:
 * - TanStack Query for data management
 * - Optimistic updates for instant feedback
 * - Simple real-time sync via cache invalidation
 */

// Fetch invitations for current user
const fetchInvitations = async (
  type: 'sent' | 'received' = 'received',
  status?: invitation_status
): Promise<RoomInvitationWithRelations[]> => {
  const params = new URLSearchParams()
  params.set('type', type)
  if (status) params.set('status', status)

  const response = await fetch(`/api/rooms/invitations?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch invitations')
  }
  
  const data = await response.json()
  return data.invitations
}

// Send invitation
const sendInvitation = async (data: SendInvitationData): Promise<RoomInvitationWithRelations> => {
  const response = await fetch('/api/rooms/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to send invitation')
  }
  
  const result = await response.json()
  return result.invitation
}

// Respond to invitation
const respondToInvitation = async (
  invitationId: string, 
  status: invitation_status.ACCEPTED | invitation_status.DECLINED
): Promise<RoomInvitationWithRelations> => {
  const response = await fetch(`/api/rooms/invitations/${invitationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to respond to invitation')
  }
  
  const result = await response.json()
  return result.invitation
}

// Cancel invitation
const cancelInvitation = async (invitationId: string): Promise<void> => {
  const response = await fetch(`/api/rooms/invitations/${invitationId}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to cancel invitation')
  }
}

/**
 * Main invitations hook
 */
export function useChatInvitations(currentUser?: ChatUser) {
  const queryClient = useQueryClient()

  // Get received invitations (pending by default)
  const useReceivedInvitations = useCallback((status?: invitation_status) => {
    return useQuery({
      queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser?.id || '', 'received', status),
      queryFn: () => fetchInvitations('received', status),
      enabled: !!currentUser,
      staleTime: 0, // Always fresh for real-time
    })
  }, [currentUser?.id])

  // Get sent invitations
  const useSentInvitations = useCallback((status?: invitation_status) => {
    return useQuery({
      queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser?.id || '', 'sent', status),
      queryFn: () => fetchInvitations('sent', status),
      enabled: !!currentUser,
      staleTime: 0,
    })
  }, [currentUser?.id])

  // Send invitation mutation
  const sendInvitationMutation = useMutation({
    mutationFn: sendInvitation,
    onMutate: async (data) => {
      if (!currentUser) return

      // Cancel outgoing queries
      await queryClient.cancelQueries({ 
        queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent') 
      })

      // Optimistic update - add to sent invitations
      const sentKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent', invitation_status.PENDING)
      const previous = queryClient.getQueryData(sentKey)

      const optimisticInvitation: RoomInvitationWithRelations = {
        id: `optimistic_${Date.now()}`,
        room_id: data.room_id,
        invited_by: currentUser.id,
        invited_user: data.invited_user,
        status: invitation_status.PENDING,
        message: data.message,
        created_at: new Date(),
        responded_at: null,
        room: { id: data.room_id, name: 'Loading...', type: 'GROUP' },
        inviter: {
          id: currentUser.id,
          username: currentUser.username,
          full_name: currentUser.full_name,
          user_profile: currentUser.user_profile
        },
        invitee: { id: data.invited_user, username: 'Loading...', full_name: 'Loading...', user_profile: undefined }
      }

      queryClient.setQueryData(sentKey, (old: RoomInvitationWithRelations[] = []) => 
        [optimisticInvitation, ...old]
      )

      return { previous, optimisticInvitation }
    },
    onError: (error, data, context) => {
      if (!currentUser || !context) return

      // Rollback optimistic update
      const sentKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent', invitation_status.PENDING)
      if (context.previous) {
        queryClient.setQueryData(sentKey, context.previous)
      }

      console.error('[ChatInvitations] Send failed:', error)
    },
    onSuccess: (result, data) => {
      if (!currentUser) return

      // Remove optimistic update and add real data
      const sentKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent', invitation_status.PENDING)
      queryClient.setQueryData(sentKey, (old: RoomInvitationWithRelations[] = []) => {
        const filtered = old.filter(inv => !inv.id.startsWith('optimistic_'))
        return [result, ...filtered]
      })

      // Invalidate queries for real-time sync
      queryClient.invalidateQueries({ 
        queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent') 
      })
    }
  })

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => respondToInvitation(invitationId, invitation_status.ACCEPTED),
    onMutate: async (invitationId) => {
      if (!currentUser) return

      // Optimistically update invitation status
      const receivedKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'received', invitation_status.PENDING)
      const previous = queryClient.getQueryData(receivedKey)

      queryClient.setQueryData(receivedKey, (old: RoomInvitationWithRelations[] = []) =>
        old.map(inv => 
          inv.id === invitationId 
            ? { ...inv, status: invitation_status.ACCEPTED, responded_at: new Date() }
            : inv
        )
      )

      return { previous }
    },
    onError: (error, invitationId, context) => {
      if (!currentUser || !context) return

      // Rollback
      const receivedKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'received', invitation_status.PENDING)
      if (context.previous) {
        queryClient.setQueryData(receivedKey, context.previous)
      }

      console.error('[ChatInvitations] Accept failed:', error)
    },
    onSuccess: (result, invitationId) => {
      if (!currentUser) return

      // Invalidate all invitation queries and rooms
      queryClient.invalidateQueries({ 
        queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser.id) 
      })
      queryClient.invalidateQueries({ 
        queryKey: CHAT_QUERY_KEYS.rooms(currentUser.id) 
      })
    }
  })

  // Decline invitation mutation
  const declineInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => respondToInvitation(invitationId, invitation_status.DECLINED),
    onMutate: async (invitationId) => {
      if (!currentUser) return

      const receivedKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'received', invitation_status.PENDING)
      const previous = queryClient.getQueryData(receivedKey)

      queryClient.setQueryData(receivedKey, (old: RoomInvitationWithRelations[] = []) =>
        old.map(inv => 
          inv.id === invitationId 
            ? { ...inv, status: invitation_status.DECLINED, responded_at: new Date() }
            : inv
        )
      )

      return { previous }
    },
    onError: (error, invitationId, context) => {
      if (!currentUser || !context) return

      const receivedKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'received', invitation_status.PENDING)
      if (context.previous) {
        queryClient.setQueryData(receivedKey, context.previous)
      }

      console.error('[ChatInvitations] Decline failed:', error)
    },
    onSuccess: () => {
      if (!currentUser) return

      queryClient.invalidateQueries({ 
        queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser.id) 
      })
    }
  })

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: cancelInvitation,
    onMutate: async (invitationId) => {
      if (!currentUser) return

      const sentKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent', invitation_status.PENDING)
      const previous = queryClient.getQueryData(sentKey)

      queryClient.setQueryData(sentKey, (old: RoomInvitationWithRelations[] = []) =>
        old.filter(inv => inv.id !== invitationId)
      )

      return { previous }
    },
    onError: (error, invitationId, context) => {
      if (!currentUser || !context) return

      const sentKey = INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent', invitation_status.PENDING)
      if (context.previous) {
        queryClient.setQueryData(sentKey, context.previous)
      }

      console.error('[ChatInvitations] Cancel failed:', error)
    },
    onSuccess: () => {
      if (!currentUser) return

      queryClient.invalidateQueries({ 
        queryKey: INVITATIONS_QUERY_KEYS.invitations(currentUser.id, 'sent') 
      })
    }
  })

  return {
    // Query hooks
    useReceivedInvitations,
    useSentInvitations,

    // Mutations
    sendInvitation: sendInvitationMutation.mutateAsync,
    acceptInvitation: acceptInvitationMutation.mutateAsync,
    declineInvitation: declineInvitationMutation.mutateAsync,
    cancelInvitation: cancelInvitationMutation.mutateAsync,

    // Loading states
    isSendingInvitation: sendInvitationMutation.isPending,
    isRespondingToInvitation: acceptInvitationMutation.isPending || declineInvitationMutation.isPending,
    isCancellingInvitation: cancelInvitationMutation.isPending,

    // Errors
    sendError: sendInvitationMutation.error,
    respondError: acceptInvitationMutation.error || declineInvitationMutation.error,
    cancelError: cancelInvitationMutation.error
  }
}

/**
 * Hook for invitation notifications (unread count)
 */
export function useInvitationNotifications(currentUser?: ChatUser) {
  const { useReceivedInvitations } = useChatInvitations(currentUser)
  
  const { data: pendingInvitations = [] } = useReceivedInvitations(invitation_status.PENDING)
  
  return {
    pendingCount: pendingInvitations.length,
    pendingInvitations,
    hasPendingInvitations: pendingInvitations.length > 0
  }
}
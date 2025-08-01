'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CHAT_QUERY_KEYS } from './queryKeys'
import { MessageType, RoomType } from '@/types/chat-app'
import type { MessageWithRelations, ChatUser } from '@/types/chat-app'

/**
 * Instant Message Updates Hook
 * 
 * Provides ultra-fast message display by:
 * - Zero-delay optimistic updates
 * - Immediate UI feedback
 * - Smart conflict resolution with real-time events
 * - Seamless integration with real-time confirmations
 */
export function useInstantMessages(currentUser?: ChatUser) {
  const queryClient = useQueryClient()

  // Add message instantly to UI (zero delay)
  const addInstantMessage = useCallback((
    roomId: string,
    content: string,
    options?: {
      type?: MessageType
      fileUrl?: string
      replyToId?: string
    }
  ) => {
    if (!currentUser) return null

    const now = new Date()
    const tempId = `instant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const instantMessage: MessageWithRelations = {
      id: tempId,
      room_id: roomId,
      sender_id: currentUser.id,
      content: content,
      type: options?.type || MessageType.TEXT,
      file_url: options?.fileUrl,
      reply_to_id: options?.replyToId,
      created_at: now,
      updated_at: now,
      edited_at: undefined,
      sender: {
        id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name,
        user_profile: currentUser.user_profile
      },
      room: {
        id: roomId,
        name: '', // Will be filled by real data
        type: RoomType.GROUP
      }
    }

    // Add to messages immediately (zero delay)
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      // Check for duplicates
      const exists = oldMessages.some(m => m.id === tempId)
      if (exists) return oldMessages

      // Add message and maintain sort order
      const newMessages = [...oldMessages, {
        ...instantMessage,
        // Add metadata for tracking
        _instant: true,
        _pending: true,
        _tempId: tempId
      } as any]

      return newMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })

    // Update room list instantly
    queryClient.setQueriesData(
      { queryKey: CHAT_QUERY_KEYS.rooms(currentUser.id) },
      (oldRooms: any) => {
        if (!oldRooms) return oldRooms
        return oldRooms.map((room: any) => {
          if (room.id === roomId) {
            return {
              ...room,
              lastMessage: {
                content: content,
                sender_name: currentUser.full_name,
                created_at: now
              },
              updated_at: now
            }
          }
          return room
        }).sort((a: any, b: any) => {
          const aTime = new Date(a.updated_at || a.created_at).getTime()
          const bTime = new Date(b.updated_at || b.created_at).getTime()
          return bTime - aTime
        })
      }
    )

    return tempId
  }, [queryClient, currentUser])

  // Confirm instant message with real data
  const confirmInstantMessage = useCallback((
    roomId: string,
    tempId: string,
    realMessage: MessageWithRelations
  ) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      return oldMessages.map(msg => {
        const msgAny = msg as any
        // Find the temporary message and replace with real data
        if (msgAny._tempId === tempId || msg.id === tempId) {
          return {
            ...realMessage,
            // Keep the original timestamp if it's close to prevent flickering
            created_at: Math.abs(new Date(msg.created_at).getTime() - new Date(realMessage.created_at).getTime()) < 2000 
              ? msg.created_at 
              : realMessage.created_at,
            // Remove temporary flags
            _instant: undefined,
            _pending: undefined,
            _tempId: undefined
          }
        }
        return msg
      })
    })
  }, [queryClient])

  // Mark instant message as failed
  const failInstantMessage = useCallback((roomId: string, tempId: string, error: Error) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      return oldMessages.map(msg => {
        const msgAny = msg as any
        if (msgAny._tempId === tempId || msg.id === tempId) {
          return {
            ...msg,
            _instant: true,
            _pending: false,
            _failed: true,
            _error: error.message
          }
        }
        return msg
      })
    })
  }, [queryClient])

  // Remove instant message (for cancelled sends)
  const removeInstantMessage = useCallback((roomId: string, tempId: string) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      return oldMessages.filter(msg => {
        const msgAny = msg as any
        return !(msgAny._tempId === tempId || msg.id === tempId)
      })
    })
  }, [queryClient])

  // Get instant message status
  const getInstantMessageStatus = useCallback((roomId: string, tempId: string) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    const messages = queryClient.getQueryData(roomMessagesKey) as any[] || []
    
    const message = messages.find(msg => 
      msg._tempId === tempId || msg.id === tempId
    )
    
    if (!message) return null
    
    return {
      exists: true,
      pending: message._pending,
      failed: message._failed,
      error: message._error,
      confirmed: !message._instant
    }
  }, [queryClient])

  return {
    addInstantMessage,
    confirmInstantMessage,
    failInstantMessage,
    removeInstantMessage,
    getInstantMessageStatus
  }
}
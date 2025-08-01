'use client'

import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CHAT_QUERY_KEYS } from './queryKeys'
import type { MessageWithRelations, RoomListItem, ChatUser } from '@/types/chat-app'

/**
 * Data Synchronization Hook
 * 
 * Manages smart cache updates that work seamlessly with real-time subscriptions
 * Prevents race conditions and conflicts between optimistic updates and real-time events
 */
export function useDataSynchronization(currentUser?: ChatUser) {
  const queryClient = useQueryClient()
  const pendingUpdatesRef = useRef<Set<string>>(new Set())
  const updateTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Smart message update that prevents conflicts
  const updateMessageCache = useCallback((
    roomId: string,
    message: MessageWithRelations,
    source: 'optimistic' | 'realtime' | 'api' = 'api'
  ) => {
    const updateKey = `message-${message.id}-${roomId}`
    
    // Prevent rapid duplicate updates
    if (pendingUpdatesRef.current.has(updateKey)) {
      return
    }
    
    pendingUpdatesRef.current.add(updateKey)
    
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      const existingIndex = oldMessages.findIndex(m => m.id === message.id)
      
      if (existingIndex >= 0) {
        // Update existing message, preserving optimistic timestamps if close
        const existing = oldMessages[existingIndex]
        const timeDiff = Math.abs(
          new Date(existing.created_at).getTime() - 
          new Date(message.created_at).getTime()
        )
        
        const updated = [...oldMessages]
        updated[existingIndex] = {
          ...message,
          // Keep optimistic timestamp if within 2 seconds to prevent flicker
          created_at: timeDiff < 2000 && source === 'realtime' 
            ? existing.created_at 
            : message.created_at
        }
        return updated
      } else {
        // Add new message in chronological order
        const newMessages = [...oldMessages, message]
        return newMessages.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }
    })
    
    // Clear pending flag after a short delay
    setTimeout(() => {
      pendingUpdatesRef.current.delete(updateKey)
    }, 100)
  }, [queryClient])

  // Smart room list update
  const updateRoomCache = useCallback((
    room: RoomListItem,
    source: 'optimistic' | 'realtime' | 'api' = 'api'
  ) => {
    if (!currentUser?.id) return
    
    const updateKey = `room-${room.id}`
    
    // Prevent rapid duplicate updates
    if (pendingUpdatesRef.current.has(updateKey)) {
      return
    }
    
    pendingUpdatesRef.current.add(updateKey)
    
    const roomsKey = CHAT_QUERY_KEYS.rooms(currentUser.id)
    
    queryClient.setQueryData(roomsKey, (oldRooms: RoomListItem[] = []) => {
      const existingIndex = oldRooms.findIndex(r => r.id === room.id)
      
      if (existingIndex >= 0) {
        // Update existing room
        const existing = oldRooms[existingIndex]
        const updated = [...oldRooms]
        
        updated[existingIndex] = {
          ...room,
          // Preserve optimistic timestamps if source is real-time and times are close
          created_at: source === 'realtime' && existing.created_at && room.created_at &&
            Math.abs(new Date(existing.created_at).getTime() - new Date(room.created_at).getTime()) < 2000
            ? existing.created_at
            : room.created_at,
          updated_at: room.updated_at
        }
        
        // Sort by updated_at (most recent first)
        return updated.sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || new Date()).getTime()
          const bTime = new Date(b.updated_at || b.created_at || new Date()).getTime()
          return bTime - aTime
        })
      } else {
        // Add new room
        const newRooms = [room, ...oldRooms]
        return newRooms.sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at || new Date()).getTime()
          const bTime = new Date(b.updated_at || b.created_at || new Date()).getTime()
          return bTime - aTime
        })
      }
    })
    
    // Clear pending flag
    setTimeout(() => {
      pendingUpdatesRef.current.delete(updateKey)
    }, 100)
  }, [queryClient, currentUser])

  // Remove message from cache (for failed optimistic updates)
  const removeMessageFromCache = useCallback((roomId: string, messageId: string) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      return oldMessages.filter(msg => 
        msg.id !== messageId && 
        (msg as any).optimistic_id !== messageId &&
        (msg as any)._tempId !== messageId
      )
    })
  }, [queryClient])

  // Remove room from cache
  const removeRoomFromCache = useCallback((roomId: string) => {
    if (!currentUser?.id) return
    
    const roomsKey = CHAT_QUERY_KEYS.rooms(currentUser.id)
    
    queryClient.setQueryData(roomsKey, (oldRooms: RoomListItem[] = []) => {
      return oldRooms.filter(room => room.id !== roomId)
    })
    
    // Also remove room messages cache
    queryClient.removeQueries({ queryKey: CHAT_QUERY_KEYS.roomMessages(roomId) })
  }, [queryClient, currentUser])

  // Batch update for multiple messages (efficient for real-time)
  const batchUpdateMessages = useCallback((
    roomId: string,
    messages: MessageWithRelations[],
    source: 'realtime' | 'api' = 'realtime'
  ) => {
    if (!messages.length) return
    
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      const messageMap = new Map(messages.map(msg => [msg.id, msg]))
      
      // Update existing messages and collect new ones
      const updated = oldMessages.map(existing => {
        const newMessage = messageMap.get(existing.id)
        if (newMessage) {
          messageMap.delete(existing.id) // Remove from map to track processed messages
          
          // Preserve optimistic timestamps if close
          const timeDiff = Math.abs(
            new Date(existing.created_at).getTime() - 
            new Date(newMessage.created_at).getTime()
          )
          
          return {
            ...newMessage,
            created_at: timeDiff < 2000 && source === 'realtime'
              ? existing.created_at
              : newMessage.created_at
          }
        }
        return existing
      })
      
      // Add any remaining new messages
      const newMessages = Array.from(messageMap.values())
      const all = [...updated, ...newMessages]
      
      // Sort chronologically
      return all.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })
  }, [queryClient])

  // Smart invalidation that respects real-time updates
  const smartInvalidate = useCallback((
    queryKey: any[],
    condition?: () => boolean,
    delay = 0
  ) => {
    const invalidate = () => {
      if (condition && !condition()) {
        return // Skip invalidation if condition fails
      }
      
      queryClient.invalidateQueries({ queryKey })
    }
    
    if (delay > 0) {
      setTimeout(invalidate, delay)
    } else {
      invalidate()
    }
  }, [queryClient])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all pending updates
    pendingUpdatesRef.current.clear()
    
    // Clear all timers
    updateTimersRef.current.forEach(timer => clearTimeout(timer))
    updateTimersRef.current.clear()
  }, [])

  return {
    // Cache update methods
    updateMessageCache,
    updateRoomCache,
    removeMessageFromCache,
    removeRoomFromCache,
    batchUpdateMessages,
    
    // Smart invalidation
    smartInvalidate,
    
    // Utilities
    cleanup,
    
    // Status
    hasPendingUpdates: () => pendingUpdatesRef.current.size > 0
  }
}
'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CHAT_QUERY_KEYS } from './queryKeys'
import { useChatRealtime } from './useChatRealtime'
import { useInstantMessages } from './useInstantMessages'
import { useDataSynchronization } from './useDataSynchronization'
import type { MessageWithRelations, SendMessageData, ChatUser } from '@/types/chat-app'
import { MessageType, RoomType } from '@/types/chat-app'

interface OptimisticMessage extends MessageWithRelations {
  optimistic_id: string
  pending: boolean
  failed: boolean
  sent: boolean
  retry_count: number
}

interface SendMessageOptions {
  roomId: string
  content: string
  type?: MessageType
  fileUrl?: string
  replyToId?: string
}

/**
 * Chat Messages Hook with Optimistic Updates
 * 
 * Provides enhanced message sending with:
 * - Optimistic UI updates for instant feedback
 * - Automatic retry logic for failed sends
 * - Message delivery confirmation
 * - Proper error handling and user feedback
 */
export function useChatMessages(currentUser?: ChatUser) {
  const queryClient = useQueryClient()
  const { updateMessageOptimistically, markMessageFailed } = useChatRealtime(currentUser?.id)
  const instantMessages = useInstantMessages(currentUser)
  const dataSync = useDataSynchronization(currentUser)
  
  const [pendingMessages, setPendingMessages] = useState<Record<string, OptimisticMessage>>({})
  const retryTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  
  const MAX_RETRY_ATTEMPTS = 3
  const RETRY_DELAYS = [500, 1500, 3000] // Faster retries: 0.5s, 1.5s, 3s

  // Generate optimistic message
  const createOptimisticMessage = useCallback((
    options: SendMessageOptions,
    optimisticId: string
  ): OptimisticMessage => {
    // Use Date object for timestamps
    const now = new Date()
    
    return {
      id: optimisticId,
      optimistic_id: optimisticId,
      room_id: options.roomId,
      sender_id: currentUser?.id || '',
      content: options.content,
      type: (options.type as MessageType) || MessageType.TEXT,
      file_url: options.fileUrl,
      reply_to_id: options.replyToId,
      created_at: now,
      updated_at: now,
      edited_at: undefined,
      sender: {
        id: currentUser?.id || '',
        username: currentUser?.username || '',
        full_name: currentUser?.full_name || '',
        user_profile: currentUser?.user_profile
      },
      room: {
        id: options.roomId,
        name: '', // Will be filled by real data
        type: RoomType.GROUP // Default
      },
      pending: true,
      failed: false,
      sent: false,
      retry_count: 0
    }
  }, [currentUser])

  // Add optimistic message to UI immediately with room list update
  const addOptimisticMessage = useCallback((message: OptimisticMessage) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(message.room_id)
    
    // Add to query cache for immediate UI update
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      // Check if message already exists (avoid duplicates)
      const existingIndex = oldMessages.findIndex(m => 
        m.id === message.optimistic_id || 
        (m as any).optimistic_id === message.optimistic_id
      )
      
      if (existingIndex >= 0) {
        return oldMessages // Already exists
      }
      
      // Sort messages by created_at to maintain order
      const newMessages = [...oldMessages, message]
      return newMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    })
    
    // Immediately update room list with optimistic last message
    queryClient.setQueriesData(
      { queryKey: CHAT_QUERY_KEYS.rooms(currentUser?.id || '') },
      (oldRooms: any) => {
        if (!oldRooms) return oldRooms
        return oldRooms.map((room: any) => {
          if (room.id === message.room_id) {
            return {
              ...room,
              lastMessage: {
                content: message.content,
                sender_name: message.sender.full_name,
                created_at: message.created_at
              },
              updated_at: message.created_at
            }
          }
          return room
        })
      }
    )
    
    // Track in pending messages
    setPendingMessages(prev => ({
      ...prev,
      [message.optimistic_id]: message
    }))
  }, [queryClient, currentUser])

  // Update message status
  const updateMessageStatus = useCallback((
    optimisticId: string, 
    updates: Partial<OptimisticMessage>
  ) => {
    setPendingMessages(prev => {
      const message = prev[optimisticId]
      if (!message) return prev
      
      const updated = { ...message, ...updates }
      
      // Update in query cache
      const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(message.room_id)
      queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
        return oldMessages.map(msg => 
          (msg as any).optimistic_id === optimisticId || msg.id === optimisticId
            ? updated
            : msg
        )
      })
      
      return {
        ...prev,
        [optimisticId]: updated
      }
    })
  }, [queryClient])

  // Remove optimistic message (when confirmed with real message)
  const removeOptimisticMessage = useCallback((optimisticId: string) => {
    setPendingMessages(prev => {
      const { [optimisticId]: removed, ...rest } = prev
      return rest
    })
    
    // Clear any retry timeout
    if (retryTimeoutsRef.current[optimisticId]) {
      clearTimeout(retryTimeoutsRef.current[optimisticId])
      delete retryTimeoutsRef.current[optimisticId]
    }
  }, [])

  // Retry failed message
  const retryMessage = useCallback(async (optimisticId: string) => {
    const message = pendingMessages[optimisticId]
    if (!message || message.retry_count >= MAX_RETRY_ATTEMPTS) return
    
    console.log(`🔄 Retrying message ${optimisticId} (attempt ${message.retry_count + 1})`)
    
    // Update status to pending
    updateMessageStatus(optimisticId, {
      pending: true,
      failed: false,
      retry_count: message.retry_count + 1
    })
    
    // Retry the send
    return sendMessageMutation.mutateAsync({
      roomId: message.room_id,
      content: message.content,
      type: message.type,
      fileUrl: message.file_url,
      replyToId: message.reply_to_id,
      optimisticId
    })
  }, [pendingMessages, updateMessageStatus])

  // Schedule retry with exponential backoff
  const scheduleRetry = useCallback((optimisticId: string, retryCount: number) => {
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      console.warn(`❌ Max retry attempts reached for message ${optimisticId}`)
      return
    }
    
    const delay = RETRY_DELAYS[Math.min(retryCount, RETRY_DELAYS.length - 1)]
    
    retryTimeoutsRef.current[optimisticId] = setTimeout(() => {
      retryMessage(optimisticId)
    }, delay)
  }, [retryMessage])

  // Send message mutation with optimistic updates
  const sendMessageMutation = useMutation({
    mutationFn: async (data: SendMessageOptions & { optimisticId?: string; instantId?: string }) => {
      const response = await fetch('/api/messages/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: data.roomId,
          content: data.content,
          senderId: currentUser?.id,
          type: data.type || 'TEXT',
          fileUrl: data.fileUrl,
          replyToId: data.replyToId
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to send message')
      }
      
      return { ...await response.json(), optimisticId: data.optimisticId, instantId: data.instantId }
    },
    onSuccess: (result, variables) => {
      const { optimisticId } = variables
      
      if (optimisticId) {
        // Use data synchronization for conflict-free updates
        dataSync.updateMessageCache(variables.roomId, {
          ...result.message,
          pending: false,
          sent: true,
          failed: false
        }, 'api')
        
        // Clean up optimistic message
        removeOptimisticMessage(optimisticId)
      }
      
      // Update room list with last message using data sync
      if (currentUser && result.message) {
        const roomUpdate: Partial<any> = {
          id: variables.roomId,
          lastMessage: {
            id: result.message.id,
            content: result.message.content,
            type: result.message.type,
            sender_name: result.message.sender?.full_name || currentUser.full_name,
            created_at: result.message.created_at
          },
          updated_at: result.message.created_at
        }
        
        // Update room cache smartly
        queryClient.setQueryData(CHAT_QUERY_KEYS.rooms(currentUser.id), (oldRooms: any[] = []) => {
          return oldRooms.map(room => 
            room.id === variables.roomId 
              ? { ...room, ...roomUpdate }
              : room
          ).sort((a, b) => {
            const aTime = new Date(a.updated_at || a.created_at).getTime()
            const bTime = new Date(b.updated_at || b.created_at).getTime()
            return bTime - aTime
          })
        })
      }
    },
    onError: (error, variables) => {
      const { optimisticId } = variables
      
      if (optimisticId) {
        const message = pendingMessages[optimisticId]
        if (message) {
          // Mark as failed
          updateMessageStatus(optimisticId, {
            pending: false,
            failed: true
          })
          
          // Schedule retry
          scheduleRetry(optimisticId, message.retry_count)
        }
      }
      
      console.error('[ChatMessages] Send failed:', error)
    }
  })

  // Enhanced send message function with instant display
  const sendMessage = useCallback(async (options: SendMessageOptions) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }
    
    // Add message instantly to UI (zero delay)
    const instantId = instantMessages.addInstantMessage(
      options.roomId,
      options.content,
      {
        type: options.type,
        fileUrl: options.fileUrl,
        replyToId: options.replyToId
      }
    )
    
    if (!instantId) {
      throw new Error('Failed to create instant message')
    }
    
    // Generate optimistic ID for tracking
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Send actual message
    try {
      const result = await sendMessageMutation.mutateAsync({
        ...options,
        optimisticId,
        instantId // Pass instant ID to link with real message
      })
      
      // Confirm instant message with real data
      if (result?.message) {
        instantMessages.confirmInstantMessage(
          options.roomId,
          instantId,
          result.message
        )
      }
      
      return result
    } catch (error) {
      // Mark instant message as failed
      instantMessages.failInstantMessage(options.roomId, instantId, error as Error)
      throw error
    }
  }, [currentUser, instantMessages, sendMessageMutation])

  // Manual retry function for UI
  const manualRetry = useCallback(async (optimisticId: string) => {
    return retryMessage(optimisticId)
  }, [retryMessage])

  // Cancel message (remove from UI)
  const cancelMessage = useCallback((optimisticId: string) => {
    const message = pendingMessages[optimisticId]
    if (!message) return
    
    // Use data synchronization for clean removal
    dataSync.removeMessageFromCache(message.room_id, optimisticId)
    
    // Clean up
    removeOptimisticMessage(optimisticId)
  }, [pendingMessages, dataSync, removeOptimisticMessage])

  // Get pending messages for a room
  const getPendingMessages = useCallback((roomId: string): OptimisticMessage[] => {
    return Object.values(pendingMessages).filter(msg => msg.room_id === roomId)
  }, [pendingMessages])

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear all retry timeouts
    Object.values(retryTimeoutsRef.current).forEach(timeout => {
      clearTimeout(timeout)
    })
    retryTimeoutsRef.current = {}
    
    // Clear pending messages
    setPendingMessages({})
    
    // Cleanup data synchronization
    dataSync.cleanup()
  }, [dataSync])

  return {
    // Actions
    sendMessage,
    manualRetry,
    cancelMessage,
    
    // State
    pendingMessages,
    getPendingMessages,
    
    // Status
    isSending: sendMessageMutation.isPending,
    sendError: sendMessageMutation.error,
    
    // Stats
    pendingCount: Object.keys(pendingMessages).length,
    failedCount: Object.values(pendingMessages).filter(m => m.failed).length,
    
    // Utilities
    cleanup
  }
}

/**
 * Simplified hook for sending messages in a specific room
 */
export function useRoomMessages(roomId?: string, currentUser?: ChatUser) {
  const { 
    sendMessage, 
    getPendingMessages, 
    manualRetry, 
    cancelMessage,
    isSending,
    sendError
  } = useChatMessages(currentUser)
  
  const sendToRoom = useCallback(async (content: string, options?: Partial<SendMessageOptions>) => {
    if (!roomId) throw new Error('Room ID required')
    
    return sendMessage({
      roomId,
      content,
      ...options
    })
  }, [roomId, sendMessage])
  
  return {
    sendMessage: sendToRoom,
    pendingMessages: roomId ? getPendingMessages(roomId) : [],
    manualRetry,
    cancelMessage,
    isSending,
    sendError
  }
}
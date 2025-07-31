'use client'

import { useState, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CHAT_QUERY_KEYS } from './queryKeys'
import { useChatRealtime } from './useChatRealtime'
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
  type?: 'TEXT' | 'IMAGE' | 'FILE'
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
  
  const [pendingMessages, setPendingMessages] = useState<Record<string, OptimisticMessage>>({})
  const retryTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  
  const MAX_RETRY_ATTEMPTS = 3
  const RETRY_DELAYS = [1000, 3000, 5000] // 1s, 3s, 5s

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

  // Add optimistic message to UI immediately
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
      
      return [...oldMessages, message]
    })
    
    // Track in pending messages
    setPendingMessages(prev => ({
      ...prev,
      [message.optimistic_id]: message
    }))
  }, [queryClient])

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
      type: message.type as 'TEXT' | 'IMAGE' | 'FILE',
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
    mutationFn: async (data: SendMessageOptions & { optimisticId?: string }) => {
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
      
      return { ...await response.json(), optimisticId: data.optimisticId }
    },
    onSuccess: (result, variables) => {
      const { optimisticId } = variables
      
      if (optimisticId) {
        // Replace optimistic message with real message
        const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(variables.roomId)
        
        queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
          return oldMessages.map(msg => {
            if ((msg as any).optimistic_id === optimisticId || msg.id === optimisticId) {
              // Replace with real message data
              return {
                ...result.message,
                pending: false,
                sent: true,
                failed: false
              }
            }
            return msg
          })
        })
        
        // Clean up optimistic message
        removeOptimisticMessage(optimisticId)
      }
      
      // Invalidate queries for real-time sync
      queryClient.invalidateQueries({ 
        queryKey: CHAT_QUERY_KEYS.roomMessages(variables.roomId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: CHAT_QUERY_KEYS.rooms(currentUser?.id || '') 
      })
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

  // Main send message function
  const sendMessage = useCallback(async (options: SendMessageOptions) => {
    if (!currentUser) {
      throw new Error('User not authenticated')
    }
    
    // Generate optimistic ID
    const optimisticId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create and add optimistic message
    const optimisticMessage = createOptimisticMessage(options, optimisticId)
    addOptimisticMessage(optimisticMessage)
    
    // Send actual message
    try {
      await sendMessageMutation.mutateAsync({
        ...options,
        optimisticId
      })
    } catch (error) {
      // Error is handled in onError callback
      throw error
    }
  }, [currentUser, createOptimisticMessage, addOptimisticMessage, sendMessageMutation])

  // Manual retry function for UI
  const manualRetry = useCallback(async (optimisticId: string) => {
    return retryMessage(optimisticId)
  }, [retryMessage])

  // Cancel message (remove from UI)
  const cancelMessage = useCallback((optimisticId: string) => {
    const message = pendingMessages[optimisticId]
    if (!message) return
    
    // Remove from query cache
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(message.room_id)
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      return oldMessages.filter(msg => 
        (msg as any).optimistic_id !== optimisticId && msg.id !== optimisticId
      )
    })
    
    // Clean up
    removeOptimisticMessage(optimisticId)
  }, [pendingMessages, queryClient, removeOptimisticMessage])

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
  }, [])

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
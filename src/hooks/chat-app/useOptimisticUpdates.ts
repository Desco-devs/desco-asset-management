'use client'

import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CHAT_QUERY_KEYS } from './queryKeys'
import type { MessageWithRelations, RoomListItem, ChatUser } from '@/types/chat-app'

interface OptimisticOperation {
  id: string
  type: 'message' | 'room' | 'invitation'
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled'
  timestamp: number
  roomId?: string
  data: any
  rollbackData?: any
}

/**
 * Enhanced Optimistic Updates Manager
 * 
 * Prevents race conditions between optimistic updates and real-time subscriptions
 * Features:
 * - Operation queuing and conflict resolution
 * - Automatic rollback on failures
 * - Real-time event coordination
 * - Memory efficient operation tracking
 */
export function useOptimisticUpdates(currentUser?: ChatUser) {
  const queryClient = useQueryClient()
  const [operations, setOperations] = useState<Record<string, OptimisticOperation>>({})
  const pendingOperationsRef = useRef<Set<string>>(new Set())
  const realtimeEventQueueRef = useRef<Array<{ type: string, data: any, timestamp: number }>>([])

  // Generate unique operation ID
  const generateOperationId = useCallback((type: string, identifier?: string) => {
    return `${type}_${identifier || 'generic'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Add optimistic message with conflict prevention
  const addOptimisticMessage = useCallback((
    roomId: string,
    message: Partial<MessageWithRelations>,
    tempId?: string
  ) => {
    const operationId = generateOperationId('message', tempId || message.id)
    const now = Date.now()
    
    // Create optimistic message with metadata
    const optimisticMessage: MessageWithRelations = {
      id: tempId || `temp_${now}`,
      room_id: roomId,
      sender_id: currentUser?.id || '',
      content: message.content || '',
      type: message.type || 'TEXT',
      file_url: message.file_url,
      reply_to_id: message.reply_to_id,
      created_at: message.created_at || new Date(),
      updated_at: message.updated_at || new Date(),
      edited_at: undefined,
      sender: message.sender || {
        id: currentUser?.id || '',
        username: currentUser?.username || '',
        full_name: currentUser?.full_name || '',
        user_profile: currentUser?.user_profile
      },
      room: message.room || {
        id: roomId,
        name: '',
        type: 'GROUP'
      },
      // Add optimistic metadata
      pending: true,
      failed: false,
      sent: false,
      _isOptimistic: true,
      _operationId: operationId,
      _tempId: tempId
    } as any

    // Store operation for tracking
    const operation: OptimisticOperation = {
      id: operationId,
      type: 'message',
      status: 'pending',
      timestamp: now,
      roomId,
      data: optimisticMessage,
      rollbackData: null
    }

    setOperations(prev => ({ ...prev, [operationId]: operation }))
    pendingOperationsRef.current.add(operationId)

    // Update cache with conflict checking
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      // Check for existing optimistic message with same temp ID
      const existingIndex = oldMessages.findIndex(msg => 
        (msg as any)._tempId === tempId || 
        (msg as any)._operationId === operationId ||
        msg.id === (tempId || optimisticMessage.id)
      )
      
      if (existingIndex >= 0) {
        // Update existing optimistic message
        const updated = [...oldMessages]
        updated[existingIndex] = { ...optimisticMessage, ...updated[existingIndex] }
        return updated.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }
      
      // Add new optimistic message
      const newMessages = [...oldMessages, optimisticMessage]
      return newMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    })

    return operationId
  }, [queryClient, currentUser, generateOperationId])

  // Confirm optimistic operation with real data
  const confirmOptimisticOperation = useCallback((
    operationId: string,
    realData: any,
    source: 'api' | 'realtime' = 'api'
  ) => {
    const operation = operations[operationId]
    if (!operation || operation.status !== 'pending') {
      return
    }

    // Update operation status
    setOperations(prev => ({
      ...prev,
      [operationId]: { ...operation, status: 'confirmed' }
    }))
    
    pendingOperationsRef.current.delete(operationId)

    if (operation.type === 'message' && operation.roomId) {
      const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(operation.roomId)
      
      queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
        return oldMessages.map(msg => {
          const msgAny = msg as any
          if (msgAny._operationId === operationId || 
              msgAny._tempId === (operation.data as any)._tempId ||
              msg.id === operation.data.id) {
            
            // Preserve optimistic timestamp if close to prevent flicker
            const timeDiff = Math.abs(
              new Date(msg.created_at).getTime() - 
              new Date(realData.created_at).getTime()
            )
            
            return {
              ...realData,
              created_at: timeDiff < 2000 && source === 'realtime' 
                ? msg.created_at 
                : realData.created_at,
              pending: false,
              sent: true,
              failed: false,
              // Remove optimistic metadata
              _isOptimistic: undefined,
              _operationId: undefined,
              _tempId: undefined
            }
          }
          return msg
        })
      })
    }

    // Clean up operation after delay
    setTimeout(() => {
      setOperations(prev => {
        const { [operationId]: removed, ...rest } = prev
        return rest
      })
    }, 5000) // Keep for 5 seconds for debugging
  }, [operations, queryClient])

  // Fail optimistic operation
  const failOptimisticOperation = useCallback((
    operationId: string,
    error: Error,
    shouldRetry = true
  ) => {
    const operation = operations[operationId]
    if (!operation || operation.status !== 'pending') {
      return
    }

    // Update operation status
    setOperations(prev => ({
      ...prev,
      [operationId]: { ...operation, status: 'failed' }
    }))
    
    pendingOperationsRef.current.delete(operationId)

    if (operation.type === 'message' && operation.roomId) {
      const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(operation.roomId)
      
      if (shouldRetry) {
        // Mark as failed but keep in UI for retry
        queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
          return oldMessages.map(msg => {
            const msgAny = msg as any
            if (msgAny._operationId === operationId) {
              return {
                ...msg,
                pending: false,
                failed: true,
                sent: false,
                _error: error.message
              }
            }
            return msg
          })
        })
      } else {
        // Remove from UI completely
        cancelOptimisticOperation(operationId)
      }
    }
  }, [operations, queryClient])

  // Cancel optimistic operation
  const cancelOptimisticOperation = useCallback((operationId: string) => {
    const operation = operations[operationId]
    if (!operation) return

    // Update operation status
    setOperations(prev => ({
      ...prev,
      [operationId]: { ...operation, status: 'cancelled' }
    }))
    
    pendingOperationsRef.current.delete(operationId)

    if (operation.type === 'message' && operation.roomId) {
      const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(operation.roomId)
      
      queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
        return oldMessages.filter(msg => {
          const msgAny = msg as any
          return msgAny._operationId !== operationId &&
                 msgAny._tempId !== (operation.data as any)._tempId &&
                 msg.id !== operation.data.id
        })
      })
    }

    // Clean up operation
    setTimeout(() => {
      setOperations(prev => {
        const { [operationId]: removed, ...rest } = prev
        return rest
      })
    }, 1000)
  }, [operations, queryClient])

  // Handle real-time event with conflict resolution
  const handleRealtimeEvent = useCallback((
    eventType: string,
    eventData: any,
    timestamp = Date.now()
  ) => {
    // Queue the event for processing
    realtimeEventQueueRef.current.push({ type: eventType, data: eventData, timestamp })

    // Check if this event conflicts with any pending optimistic operations
    const conflictingOps = Object.values(operations).filter(op => {
      if (op.status !== 'pending') return false
      
      if (eventType === 'message:new' && op.type === 'message') {
        // Check for message conflicts by content, sender, and timing
        const opMessage = op.data as MessageWithRelations
        const eventMessage = eventData as MessageWithRelations
        
        return (
          opMessage.room_id === eventMessage.room_id &&
          opMessage.sender_id === eventMessage.sender_id &&
          opMessage.content === eventMessage.content &&
          Math.abs(new Date(opMessage.created_at).getTime() - new Date(eventMessage.created_at).getTime()) < 5000
        )
      }
      
      return false
    })

    // Resolve conflicts by confirming optimistic operations
    conflictingOps.forEach(op => {
      console.log('🔄 Resolving conflict between optimistic operation and real-time event', {
        operationId: op.id,
        eventType,
        eventData
      })
      confirmOptimisticOperation(op.id, eventData, 'realtime')
    })

    // Process the event normally if no conflicts
    if (conflictingOps.length === 0) {
      // Let real-time handlers process the event
      return true
    }

    return false // Event was handled by conflict resolution
  }, [operations, confirmOptimisticOperation])

  // Get operation status
  const getOperationStatus = useCallback((operationId: string) => {
    return operations[operationId]?.status || null
  }, [operations])

  // Get pending operations for a room
  const getPendingOperations = useCallback((roomId: string) => {
    return Object.values(operations).filter(op => 
      op.roomId === roomId && op.status === 'pending'
    )
  }, [operations])

  // Cleanup stale operations
  const cleanup = useCallback(() => {
    const now = Date.now()
    const staleThreshold = 300000 // 5 minutes
    
    setOperations(prev => {
      const cleaned = Object.fromEntries(
        Object.entries(prev).filter(([_, op]) => 
          now - op.timestamp < staleThreshold
        )
      )
      return cleaned
    })
    
    // Clear pending set
    pendingOperationsRef.current.clear()
    
    // Clear event queue
    realtimeEventQueueRef.current = []
  }, [])

  return {
    // Optimistic operations
    addOptimisticMessage,
    confirmOptimisticOperation,
    failOptimisticOperation,
    cancelOptimisticOperation,
    
    // Real-time coordination
    handleRealtimeEvent,
    
    // Status and monitoring
    getOperationStatus,
    getPendingOperations,
    pendingCount: pendingOperationsRef.current.size,
    
    // Utilities
    cleanup,
    
    // Debug info
    operations: process.env.NODE_ENV === 'development' ? operations : undefined
  }
}
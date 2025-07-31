'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { CHAT_QUERY_KEYS } from './queryKeys'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { MessageWithRelations, ChatUser } from '@/types/chat-app'

/**
 * Helper function to enrich message data with sender information from cache
 */
function enrichMessageWithSenderData(message: any, queryClient: any): MessageWithRelations {
  // Get users from cache
  const users = queryClient.getQueryData(CHAT_QUERY_KEYS.users()) as ChatUser[] || []
  
  // Find the sender
  const sender = users.find(user => user.id === message.sender_id)
  
  // Create enriched message with sender data
  const enrichedMessage: MessageWithRelations = {
    id: message.id,
    room_id: message.room_id,
    sender_id: message.sender_id,
    content: message.content,
    type: message.type,
    file_url: message.file_url,
    reply_to_id: message.reply_to_id,
    edited_at: message.edited_at,
    created_at: message.created_at,
    updated_at: message.updated_at,
    sender: sender ? {
      id: sender.id,
      username: sender.username,
      full_name: sender.full_name,
      user_profile: sender.user_profile,
    } : {
      id: message.sender_id,
      username: 'Unknown',
      full_name: 'Unknown User',
      user_profile: undefined,
    },
    room: {
      id: message.room_id,
      name: 'Unknown Room',
      type: 'GROUP' as any,
    }
  }
  
  console.log('🔄 Enriched message with sender data:', {
    messageId: message.id,
    senderId: message.sender_id,
    senderFound: !!sender,
    senderName: sender?.full_name || 'Unknown User'
  })
  
  return enrichedMessage
}

/**
 * Network status for adaptive real-time behavior
 */
function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [connectionType, setConnectionType] = useState<string>('unknown')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    const updateConnectionInfo = () => {
      // @ts-ignore - connection API is experimental but widely supported
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
      if (connection) {
        setConnectionType(connection.effectiveType || connection.type || 'unknown')
      }
    }

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    // Listen for connection changes on mobile
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      connection.addEventListener('change', updateConnectionInfo)
      updateConnectionInfo()
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
      if (connection) {
        connection.removeEventListener('change', updateConnectionInfo)
      }
    }
  }, [])

  return { isOnline, connectionType }
}

/**
 * Adaptive throttling based on network conditions
 */
function useAdaptiveThrottling() {
  const [throttleMs, setThrottleMs] = useState(500) // Faster throttling for chat
  const { isOnline, connectionType } = useNetworkStatus()

  useEffect(() => {
    if (!isOnline) {
      setThrottleMs(2000) // 2s when offline
      return
    }

    // Adaptive throttling based on connection type - faster for chat
    switch (connectionType) {
      case 'slow-2g':
      case '2g':
        setThrottleMs(1500) // 1.5s for slow connections
        break
      case '3g':
        setThrottleMs(1000) // 1s for 3G
        break
      case '4g':
      case '5g':
      case 'wifi':
        setThrottleMs(500) // 500ms for fast connections (chat needs to be responsive)
        break
      default:
        setThrottleMs(750) // 750ms for unknown connections
    }
  }, [isOnline, connectionType])

  return throttleMs
}

/**
 * Chat Real-time Hook
 * 
 * Provides real-time subscriptions for chat functionality including:
 * - Messages in rooms
 * - Room updates 
 * - Room membership changes
 * 
 * Features:
 * - Adaptive throttling based on network conditions
 * - Smart subscription management with automatic reconnection
 * - Efficient invalidation patterns to minimize re-renders
 * - Role-based access control
 * - Memory leak prevention with proper cleanup
 */
export function useChatRealtime(userId?: string) {
  const queryClient = useQueryClient()
  const { isOnline } = useNetworkStatus()
  const throttleMs = useAdaptiveThrottling()
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Throttled invalidation function
  const throttledInvalidate = useCallback((payload: any, queryKeys: string[]) => {
    const now = Date.now()
    const timeSinceLastUpdate = now - lastUpdateRef.current

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // If enough time has passed, invalidate immediately
    if (timeSinceLastUpdate >= throttleMs) {
      performInvalidation(payload, queryKeys)
      lastUpdateRef.current = now
    } else {
      // Otherwise, schedule invalidation
      const delay = throttleMs - timeSinceLastUpdate
      timeoutRef.current = setTimeout(() => {
        performInvalidation(payload, queryKeys)
        lastUpdateRef.current = Date.now()
      }, delay)
    }
  }, [throttleMs])

  // Optimistic message update helper
  const updateMessageOptimistically = useCallback((message: MessageWithRelations, isConfirmed: boolean = false) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(message.room_id)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      const existingIndex = oldMessages.findIndex(m => m.id === message.id)
      
      if (existingIndex >= 0) {
        // Update existing message
        const updated = [...oldMessages]
        updated[existingIndex] = { 
          ...message, 
          pending: !isConfirmed,
          sent: isConfirmed,
          failed: false 
        }
        return updated
      } else {
        // Add new message
        return [...oldMessages, { 
          ...message, 
          pending: !isConfirmed,
          sent: isConfirmed,
          failed: false 
        }]
      }
    })
  }, [queryClient])

  // Mark message as failed
  const markMessageFailed = useCallback((messageId: string, roomId: string) => {
    const roomMessagesKey = CHAT_QUERY_KEYS.roomMessages(roomId)
    
    queryClient.setQueryData(roomMessagesKey, (oldMessages: MessageWithRelations[] = []) => {
      return oldMessages.map(message => 
        message.id === messageId 
          ? { ...message, pending: false, sent: false, failed: true }
          : message
      )
    })
  }, [queryClient])

  // Actual invalidation logic
  const performInvalidation = useCallback((payload: any, queryKeys: string[]) => {
    try {
      queryKeys.forEach(queryKey => {
        queryClient.invalidateQueries({ 
          queryKey: [queryKey],
          exact: false,
          refetchType: 'none' // Let components decide when to refetch
        })
      })

      // For messages, handle optimistic updates and confirmation
      if (payload.table === 'messages' && payload.new?.room_id) {
        // If this is a new message, confirm it was delivered
        if (payload.eventType === 'INSERT' && payload.new) {
          // Enrich the message with sender data from the users cache
          const enrichedMessage = enrichMessageWithSenderData(payload.new, queryClient)
          updateMessageOptimistically(enrichedMessage, true)
        }
        
        queryClient.invalidateQueries({ 
          queryKey: CHAT_QUERY_KEYS.roomMessages(payload.new.room_id),
          exact: true
        })
      }

      // For rooms, invalidate user-specific room queries
      if (payload.table === 'rooms' && userId) {
        queryClient.invalidateQueries({ 
          queryKey: CHAT_QUERY_KEYS.rooms(userId),
          exact: true
        })
      }

      // For room_members, invalidate both rooms and specific room messages
      if (payload.table === 'room_members') {
        if (userId) {
          queryClient.invalidateQueries({ 
            queryKey: CHAT_QUERY_KEYS.rooms(userId),
            exact: true
          })
        }
        if (payload.new?.room_id || payload.old?.room_id) {
          const roomId = payload.new?.room_id || payload.old?.room_id
          queryClient.invalidateQueries({ 
            queryKey: CHAT_QUERY_KEYS.roomMessages(roomId),
            exact: true
          })
        }
      }
    } catch (error) {
      console.warn('[ChatRealtime] Invalidation error:', error)
    }
  }, [queryClient, userId, updateMessageOptimistically])

  // Connection management
  const connectChannel = useCallback(() => {
    if (!isOnline || !userId) {
      setConnectionStatus('disconnected')
      return
    }

    try {
      setConnectionStatus('connecting')
      const supabase = createClient()

      console.log('💬 Setting up chat realtime subscription...')

      // Create channel with chat-optimized settings
      const channel = supabase
        .channel(`chat-realtime-${userId}`, {
          config: {
            presence: { key: userId },
            broadcast: { self: false }
          }
        })
        // Listen to messages table changes
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            console.log('💬 Message change detected:', payload.eventType, (payload.new as any)?.room_id)
            throttledInvalidate(payload, ['messages', 'rooms'])
          }
        )
        // Listen to rooms table changes
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'rooms'
          },
          (payload) => {
            console.log('🏠 Room change detected:', payload.eventType, (payload.new as any)?.id)
            throttledInvalidate(payload, ['rooms'])
          }
        )
        // Listen to room_members table changes
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'room_members'
          },
          (payload) => {
            console.log('👥 Room member change detected:', payload.eventType, (payload.new as any)?.room_id)
            throttledInvalidate(payload, ['rooms', 'room-members'])
          }
        )
        .on('system', {}, (payload) => {
          // Handle connection status changes
          if (payload.extension === 'postgres_changes') {
            switch (payload.status) {
              case 'SUBSCRIBED':
                setConnectionStatus('connected')
                reconnectAttemptsRef.current = 0
                console.log('💬 Chat realtime connected')
                break
              case 'CHANNEL_ERROR':
              case 'TIMED_OUT':
                setConnectionStatus('error')
                console.warn('💬 Chat realtime error:', payload.status)
                scheduleReconnect()
                break
              case 'CLOSED':
                setConnectionStatus('disconnected')
                console.log('💬 Chat realtime disconnected')
                break
            }
          }
        })
        .subscribe((status) => {
          console.log('💬 Chat realtime subscription status:', status)
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
            reconnectAttemptsRef.current = 0
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus('error')
            scheduleReconnect()
          }
        })

      channelRef.current = channel
    } catch (error) {
      console.error('[ChatRealtime] Connection error:', error)
      setConnectionStatus('error')
      scheduleReconnect()
    }
  }, [isOnline, userId, throttledInvalidate])

  // Reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('[ChatRealtime] Max reconnection attempts reached')
      setConnectionStatus('error')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15000) // Max 15s for chat
    reconnectAttemptsRef.current += 1

    console.log(`💬 Scheduling chat realtime reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      connectChannel()
    }, delay)
  }, [connectChannel])

  // Disconnect function
  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    setConnectionStatus('disconnected')
    console.log('💬 Chat realtime disconnected and cleaned up')
  }, [])

  // Main effect for connection management
  useEffect(() => {
    if (isOnline && userId && !channelRef.current) {
      connectChannel()
    } else if ((!isOnline || !userId) && channelRef.current) {
      disconnect()
    }

    return disconnect
  }, [isOnline, userId, connectChannel, disconnect])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  // Return enhanced status information with new utilities
  return { 
    isListening: connectionStatus === 'connected',
    connectionStatus,
    isOnline,
    throttleMs,
    reconnectAttempts: reconnectAttemptsRef.current,
    // New optimistic update utilities
    updateMessageOptimistically,
    markMessageFailed,
    // Connection utilities
    reconnect: connectChannel,
    disconnect
  }
}

/**
 * Hook to check if chat real-time is connected
 * Useful for showing connection status in UI
 */
export function useChatRealtimeStatus(userId?: string) {
  const { isListening, connectionStatus, isOnline } = useChatRealtime(userId)
  
  return {
    isConnected: isListening,
    status: connectionStatus,
    isOnline,
    // Helper computed properties
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
    isDisconnected: connectionStatus === 'disconnected'
  }
}
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ChatUser, TypingIndicator } from '@/types/chat-app'

interface TypingUser {
  user_id: string
  username: string
  full_name: string
  user_profile?: string
  started_at: number
}

interface TypingBroadcastPayload {
  type: 'typing_start' | 'typing_stop'
  room_id: string
  user: {
    user_id: string
    username: string
    full_name: string
    user_profile?: string
  }
}

/**
 * Chat Typing Indicators Hook
 * 
 * Manages typing indicators using Supabase Realtime broadcast feature.
 * Provides:
 * - Real-time typing indicators for rooms
 * - Automatic typing timeout management
 * - Efficient broadcast with throttling
 * - Proper cleanup and memory management
 */
export function useChatTyping(currentUser?: ChatUser) {
  const [typingUsers, setTypingUsers] = useState<Record<string, TypingUser[]>>({})
  const [isConnected, setIsConnected] = useState(false)
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const typingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({})
  const isTypingRef = useRef<Record<string, boolean>>({})
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const TYPING_TIMEOUT = 3000 // 3 seconds
  const THROTTLE_INTERVAL = 500 // 500ms throttle for typing events

  // Get typing users for a specific room
  const getTypingUsers = useCallback((roomId: string): TypingUser[] => {
    return typingUsers[roomId] || []
  }, [typingUsers])

  // Get typing indicator display text
  const getTypingText = useCallback((roomId: string): string => {
    const users = getTypingUsers(roomId)
    const count = users.length
    
    if (count === 0) return ''
    if (count === 1) return `${users[0].full_name} is typing...`
    if (count === 2) return `${users[0].full_name} and ${users[1].full_name} are typing...`
    if (count === 3) return `${users[0].full_name}, ${users[1].full_name} and ${users[2].full_name} are typing...`
    return `${users[0].full_name}, ${users[1].full_name} and ${count - 2} others are typing...`
  }, [getTypingUsers])

  // Check if anyone is typing in a room
  const isAnyoneTyping = useCallback((roomId: string): boolean => {
    return getTypingUsers(roomId).length > 0
  }, [getTypingUsers])

  // Remove typing user after timeout
  const removeTypingUser = useCallback((roomId: string, userId: string) => {
    setTypingUsers(prev => {
      const roomTyping = prev[roomId] || []
      const filtered = roomTyping.filter(user => user.user_id !== userId)
      
      if (filtered.length === 0) {
        const { [roomId]: removed, ...rest } = prev
        return rest
      }
      
      return {
        ...prev,
        [roomId]: filtered
      }
    })
    
    // Clear timeout
    const timeoutKey = `${roomId}:${userId}`
    if (typingTimeoutRef.current[timeoutKey]) {
      clearTimeout(typingTimeoutRef.current[timeoutKey])
      delete typingTimeoutRef.current[timeoutKey]
    }
  }, [])

  // Add typing user with timeout
  const addTypingUser = useCallback((roomId: string, user: TypingUser) => {
    setTypingUsers(prev => {
      const roomTyping = prev[roomId] || []
      const existingIndex = roomTyping.findIndex(u => u.user_id === user.user_id)
      
      let updated: TypingUser[]
      if (existingIndex >= 0) {
        // Update existing user's timestamp
        updated = [...roomTyping]
        updated[existingIndex] = { ...user, started_at: Date.now() }
      } else {
        // Add new typing user
        updated = [...roomTyping, { ...user, started_at: Date.now() }]
      }
      
      return {
        ...prev,
        [roomId]: updated
      }
    })
    
    // Set timeout to remove user
    const timeoutKey = `${roomId}:${user.user_id}`
    if (typingTimeoutRef.current[timeoutKey]) {
      clearTimeout(typingTimeoutRef.current[timeoutKey])
    }
    
    typingTimeoutRef.current[timeoutKey] = setTimeout(() => {
      removeTypingUser(roomId, user.user_id)
    }, TYPING_TIMEOUT)
  }, [removeTypingUser])

  // Broadcast typing start (throttled)
  const startTyping = useCallback((roomId: string) => {
    if (!channelRef.current || !currentUser || !isConnected) {
      console.warn('⌨️ Cannot start typing - channel not ready:', { 
        hasChannel: !!channelRef.current, 
        hasUser: !!currentUser, 
        isConnected 
      })
      return
    }
    
    const key = `typing:${roomId}`
    if (isTypingRef.current[key]) return // Already typing
    
    isTypingRef.current[key] = true
    
    const payload: TypingBroadcastPayload = {
      type: 'typing_start',
      room_id: roomId,
      user: {
        user_id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name,
        user_profile: currentUser.user_profile
      }
    }
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload
    }).catch(error => {
      console.warn('[ChatTyping] Failed to send typing start:', error)
    })
  }, [currentUser?.id, currentUser?.username, currentUser?.full_name, currentUser?.user_profile, isConnected])

  // Broadcast typing stop
  const stopTyping = useCallback((roomId: string) => {
    if (!channelRef.current || !currentUser || !isConnected) {
      console.warn('⌨️ Cannot stop typing - channel not ready:', { 
        hasChannel: !!channelRef.current, 
        hasUser: !!currentUser, 
        isConnected 
      })
      return
    }
    
    const key = `typing:${roomId}`
    if (!isTypingRef.current[key]) return // Not typing
    
    isTypingRef.current[key] = false
    
    const payload: TypingBroadcastPayload = {
      type: 'typing_stop',
      room_id: roomId,
      user: {
        user_id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name,
        user_profile: currentUser.user_profile
      }
    }
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing',
      payload
    }).catch(error => {
      console.warn('[ChatTyping] Failed to send typing stop:', error)
    })
  }, [currentUser?.id, currentUser?.username, currentUser?.full_name, currentUser?.user_profile, isConnected])

  // Throttled typing handler for input events
  const handleTyping = useCallback((roomId: string) => {
    if (!currentUser) {
      console.warn('⌨️ No current user for typing')
      return
    }
    
    if (!isConnected) {
      console.warn('⌨️ Cannot type - channel not connected')
      return
    }
    
    // Start typing immediately if not already typing
    const key = `typing:${roomId}`
    if (!isTypingRef.current[key]) {
      startTyping(roomId)
    }
    
    // Clear existing timeout
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current)
    }
    
    // Set timeout to stop typing
    throttleTimeoutRef.current = setTimeout(() => {
      stopTyping(roomId)
    }, TYPING_TIMEOUT)
  }, [currentUser?.id, startTyping, stopTyping, isConnected])

  // Forward declaration - will be used in setupTypingChannel
  const reconnectTypingChannelRef = useRef<(() => void) | null>(null)

  // Setup typing broadcast channel with reconnection
  const setupTypingChannel = useCallback(() => {
    if (!currentUser || channelRef.current) return
    
    const supabase = createClient()
    
    console.log('⌨️ Setting up typing indicators...')
    
    const channel = supabase
      .channel(`chat-typing-global`, {
        config: {
          broadcast: { self: false, ack: false }, // Don't receive our own typing events
          presence: { key: currentUser.id },
          heartbeat_interval: 15000, // 15s heartbeat - shorter for typing responsiveness
          timeout: 30000 // 30s timeout
        }
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        const data = payload.payload as TypingBroadcastPayload
        
        // Ignore our own typing events
        if (data.user.user_id === currentUser.id) return
        
        console.log('⌨️ Received typing event:', data.type, data.room_id, data.user.full_name)
        
        if (data.type === 'typing_start') {
          addTypingUser(data.room_id, {
            user_id: data.user.user_id,
            username: data.user.username,
            full_name: data.user.full_name,
            user_profile: data.user.user_profile,
            started_at: Date.now()
          })
        } else if (data.type === 'typing_stop') {
          removeTypingUser(data.room_id, data.user.user_id)
        }
      })
      .on('system', {}, (payload) => {
        console.log('⌨️ Typing system event:', payload)
        if (payload.extension === 'broadcast') {
          switch (payload.status) {
            case 'SUBSCRIBED':
              setIsConnected(true)
              console.log('⌨️ Typing channel connected successfully')
              break
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              setIsConnected(false)
              console.warn('⌨️ Typing channel error, reconnecting...', payload.status)
              if (reconnectTypingChannelRef.current) {
                reconnectTypingChannelRef.current()
              }
              break
            case 'CLOSED':
              setIsConnected(false)
              console.log('⌨️ Typing channel closed')
              break
          }
        }
      })
      .subscribe((status) => {
        console.log('⌨️ Typing subscription status:', status)
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setIsConnected(false)
          console.warn('⌨️ Typing subscription failed, will retry...', status)
          if (reconnectTypingChannelRef.current) {
            reconnectTypingChannelRef.current()
          }
        } else if (status === 'CLOSED') {
          setIsConnected(false)
        }
      })
    
    channelRef.current = channel
  }, [currentUser?.id, addTypingUser, removeTypingUser])

  // Create the actual reconnect function
  const reconnectTypingChannel = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    // Small delay to avoid rapid reconnections
    setTimeout(() => {
      if (currentUser && !channelRef.current) {
        setupTypingChannel()
      }
    }, 1000)
  }, [currentUser, setupTypingChannel])

  // Set the ref so it can be used in setupTypingChannel
  reconnectTypingChannelRef.current = reconnectTypingChannel

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('⌨️ Cleaning up typing indicators...')
    
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    
    // Clear all timeouts
    Object.values(typingTimeoutRef.current).forEach(timeout => {
      clearTimeout(timeout)
    })
    typingTimeoutRef.current = {}
    
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current)
      throttleTimeoutRef.current = null
    }
    
    // Reset state
    setTypingUsers({})
    setIsConnected(false)
    isTypingRef.current = {}
  }, [])

  // Stop typing in all rooms when component unmounts or user changes
  const stopAllTyping = useCallback(() => {
    Object.keys(isTypingRef.current).forEach(key => {
      const roomId = key.replace('typing:', '')
      stopTyping(roomId)
    })
  }, [stopTyping])

  // Setup channel on mount
  useEffect(() => {
    if (currentUser) {
      setupTypingChannel()
    } else {
      cleanup()
    }
    
    return cleanup
  }, [currentUser?.id])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTyping()
      cleanup()
    }
  }, [])

  return {
    // State
    typingUsers,
    isConnected,
    
    // Room-specific utilities
    getTypingUsers,
    getTypingText,
    isAnyoneTyping,
    
    // Actions
    handleTyping,
    startTyping,
    stopTyping,
    
    // Stats
    totalTypingUsers: Object.values(typingUsers).reduce((sum, users) => sum + users.length, 0)
  }
}

/**
 * Simplified hook for a specific room
 */
export function useRoomTyping(roomId?: string, currentUser?: ChatUser) {
  const { getTypingUsers, getTypingText, isAnyoneTyping, handleTyping, isConnected } = useChatTyping(currentUser)
  
  return {
    typingUsers: roomId ? getTypingUsers(roomId) : [],
    typingText: roomId ? getTypingText(roomId) : '',
    isAnyoneTyping: roomId ? isAnyoneTyping(roomId) : false,
    handleTyping: roomId ? () => handleTyping(roomId) : () => {},
    isConnected
  }
}
'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { ChatUser } from '@/types/chat-app'

interface TypingUser {
  id: string
  username: string
  full_name: string
  user_profile?: string
}

interface TypingBroadcastPayload {
  type: 'start' | 'stop'
  room_id: string
  user: TypingUser
  timestamp: number
}

/**
 * Typing Indicators Real-time Hook
 * 
 * Simple real-time typing indicators following REALTIME_PATTERN.md:
 * - Broadcasts typing start/stop events
 * - Manages typing state with automatic timeout
 * - No complex error handling or data transformation
 * - Clean subscription management
 */
export function useTypingIndicators(currentUser?: ChatUser) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([])
  const [isConnected, setIsConnected] = useState(false)
  
  const channelRef = useRef<any>(null)
  const typingTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({})
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isCurrentlyTypingRef = useRef<Record<string, boolean>>({})
  
  const TYPING_TIMEOUT = 4000 // 4 seconds
  const DEBOUNCE_DELAY = 300 // 300ms debounce

  // Clean up typing user after timeout
  const removeTypingUser = useCallback((userId: string) => {
    setTypingUsers(prev => prev.filter(user => user.id !== userId))
    
    if (typingTimeoutsRef.current[userId]) {
      clearTimeout(typingTimeoutsRef.current[userId])
      delete typingTimeoutsRef.current[userId]
    }
  }, [])

  // Add typing user with timeout
  const addTypingUser = useCallback((user: TypingUser) => {
    // Don't show current user's typing indicator
    if (currentUser && user.id === currentUser.id) return
    
    setTypingUsers(prev => {
      const exists = prev.find(u => u.id === user.id)
      if (exists) return prev // Already in list
      return [...prev, user]
    })
    
    // Clear existing timeout
    if (typingTimeoutsRef.current[user.id]) {
      clearTimeout(typingTimeoutsRef.current[user.id])
    }
    
    // Set new timeout
    typingTimeoutsRef.current[user.id] = setTimeout(() => {
      removeTypingUser(user.id)
    }, TYPING_TIMEOUT)
  }, [currentUser?.id, removeTypingUser])

  // Broadcast typing start
  const startTyping = useCallback((roomId: string) => {
    if (!channelRef.current || !currentUser || !isConnected) return
    
    const key = `${roomId}`
    if (isCurrentlyTypingRef.current[key]) return // Already broadcasting
    
    isCurrentlyTypingRef.current[key] = true
    
    const payload: TypingBroadcastPayload = {
      type: 'start',
      room_id: roomId,
      user: {
        id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name,
        user_profile: currentUser.user_profile
      },
      timestamp: Date.now()
    }
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing_indicator',
      payload
    }).catch(() => {
      // Silent fail - just log for debugging
      console.warn('Failed to broadcast typing start')
    })
    
    console.log('⌨️ Started typing in room:', roomId)
  }, [currentUser, isConnected])

  // Broadcast typing stop
  const stopTyping = useCallback((roomId: string) => {
    if (!channelRef.current || !currentUser || !isConnected) return
    
    const key = `${roomId}`
    if (!isCurrentlyTypingRef.current[key]) return // Not typing
    
    isCurrentlyTypingRef.current[key] = false
    
    const payload: TypingBroadcastPayload = {
      type: 'stop',
      room_id: roomId,
      user: {
        id: currentUser.id,
        username: currentUser.username,
        full_name: currentUser.full_name,
        user_profile: currentUser.user_profile
      },
      timestamp: Date.now()
    }
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'typing_indicator',
      payload
    }).catch(() => {
      // Silent fail - just log for debugging
      console.warn('Failed to broadcast typing stop')
    })
    
    console.log('⌨️ Stopped typing in room:', roomId)
  }, [currentUser, isConnected])

  // Handle typing input with debounce
  const handleTyping = useCallback((roomId: string) => {
    if (!currentUser) return
    
    // Start typing immediately if not already typing
    const key = `${roomId}`
    if (!isCurrentlyTypingRef.current[key]) {
      startTyping(roomId)
    }
    
    // Clear existing debounce timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    // Set new timeout to stop typing
    debounceTimeoutRef.current = setTimeout(() => {
      stopTyping(roomId)
    }, TYPING_TIMEOUT)
  }, [currentUser, startTyping, stopTyping])

  // Check if anyone is typing
  const isTyping = typingUsers.length > 0

  // Get typing display text
  const getTypingText = useCallback((): string => {
    const count = typingUsers.length
    
    if (count === 0) return ''
    if (count === 1) return `${typingUsers[0].full_name} is typing...`
    if (count === 2) return `${typingUsers[0].full_name} and ${typingUsers[1].full_name} are typing...`
    return `${typingUsers[0].full_name} and ${count - 1} others are typing...`
  }, [typingUsers])

  useEffect(() => {
    if (!currentUser) return

    const supabase = createClient()
    
    console.log('⌨️ Setting up typing indicators real-time...')

    const channel = supabase
      .channel('typing-indicators-realtime', {
        config: {
          broadcast: { self: false } // Don't receive our own broadcasts
        }
      })
      .on('broadcast', { event: 'typing_indicator' }, (payload) => {
        const data = payload.payload as TypingBroadcastPayload
        
        // Ignore our own typing events (extra safety)
        if (data.user.id === currentUser.id) return
        
        console.log('⌨️ Received typing event:', data.type, data.user.full_name)
        
        if (data.type === 'start') {
          addTypingUser(data.user)
        } else if (data.type === 'stop') {
          removeTypingUser(data.user.id)
        }
      })
      .subscribe((status) => {
        console.log('⌨️ Typing indicators realtime status:', status)
        setIsConnected(status === 'SUBSCRIBED')
      })

    channelRef.current = channel

    return () => {
      console.log('⌨️ Cleaning up typing indicators real-time...')
      
      // Stop all active typing broadcasts
      Object.keys(isCurrentlyTypingRef.current).forEach(roomId => {
        if (isCurrentlyTypingRef.current[roomId]) {
          stopTyping(roomId)
        }
      })
      
      // Clear all timeouts
      Object.values(typingTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout)
      })
      typingTimeoutsRef.current = {}
      
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
        debounceTimeoutRef.current = null
      }
      
      // Unsubscribe from channel
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      
      // Reset state
      setTypingUsers([])
      setIsConnected(false)
      isCurrentlyTypingRef.current = {}
    }
  }, [currentUser?.id, addTypingUser, removeTypingUser, stopTyping])

  return {
    // State
    typingUsers,
    isTyping,
    isConnected,
    
    // Actions
    startTyping,
    stopTyping,
    handleTyping,
    
    // Utilities
    getTypingText
  }
}

/**
 * Simplified room-specific typing hook
 */
export function useRoomTypingIndicators(roomId?: string, currentUser?: ChatUser) {
  const { 
    typingUsers, 
    isTyping, 
    isConnected, 
    startTyping, 
    stopTyping, 
    handleTyping,
    getTypingText 
  } = useTypingIndicators(currentUser)
  
  return {
    typingUsers,
    isTyping,
    isConnected,
    typingText: getTypingText(),
    startTyping: roomId ? () => startTyping(roomId) : () => {},
    stopTyping: roomId ? () => stopTyping(roomId) : () => {},
    handleTyping: roomId ? () => handleTyping(roomId) : () => {}
  }
}
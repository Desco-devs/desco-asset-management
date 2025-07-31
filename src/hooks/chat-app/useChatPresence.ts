'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ChatUser, OnlineStatus } from '@/types/chat-app'

interface PresenceState {
  [userId: string]: {
    user_id: string
    username: string
    full_name: string
    user_profile?: string
    online_at: string
    room_id?: string // Current room they're active in
  }
}

interface PresencePayload {
  user_id: string
  username: string
  full_name: string
  user_profile?: string
  room_id?: string
}

/**
 * Chat Presence Hook
 * 
 * Manages user presence tracking using Supabase Realtime presence feature.
 * Provides:
 * - Online/offline status for users
 * - Room-specific presence (who's currently viewing which room)
 * - Automatic presence broadcasting for current user
 * - Efficient presence state management with cleanup
 */
export function useChatPresence(currentUser?: ChatUser, currentRoomId?: string) {
  const [presenceState, setPresenceState] = useState<PresenceState>({})
  const [isTracking, setIsTracking] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  
  // Track online users
  const onlineUsers = Object.values(presenceState)
  const onlineUserIds = onlineUsers.map(user => user.user_id)
  
  // Get users in current room
  const usersInCurrentRoom = currentRoomId 
    ? onlineUsers.filter(user => user.room_id === currentRoomId)
    : []

  // Check if specific user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return userId in presenceState
  }, [presenceState])

  // Get user's current room
  const getUserCurrentRoom = useCallback((userId: string): string | undefined => {
    return presenceState[userId]?.room_id
  }, [presenceState])

  // Update current user's presence
  const updatePresence = useCallback(async (roomId?: string) => {
    if (!channelRef.current || !currentUser) return

    const payload: PresencePayload = {
      user_id: currentUser.id,
      username: currentUser.username,
      full_name: currentUser.full_name,
      user_profile: currentUser.user_profile,
      room_id: roomId
    }

    try {
      await channelRef.current.track(payload)
      console.log('👥 Updated presence:', payload)
    } catch (error) {
      console.warn('[ChatPresence] Failed to update presence:', error)
    }
  }, [currentUser])

  // Setup presence tracking
  const setupPresence = useCallback(() => {
    if (!currentUser || channelRef.current) return

    const supabase = createClient()
    
    console.log('👥 Setting up presence tracking...')

    const channel = supabase
      .channel('chat-presence', {
        config: {
          presence: { 
            key: currentUser.id,
            // Track presence with a shorter timeout for chat responsiveness
            heartbeat_interval: 15000, // 15s
            presence_ref_timeout: 30000 // 30s timeout
          }
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        console.log('👥 Presence sync:', newState)
        
        // Convert to our state format
        const formattedState: PresenceState = {}
        Object.entries(newState).forEach(([userId, presences]) => {
          // Take the latest presence for each user
          const latestPresence = (presences as any[])[0]
          if (latestPresence) {
            formattedState[userId] = {
              ...latestPresence,
              online_at: new Date().toISOString()
            }
          }
        })
        
        setPresenceState(formattedState)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👥 User joined:', key, newPresences)
        
        setPresenceState(prev => {
          const updated = { ...prev }
          newPresences.forEach((presence: any) => {
            updated[key] = {
              ...presence,
              online_at: new Date().toISOString()
            }
          })
          return updated
        })
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👥 User left:', key, leftPresences)
        
        setPresenceState(prev => {
          const updated = { ...prev }
          delete updated[key]
          return updated
        })
      })
      .subscribe(async (status) => {
        console.log('👥 Presence subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          setIsTracking(true)
          // Track initial presence with current room
          await updatePresence(currentRoomId)
          
          // Set up heartbeat to keep presence alive
          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current)
          }
          
          heartbeatRef.current = setInterval(async () => {
            await updatePresence(currentRoomId)
          }, 60000) // Update every minute to keep presence fresh
        } else {
          setIsTracking(false)
        }
      })

    channelRef.current = channel
  }, [currentUser, currentRoomId, updatePresence])

  // Cleanup presence
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      console.log('👥 Cleaning up presence...')
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
    
    setPresenceState({})
    setIsTracking(false)
  }, [])

  // Update presence when room changes
  useEffect(() => {
    if (isTracking && currentUser) {
      updatePresence(currentRoomId)
    }
  }, [currentRoomId, isTracking, currentUser, updatePresence])

  // Setup/cleanup presence tracking
  useEffect(() => {
    if (currentUser) {
      setupPresence()
    } else {
      cleanup()
    }

    return cleanup
  }, [currentUser, setupPresence, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  return {
    // State
    presenceState,
    onlineUsers,
    onlineUserIds,
    usersInCurrentRoom,
    isTracking,
    
    // Utilities
    isUserOnline,
    getUserCurrentRoom,
    updatePresence,
    
    // Stats
    onlineCount: onlineUsers.length,
    roomUserCount: usersInCurrentRoom.length
  }
}

/**
 * Simplified hook to just check online status
 */
export function useUserOnlineStatus(userId?: string, currentUser?: ChatUser) {
  const { isUserOnline, onlineUserIds } = useChatPresence(currentUser)
  
  return {
    isOnline: userId ? isUserOnline(userId) : false,
    onlineCount: onlineUserIds.length
  }
}

/**
 * Hook to get room presence info
 */
export function useRoomPresence(roomId?: string, currentUser?: ChatUser) {
  const { usersInCurrentRoom, roomUserCount } = useChatPresence(currentUser, roomId)
  
  return {
    usersInRoom: usersInCurrentRoom,
    userCount: roomUserCount,
    userNames: usersInCurrentRoom.map(u => u.full_name).join(', ')
  }
}
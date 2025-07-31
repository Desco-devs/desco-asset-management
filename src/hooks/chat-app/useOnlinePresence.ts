'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ChatUser } from '@/types/chat-app'

interface OnlineUser {
  user_id: string
  username: string
  full_name: string
  user_profile?: string
  last_seen: string
  room_id?: string // Currently active room
}

interface PresenceData {
  user_id: string
  username: string
  full_name: string
  user_profile?: string
  room_id?: string
  timestamp: string
}

/**
 * Online Presence Query Keys
 * Following the established pattern from other chat hooks
 */
export const PRESENCE_QUERY_KEYS = {
  globalPresence: () => ['online-presence'],
  roomPresence: (roomId: string) => ['online-presence', 'room', roomId],
  userPresence: (userId: string) => ['online-presence', 'user', userId],
}

/**
 * Network-aware presence configuration
 * Adapts heartbeat frequency based on connection quality
 */
function usePresenceConfig() {
  const [config, setConfig] = useState({
    heartbeatInterval: 15000, // 15s default
    presenceTimeout: 45000,   // 45s timeout
    maxRetries: 3
  })

  useEffect(() => {
    if (typeof navigator === 'undefined') return

    // Adapt to connection quality
    // @ts-ignore - connection API is experimental but widely supported
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    const updateConfig = () => {
      const effectiveType = connection?.effectiveType || 'unknown'
      
      switch (effectiveType) {
        case 'slow-2g':
        case '2g':
          setConfig({
            heartbeatInterval: 30000, // 30s for slow connections
            presenceTimeout: 90000,   // 90s timeout
            maxRetries: 2
          })
          break
        case '3g':
          setConfig({
            heartbeatInterval: 20000, // 20s for 3G
            presenceTimeout: 60000,   // 60s timeout
            maxRetries: 3
          })
          break
        case '4g':
        case '5g':
        case 'wifi':
          setConfig({
            heartbeatInterval: 10000, // 10s for fast connections
            presenceTimeout: 30000,   // 30s timeout
            maxRetries: 5
          })
          break
        default:
          setConfig({
            heartbeatInterval: 15000, // 15s default
            presenceTimeout: 45000,   // 45s timeout
            maxRetries: 3
          })
      }
    }

    if (connection) {
      connection.addEventListener('change', updateConfig)
      updateConfig()
    }

    return () => {
      if (connection) {
        connection.removeEventListener('change', updateConfig)
      }
    }
  }, [])

  return config
}

/**
 * Online Presence Real-time Hook
 * 
 * Provides comprehensive online presence functionality following the established
 * real-time patterns from useChatRealtime and useChatInvitationsRealtime.
 * 
 * Features:
 * - Real-time online/offline status tracking
 * - Automatic heartbeat mechanism with network adaptation
 * - Room-specific presence tracking
 * - Global and per-room user counts
 * - Automatic cleanup and reconnection handling
 * - Efficient state management with minimal re-renders
 * 
 * @param currentUser - The current authenticated user
 * @param activeRoomId - Optional room ID for room-specific presence
 */
export function useOnlinePresence(currentUser?: ChatUser, activeRoomId?: string) {
  const queryClient = useQueryClient()
  const config = usePresenceConfig()
  
  // State management
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [currentPresenceStatus, setCurrentPresenceStatus] = useState<'online' | 'offline'>('offline')
  
  // Refs for cleanup and management
  const channelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const lastHeartbeatRef = useRef<number>(0)

  // Derived state
  const onlineCount = onlineUsers.length
  const roomUsers = activeRoomId 
    ? onlineUsers.filter(user => user.room_id === activeRoomId)
    : []
  const roomUserCount = roomUsers.length

  // Check if specific user is online
  const isUserOnline = useCallback((userId: string): boolean => {
    return onlineUsers.some(user => user.user_id === userId)
  }, [onlineUsers])

  // Get online users in specific room
  const getUsersInRoom = useCallback((roomId: string): OnlineUser[] => {
    return onlineUsers.filter(user => user.room_id === roomId)
  }, [onlineUsers])

  // Update presence state
  const updatePresenceState = useCallback((presenceState: any) => {
    const users: OnlineUser[] = []
    
    Object.entries(presenceState).forEach(([userId, presences]) => {
      const presenceArray = presences as any[]
      if (presenceArray && presenceArray.length > 0) {
        // Take the most recent presence
        const latestPresence = presenceArray[0]
        users.push({
          user_id: userId,
          username: latestPresence.username || 'Unknown',
          full_name: latestPresence.full_name || 'Unknown User',
          user_profile: latestPresence.user_profile,
          last_seen: latestPresence.timestamp || new Date().toISOString(),
          room_id: latestPresence.room_id
        })
      }
    })
    
    setOnlineUsers(users)
    
    // Invalidate relevant queries
    queryClient.invalidateQueries({
      queryKey: PRESENCE_QUERY_KEYS.globalPresence(),
      exact: false
    })
    
    if (activeRoomId) {
      queryClient.invalidateQueries({
        queryKey: PRESENCE_QUERY_KEYS.roomPresence(activeRoomId),
        exact: true
      })
    }
  }, [queryClient, activeRoomId])

  // Start heartbeat mechanism
  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
    }

    heartbeatRef.current = setInterval(async () => {
      if (!channelRef.current || !currentUser) return

      const now = Date.now()
      const timeSinceLastHeartbeat = now - lastHeartbeatRef.current

      // Skip if we recently sent a heartbeat
      if (timeSinceLastHeartbeat < config.heartbeatInterval * 0.8) {
        return
      }

      try {
        const presenceData: PresenceData = {
          user_id: currentUser.id,
          username: currentUser.username,
          full_name: currentUser.full_name,
          user_profile: currentUser.user_profile,
          room_id: activeRoomId,
          timestamp: new Date().toISOString()
        }

        await channelRef.current.track(presenceData)
        lastHeartbeatRef.current = now
        
        console.log('💓 Heartbeat sent:', presenceData)
      } catch (error) {
        console.warn('[OnlinePresence] Heartbeat failed:', error)
        setConnectionStatus('error')
      }
    }, config.heartbeatInterval)
  }, [currentUser, activeRoomId, config.heartbeatInterval])

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current)
      heartbeatRef.current = null
    }
  }, [])

  // Set presence status manually
  const setPresence = useCallback(async (status: 'online' | 'offline') => {
    if (!channelRef.current || !currentUser) return

    try {
      if (status === 'online') {
        const presenceData: PresenceData = {
          user_id: currentUser.id,
          username: currentUser.username,
          full_name: currentUser.full_name,
          user_profile: currentUser.user_profile,
          room_id: activeRoomId,
          timestamp: new Date().toISOString()
        }

        await channelRef.current.track(presenceData)
        setCurrentPresenceStatus('online')
        startHeartbeat()
        
        console.log('🟢 Presence set to online:', presenceData)
      } else {
        await channelRef.current.untrack()
        setCurrentPresenceStatus('offline')
        stopHeartbeat()
        
        console.log('🔴 Presence set to offline')
      }
    } catch (error) {
      console.warn('[OnlinePresence] Failed to set presence:', error)
    }
  }, [currentUser, activeRoomId, startHeartbeat, stopHeartbeat])

  // Setup presence connection
  const connectPresence = useCallback(async () => {
    if (!currentUser || channelRef.current) return

    try {
      setConnectionStatus('connecting')
      const supabase = createClient()

      console.log('🌐 Setting up online presence real-time...')

      const channel = supabase
        .channel('online-presence-realtime', {
          config: {
            presence: {
              key: currentUser.id,
              heartbeat_interval: config.heartbeatInterval,
              presence_ref_timeout: config.presenceTimeout
            },
            broadcast: { self: false }
          }
        })
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState()
          console.log('🌐 Presence sync:', Object.keys(state).length, 'users online')
          updatePresenceState(state)
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('🟢 User came online:', key)
          const state = channel.presenceState()
          updatePresenceState(state)
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('🔴 User went offline:', key)
          const state = channel.presenceState()
          updatePresenceState(state)
        })
        .on('system', {}, (payload) => {
          // Handle connection status changes
          switch (payload.status) {
            case 'SUBSCRIBED':
              setConnectionStatus('connected')
              reconnectAttemptsRef.current = 0
              console.log('🌐 Online presence connected')
              // Auto-set presence to online when connected
              setPresence('online')
              break
            case 'CHANNEL_ERROR':
            case 'TIMED_OUT':
              setConnectionStatus('error')
              console.warn('🌐 Online presence error:', payload.status)
              scheduleReconnect()
              break
            case 'CLOSED':
              setConnectionStatus('disconnected')
              setCurrentPresenceStatus('offline')
              stopHeartbeat()
              console.log('🌐 Online presence disconnected')
              break
          }
        })
        .subscribe(async (status) => {
          console.log('🌐 Online presence subscription status:', status)
          
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
      console.error('[OnlinePresence] Connection error:', error)
      setConnectionStatus('error')
      scheduleReconnect()
    }
  }, [currentUser, config, updatePresenceState, setPresence, stopHeartbeat])

  // Reconnection with backoff
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= config.maxRetries) {
      console.warn('[OnlinePresence] Max reconnection attempts reached')
      setConnectionStatus('error')
      return
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000) // Max 30s
    reconnectAttemptsRef.current += 1

    console.log(`🌐 Scheduling presence reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      disconnectPresence()
      connectPresence()
    }, delay)
  }, [config.maxRetries, connectPresence])

  // Disconnect presence
  const disconnectPresence = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    stopHeartbeat()

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    setConnectionStatus('disconnected')
    setCurrentPresenceStatus('offline')
    setOnlineUsers([])
    
    console.log('🌐 Online presence disconnected and cleaned up')
  }, [stopHeartbeat])

  // Handle room changes
  useEffect(() => {
    if (connectionStatus === 'connected' && currentPresenceStatus === 'online') {
      // Update presence with new room
      setPresence('online')
    }
  }, [activeRoomId, connectionStatus, currentPresenceStatus, setPresence])

  // Main connection effect
  useEffect(() => {
    if (currentUser) {
      connectPresence()
    } else {
      disconnectPresence()
    }

    return disconnectPresence
  }, [currentUser?.id])

  // Cleanup on unmount
  useEffect(() => {
    return disconnectPresence
  }, [disconnectPresence])

  // Handle visibility changes for better presence management
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden - don't disconnect immediately but reduce heartbeat
        stopHeartbeat()
      } else {
        // Page visible - resume normal operation
        if (connectionStatus === 'connected' && currentPresenceStatus === 'online') {
          startHeartbeat()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [connectionStatus, currentPresenceStatus, startHeartbeat, stopHeartbeat])

  return {
    // Core state
    onlineUsers,
    onlineCount,
    isUserOnline,
    setPresence,
    
    // Room-specific utilities
    roomUsers,
    roomUserCount: roomUsers.length,
    getUsersInRoom,
    
    // Connection status
    connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
    
    // Current user status
    currentPresenceStatus,
    isCurrentUserOnline: currentPresenceStatus === 'online',
    
    // Utilities
    reconnect: connectPresence,
    disconnect: disconnectPresence,
    reconnectAttempts: reconnectAttemptsRef.current,
    
    // Stats
    stats: {
      totalOnline: onlineCount,
      inCurrentRoom: roomUserCount,
      heartbeatInterval: config.heartbeatInterval,
      lastHeartbeat: new Date(lastHeartbeatRef.current)
    }
  }
}

/**
 * Simplified hook for checking if a user is online
 * Lightweight version for components that only need online status
 */
export function useUserOnline(userId: string, currentUser?: ChatUser) {
  const { isUserOnline, onlineCount } = useOnlinePresence(currentUser)
  
  return {
    isOnline: isUserOnline(userId),
    totalOnline: onlineCount
  }
}

/**
 * Hook for room-specific presence information
 * Optimized for room components that need user counts and lists
 */
export function useRoomOnlinePresence(roomId: string, currentUser?: ChatUser) {
  const { getUsersInRoom, roomUserCount, onlineCount } = useOnlinePresence(currentUser, roomId)
  
  const usersInRoom = getUsersInRoom(roomId)
  
  return {
    usersInRoom,
    userCount: usersInRoom.length,
    totalOnline: onlineCount,
    usernames: usersInRoom.map(u => u.full_name).join(', '),
    userIds: usersInRoom.map(u => u.user_id)
  }
}
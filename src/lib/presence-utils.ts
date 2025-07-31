import { createClient } from '@/lib/supabase'
import type { ChatUser } from '@/types/chat-app'

/**
 * Presence Utility Functions
 * 
 * Utility functions for managing online presence across the application.
 * These functions provide a bridge between the real-time hooks and components
 * that need presence information.
 */

export interface PresenceUser {
  user_id: string
  username: string
  full_name: string
  user_profile?: string
  last_seen: string
  room_id?: string
  is_online: boolean
}

export interface PresenceConfig {
  heartbeatInterval: number
  presenceTimeout: number
  reconnectDelay: number
  maxRetries: number
}

/**
 * Default presence configuration
 * Can be overridden for different network conditions
 */
export const DEFAULT_PRESENCE_CONFIG: PresenceConfig = {
  heartbeatInterval: 15000, // 15 seconds
  presenceTimeout: 45000,   // 45 seconds
  reconnectDelay: 5000,     // 5 seconds
  maxRetries: 3
}

/**
 * Get adaptive presence configuration based on network conditions
 */
export function getAdaptivePresenceConfig(): PresenceConfig {
  if (typeof navigator === 'undefined') {
    return DEFAULT_PRESENCE_CONFIG
  }

  // @ts-ignore - connection API is experimental but widely supported
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  
  if (!connection) {
    return DEFAULT_PRESENCE_CONFIG
  }

  const effectiveType = connection.effectiveType || 'unknown'
  
  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return {
        heartbeatInterval: 30000,
        presenceTimeout: 90000,
        reconnectDelay: 10000,
        maxRetries: 2
      }
    case '3g':
      return {
        heartbeatInterval: 20000,
        presenceTimeout: 60000,
        reconnectDelay: 7000,
        maxRetries: 3
      }
    case '4g':
    case '5g':
    case 'wifi':
      return {
        heartbeatInterval: 10000,
        presenceTimeout: 30000,
        reconnectDelay: 3000,
        maxRetries: 5
      }
    default:
      return DEFAULT_PRESENCE_CONFIG
  }
}

/**
 * Format user presence data for display
 */
export function formatPresenceUser(user: any): PresenceUser {
  return {
    user_id: user.user_id || user.id,
    username: user.username || 'Unknown',
    full_name: user.full_name || 'Unknown User',
    user_profile: user.user_profile,
    last_seen: user.last_seen || user.timestamp || new Date().toISOString(),
    room_id: user.room_id,
    is_online: true
  }
}

/**
 * Check if a user was recently online (within threshold)
 */
export function isRecentlyOnline(lastSeen: string, thresholdMinutes: number = 5): boolean {
  const lastSeenTime = new Date(lastSeen).getTime()
  const now = new Date().getTime()
  const thresholdMs = thresholdMinutes * 60 * 1000
  
  return (now - lastSeenTime) <= thresholdMs
}

/**
 * Get time since user was last online
 */
export function getTimeSinceOnline(lastSeen: string): string {
  const lastSeenTime = new Date(lastSeen).getTime()
  const now = new Date().getTime()
  const diffMs = now - lastSeenTime
  
  const minutes = Math.floor(diffMs / (1000 * 60))
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

/**
 * Create presence data for tracking
 */
export function createPresenceData(user: ChatUser, roomId?: string) {
  return {
    user_id: user.id,
    username: user.username,
    full_name: user.full_name,
    user_profile: user.user_profile,
    room_id: roomId,
    timestamp: new Date().toISOString()
  }
}

/**
 * Batch update user presence status in database
 * Useful for cleanup operations or bulk updates
 */
export async function batchUpdatePresenceStatus(
  userIds: string[], 
  isOnline: boolean
): Promise<{ success: boolean; updated: number; errors: string[] }> {
  const errors: string[] = []
  let updated = 0

  try {
    const response = await fetch('/api/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        batch: true,
        updates: userIds.map(userId => ({
          userId,
          status: isOnline ? 'online' : 'offline'
        }))
      })
    })

    if (response.ok) {
      const result = await response.json()
      updated = result.updated || userIds.length
    } else {
      errors.push(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    errors.push(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    success: errors.length === 0,
    updated,
    errors
  }
}

/**
 * Get presence statistics for a room
 */
export async function getRoomPresenceStats(roomId: string) {
  try {
    const response = await fetch(`/api/presence/room/${roomId}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    return {
      success: true,
      ...data.presence,
      room: data.room
    }
  } catch (error) {
    console.warn('[PresenceUtils] Failed to get room presence stats:', error)
    return {
      success: false,
      users_in_room: [],
      online_members: [],
      counts: { in_room: 0, online_members: 0, total_members: 0 },
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Broadcast custom presence event
 * Useful for custom presence actions or notifications
 */
export async function broadcastPresenceEvent(
  event: string, 
  payload: any
): Promise<boolean> {
  try {
    const supabase = createClient()
    
    await supabase
      .channel('custom-presence-broadcast')
      .send({
        type: 'broadcast',
        event: event,
        payload: {
          ...payload,
          timestamp: new Date().toISOString()
        }
      })
    
    return true
  } catch (error) {
    console.warn('[PresenceUtils] Failed to broadcast presence event:', error)
    return false
  }
}

/**
 * Validate presence data structure
 */
export function validatePresenceData(data: any): boolean {
  if (!data || typeof data !== 'object') return false
  
  const required = ['user_id', 'username', 'full_name']
  return required.every(field => field in data && data[field])
}

/**
 * Clean up stale presence data
 * Removes users who haven't been seen for a specified time
 */
export function filterStalePresence(
  users: PresenceUser[], 
  staleThresholdMinutes: number = 10
): PresenceUser[] {
  const staleThresholdMs = staleThresholdMinutes * 60 * 1000
  const now = new Date().getTime()
  
  return users.filter(user => {
    const lastSeen = new Date(user.last_seen).getTime()
    return (now - lastSeen) <= staleThresholdMs
  })
}

/**
 * Group users by their current room
 */
export function groupUsersByRoom(users: PresenceUser[]): Record<string, PresenceUser[]> {
  const grouped: Record<string, PresenceUser[]> = {}
  
  users.forEach(user => {
    const roomId = user.room_id || 'no-room'
    if (!grouped[roomId]) {
      grouped[roomId] = []
    }
    grouped[roomId].push(user)
  })
  
  return grouped
}

/**
 * Calculate presence engagement metrics
 */
export function calculatePresenceMetrics(users: PresenceUser[]) {
  const now = new Date().getTime()
  const usersInRooms = users.filter(u => u.room_id).length
  const recentlyActive = users.filter(u => 
    isRecentlyOnline(u.last_seen, 5)
  ).length
  
  const averageSessionTime = users.reduce((acc, user) => {
    const sessionStart = new Date(user.last_seen).getTime()
    return acc + (now - sessionStart)
  }, 0) / users.length
  
  return {
    total_online: users.length,
    in_rooms: usersInRooms,
    recently_active: recentlyActive,
    engagement_rate: users.length > 0 ? (usersInRooms / users.length) * 100 : 0,
    average_session_minutes: Math.round(averageSessionTime / (1000 * 60))
  }
}

/**
 * Create a presence indicator component data
 */
export function createPresenceIndicator(user: PresenceUser) {
  const isRecent = isRecentlyOnline(user.last_seen, 2)
  const timeSince = getTimeSinceOnline(user.last_seen)
  
  return {
    user_id: user.user_id,
    username: user.username,
    full_name: user.full_name,
    avatar_url: user.user_profile,
    is_online: user.is_online && isRecent,
    status_text: isRecent ? 'Online' : timeSince,
    status_color: isRecent ? 'green' : 'gray',
    in_room: !!user.room_id,
    room_id: user.room_id
  }
}
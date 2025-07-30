import { prisma } from '@/lib/prisma'

/**
 * Cache layer for chat-related database operations
 * This provides in-memory caching for frequently accessed data
 * to improve real-time chat performance
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

class ChatCache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, ttl = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    })
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Delete cache entry
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear cache entries matching pattern
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(pattern)
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}

// Global cache instance
export const chatCache = new ChatCache()

/**
 * Cached room membership verification
 */
export async function getCachedRoomMembership(roomId: string, userId: string) {
  const cacheKey = `room_membership:${roomId}:${userId}`
  
  let membership = chatCache.get(cacheKey)
  if (membership) return membership

  membership = await prisma.room_member.findFirst({
    where: {
      room_id: roomId,
      user_id: userId,
    },
    select: {
      id: true,
      last_read: true,
      joined_at: true,
      room: {
        select: {
          id: true,
          name: true,
          type: true,
          owner_id: true,
        },
      },
    },
  })

  if (membership) {
    chatCache.set(cacheKey, membership, 2 * 60 * 1000) // Cache for 2 minutes
  }

  return membership
}

/**
 * Cached user basic info
 */
export async function getCachedUserInfo(userId: string) {
  const cacheKey = `user_info:${userId}`
  
  let userInfo = chatCache.get(cacheKey)
  if (userInfo) return userInfo

  userInfo = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      full_name: true,
      user_profile: true,
      is_online: true,
      last_seen: true,
    },
  })

  if (userInfo) {
    chatCache.set(cacheKey, userInfo, 5 * 60 * 1000) // Cache for 5 minutes
  }

  return userInfo
}

/**
 * Cached room member count
 */
export async function getCachedRoomMemberCount(roomId: string) {
  const cacheKey = `room_member_count:${roomId}`
  
  let count = chatCache.get(cacheKey)
  if (count !== null) return count

  count = await prisma.room_member.count({
    where: { room_id: roomId },
  })

  chatCache.set(cacheKey, count, 1 * 60 * 1000) // Cache for 1 minute

  return count
}

/**
 * Cached unread message count for a specific room
 */
export async function getCachedUnreadCount(roomId: string, userId: string, lastRead?: Date) {
  const cacheKey = `unread_count:${roomId}:${userId}`
  
  let count = chatCache.get(cacheKey)
  if (count !== null) return count

  if (!lastRead) {
    const membership = await getCachedRoomMembership(roomId, userId)
    lastRead = (membership as any)?.last_read || new Date(0)
  }

  count = await prisma.message.count({
    where: {
      room_id: roomId,
      created_at: {
        gt: lastRead,
      },
      sender_id: {
        not: userId,
      },
    },
  })

  chatCache.set(cacheKey, count, 30 * 1000) // Cache for 30 seconds

  return count
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  /**
   * Invalidate all cache entries for a user
   */
  invalidateUser(userId: string) {
    chatCache.clearPattern(`user_info:${userId}`)
    chatCache.clearPattern(`room_membership:.*:${userId}`)
    chatCache.clearPattern(`unread_count:.*:${userId}`)
  },

  /**
   * Invalidate all cache entries for a room
   */
  invalidateRoom(roomId: string) {
    chatCache.clearPattern(`room_membership:${roomId}:.*`)
    chatCache.clearPattern(`room_member_count:${roomId}`)
    chatCache.clearPattern(`unread_count:${roomId}:.*`)
  },

  /**
   * Invalidate cache after message creation
   */
  invalidateAfterMessage(roomId: string, senderId: string) {
    // Invalidate unread counts for all room members except sender
    chatCache.clearPattern(`unread_count:${roomId}:(?!${senderId}).*`)
    
    // Invalidate room member count (in case it affects sorting)
    chatCache.delete(`room_member_count:${roomId}`)
  },

  /**
   * Invalidate cache after user joins/leaves room
   */
  invalidateAfterMembershipChange(roomId: string, userId: string) {
    chatCache.delete(`room_membership:${roomId}:${userId}`)
    chatCache.delete(`room_member_count:${roomId}`)
    chatCache.clearPattern(`unread_count:${roomId}:.*`)
  },

  /**
   * Invalidate cache after user reads messages
   */
  invalidateAfterRead(roomId: string, userId: string) {
    chatCache.delete(`unread_count:${roomId}:${userId}`)
    chatCache.delete(`room_membership:${roomId}:${userId}`)
  },
}

/**
 * Cache warming functions for better performance
 */
export const cacheWarming = {
  /**
   * Pre-warm cache for user's rooms and memberships
   */
  async warmUserRooms(userId: string) {
    const userRooms = await prisma.room_member.findMany({
      where: { user_id: userId },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            owner_id: true,
          },
        },
      },
    })

    // Cache all room memberships
    userRooms.forEach(membership => {
      const cacheKey = `room_membership:${membership.room_id}:${userId}`
      chatCache.set(cacheKey, {
        id: membership.id,
        last_read: membership.last_read,
        joined_at: membership.joined_at,
        room: membership.room,
      }, 2 * 60 * 1000)
    })

    return userRooms.length
  },

  /**
   * Pre-warm cache for room data
   */
  async warmRoomData(roomId: string) {
    const [memberCount, members] = await Promise.all([
      prisma.room_member.count({ where: { room_id: roomId } }),
      prisma.room_member.findMany({
        where: { room_id: roomId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              full_name: true,
              user_profile: true,
              is_online: true,
              last_seen: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
              type: true,
              owner_id: true,
            },
          },
        },
      }),
    ])

    // Cache room member count
    chatCache.set(`room_member_count:${roomId}`, memberCount, 1 * 60 * 1000)

    // Cache individual memberships and user info
    members.forEach(membership => {
      const userId = membership.user_id
      
      // Cache membership
      const membershipCacheKey = `room_membership:${roomId}:${userId}`
      chatCache.set(membershipCacheKey, {
        id: membership.id,
        last_read: membership.last_read,
        joined_at: membership.joined_at,
        room: membership.room,
      }, 2 * 60 * 1000)

      // Cache user info
      const userCacheKey = `user_info:${userId}`
      chatCache.set(userCacheKey, membership.user, 5 * 60 * 1000)
    })

    return members.length
  },
}

/**
 * Performance monitoring
 */
export const cacheMetrics = {
  hits: 0,
  misses: 0,
  
  recordHit() {
    this.hits++
  },
  
  recordMiss() {
    this.misses++
  },
  
  getHitRate() {
    const total = this.hits + this.misses
    return total > 0 ? this.hits / total : 0
  },
  
  reset() {
    this.hits = 0
    this.misses = 0
  },
  
  getStats() {
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: this.getHitRate(),
      cacheSize: chatCache.getStats().size,
    }
  },
}
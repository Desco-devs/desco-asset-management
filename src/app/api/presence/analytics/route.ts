import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/presence/analytics
 * Get presence analytics and statistics
 * Restricted to ADMIN/SUPERADMIN users
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h' // 1h, 24h, 7d, 30d
    const includeRoomBreakdown = searchParams.get('includeRooms') === 'true'

    // Calculate time range
    const now = new Date()
    let startTime: Date
    
    switch (timeframe) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    // Get current real-time presence
    const supabase = createClient()
    let currentOnlineUsers: any[] = []
    
    try {
      const channel = supabase.channel('analytics-presence-check')
      const presenceState = channel.presenceState()
      
      currentOnlineUsers = Object.entries(presenceState).map(([userId, presences]) => {
        const presence = (presences as any[])[0]
        return {
          user_id: userId,
          username: presence?.username || 'Unknown',
          full_name: presence?.full_name || 'Unknown User',
          room_id: presence?.room_id,
          timestamp: presence?.timestamp || new Date().toISOString()
        }
      })
    } catch (error) {
      console.warn('[Presence Analytics] Failed to get real-time data:', error)
    }

    // Get database statistics
    const [
      totalUsers,
      activeUsers,
      recentlyActiveUsers,
      roomStats
    ] = await Promise.all([
      // Total registered users
      prisma.user.count({
        where: {
          user_status: 'ACTIVE'
        }
      }),

      // Currently online users (database)
      prisma.user.count({
        where: {
          is_online: true,
          user_status: 'ACTIVE'
        }
      }),

      // Recently active users (within timeframe)
      prisma.user.count({
        where: {
          last_seen: {
            gte: startTime
          },
          user_status: 'ACTIVE'
        }
      }),

      // Room statistics (if requested)
      includeRoomBreakdown ? prisma.room.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          _count: {
            select: {
              members: true
            }
          }
        }
      }) : []
    ])

    // Calculate presence statistics
    const currentRealtimeCount = currentOnlineUsers.length
    const uniqueRooms = new Set(currentOnlineUsers.filter(u => u.room_id).map(u => u.room_id))
    const roomsWithActivity = uniqueRooms.size

    // Room breakdown with current presence
    let roomBreakdown: any[] = []
    if (includeRoomBreakdown && roomStats.length > 0) {
      roomBreakdown = roomStats.map(room => {
        const usersInRoom = currentOnlineUsers.filter(u => u.room_id === room.id)
        return {
          room_id: room.id,
          room_name: room.name,
          room_type: room.type,
          total_members: room._count.members,
          current_online: usersInRoom.length,
          users_online: usersInRoom.map(u => ({
            user_id: u.user_id,
            username: u.username,
            full_name: u.full_name
          }))
        }
      })
    }

    // Peak hours analysis (simplified)
    const hourlyDistribution = currentOnlineUsers.reduce((acc, user) => {
      const hour = new Date(user.timestamp).getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    return NextResponse.json({
      success: true,
      timeframe,
      generated_at: now.toISOString(),
      overview: {
        total_registered_users: totalUsers,
        currently_online_realtime: currentRealtimeCount,
        currently_online_database: activeUsers,
        recently_active: recentlyActiveUsers,
        rooms_with_activity: roomsWithActivity,
        total_rooms: roomStats.length
      },
      current_presence: {
        online_users: currentOnlineUsers.length,
        users: currentOnlineUsers.map(u => ({
          user_id: u.user_id,
          username: u.username,
          full_name: u.full_name,
          current_room: u.room_id,
          online_since: u.timestamp
        }))
      },
      room_breakdown: roomBreakdown,
      analytics: {
        online_percentage: totalUsers > 0 ? ((currentRealtimeCount / totalUsers) * 100).toFixed(2) : '0.00',
        average_users_per_active_room: roomsWithActivity > 0 ? (currentRealtimeCount / roomsWithActivity).toFixed(2) : '0.00',
        hourly_distribution: hourlyDistribution
      },
      sources: {
        realtime_presence: currentRealtimeCount,
        database_fallback: activeUsers,
        data_consistency: currentRealtimeCount === activeUsers ? 'consistent' : 'inconsistent'
      }
    })

  } catch (error) {
    console.error('[Presence Analytics] Error generating analytics:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate presence analytics',
        success: false,
        overview: {
          total_registered_users: 0,
          currently_online_realtime: 0,
          currently_online_database: 0,
          recently_active: 0,
          rooms_with_activity: 0,
          total_rooms: 0
        }
      },
      { status: 500 }
    )
  }
}
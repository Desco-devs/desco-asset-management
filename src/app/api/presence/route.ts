import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/presence
 * Get current online users from both Supabase presence and database fallback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    const includeDatabase = searchParams.get('includeDatabase') === 'true'

    const supabase = createClient()
    
    // Get real-time presence data from Supabase
    let presenceUsers: any[] = []
    
    try {
      const channel = supabase.channel('presence-check')
      const presenceState = channel.presenceState()
      
      presenceUsers = Object.entries(presenceState).map(([userId, presences]) => {
        const presence = (presences as any[])[0] // Get latest presence
        return {
          user_id: userId,
          username: presence?.username || 'Unknown',
          full_name: presence?.full_name || 'Unknown User',
          user_profile: presence?.user_profile,
          room_id: presence?.room_id,
          last_seen: presence?.timestamp || new Date().toISOString(),
          source: 'realtime'
        }
      })
    } catch (error) {
      console.warn('[Presence API] Failed to get real-time presence:', error)
    }

    // Fallback to database if needed or requested
    let databaseUsers: any[] = []
    if (includeDatabase || presenceUsers.length === 0) {
      try {
        const onlineUsers = await prisma.user.findMany({
          where: {
            is_online: true,
            user_status: 'ACTIVE'
          },
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
            last_seen: true,
            is_online: true
          }
        })

        databaseUsers = onlineUsers.map(user => ({
          user_id: user.id,
          username: user.username,
          full_name: user.full_name,
          user_profile: user.user_profile,
          last_seen: user.last_seen?.toISOString() || new Date().toISOString(),
          source: 'database'
        }))
      } catch (error) {
        console.warn('[Presence API] Failed to get database presence:', error)
      }
    }

    // Combine and deduplicate users (prefer real-time data)
    const allUsers = [...presenceUsers]
    const realtimeUserIds = new Set(presenceUsers.map(u => u.user_id))
    
    databaseUsers.forEach(dbUser => {
      if (!realtimeUserIds.has(dbUser.user_id)) {
        allUsers.push(dbUser)
      }
    })

    // Filter by room if specified
    const filteredUsers = roomId 
      ? allUsers.filter(user => user.room_id === roomId)
      : allUsers

    return NextResponse.json({
      success: true,
      users: filteredUsers,
      count: filteredUsers.length,
      totalOnline: allUsers.length,
      sources: {
        realtime: presenceUsers.length,
        database: databaseUsers.length
      }
    })

  } catch (error) {
    console.error('[Presence API] Error fetching presence:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch presence data',
        users: [],
        count: 0,
        totalOnline: 0
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/presence
 * Update user presence status (database fallback)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, status, roomId } = body

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'userId and status are required' },
        { status: 400 }
      )
    }

    const isOnline = status === 'online'

    // Update database presence (as fallback)
    await prisma.user.update({
      where: { id: userId },
      data: {
        is_online: isOnline,
        last_seen: new Date()
      }
    })

    // Broadcast presence change via Supabase
    const supabase = createClient()
    
    try {
      await supabase
        .channel('presence-broadcast')
        .send({
          type: 'broadcast',
          event: 'presence_changed',
          payload: {
            user_id: userId,
            status: status,
            room_id: roomId,
            timestamp: new Date().toISOString()
          }
        })
    } catch (error) {
      console.warn('[Presence API] Failed to broadcast presence change:', error)
    }

    return NextResponse.json({
      success: true,
      status: status,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Presence API] Error updating presence:', error)
    return NextResponse.json(
      { error: 'Failed to update presence' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/presence
 * Set user offline (cleanup)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Update database
    await prisma.user.update({
      where: { id: userId },
      data: {
        is_online: false,
        last_seen: new Date()
      }
    })

    // Broadcast offline status
    const supabase = createClient()
    
    try {
      await supabase
        .channel('presence-broadcast')
        .send({
          type: 'broadcast',
          event: 'presence_changed',
          payload: {
            user_id: userId,
            status: 'offline',
            timestamp: new Date().toISOString()
          }
        })
    } catch (error) {
      console.warn('[Presence API] Failed to broadcast offline status:', error)
    }

    return NextResponse.json({
      success: true,
      status: 'offline',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Presence API] Error setting user offline:', error)
    return NextResponse.json(
      { error: 'Failed to set user offline' },
      { status: 500 }
    )
  }
}
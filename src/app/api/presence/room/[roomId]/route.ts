import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

interface RouteContext {
  params: Promise<{
    roomId: string
  }>
}

/**
 * GET /api/presence/room/[roomId]
 * Get online users in a specific room
 */
export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { roomId } = await params
    const { searchParams } = new URL(request.url)
    const includeDatabase = searchParams.get('includeDatabase') === 'true'

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      )
    }

    // Verify room exists and get member info
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
                is_online: true,
                last_seen: true
              }
            }
          }
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      )
    }

    const supabase = createClient()
    
    // Get real-time presence data
    let presenceUsers: any[] = []
    
    try {
      const channel = supabase.channel('room-presence-check')
      const presenceState = channel.presenceState()
      
      // Filter presence users by room and membership
      const roomMemberIds = new Set(room.members.map(m => m.user_id))
      
      presenceUsers = Object.entries(presenceState)
        .map(([userId, presences]) => {
          const presence = (presences as any[])[0]
          return {
            user_id: userId,
            username: presence?.username || 'Unknown',
            full_name: presence?.full_name || 'Unknown User',
            user_profile: presence?.user_profile,
            room_id: presence?.room_id,
            last_seen: presence?.timestamp || new Date().toISOString(),
            is_in_room: presence?.room_id === roomId,
            is_member: roomMemberIds.has(userId),
            source: 'realtime'
          }
        })
        .filter(user => user.is_member) // Only include room members
    } catch (error) {
      console.warn('[Room Presence API] Failed to get real-time presence:', error)
    }

    // Database fallback for room members
    let databaseUsers: any[] = []
    if (includeDatabase || presenceUsers.length === 0) {
      databaseUsers = room.members
        .filter(member => member.user.is_online)
        .map(member => ({
          user_id: member.user.id,
          username: member.user.username,
          full_name: member.user.full_name,
          user_profile: member.user.user_profile,
          last_seen: member.user.last_seen?.toISOString() || new Date().toISOString(),
          is_in_room: false, // Database doesn't track current room
          is_member: true,
          source: 'database'
        }))
    }

    // Combine and deduplicate (prefer real-time data)
    const allUsers = [...presenceUsers]
    const realtimeUserIds = new Set(presenceUsers.map(u => u.user_id))
    
    databaseUsers.forEach(dbUser => {
      if (!realtimeUserIds.has(dbUser.user_id)) {
        allUsers.push(dbUser)
      }
    })

    // Separate users currently in this room vs just online
    const usersInRoom = allUsers.filter(user => user.is_in_room)
    const onlineMembers = allUsers.filter(user => user.source === 'realtime' || user.source === 'database')

    return NextResponse.json({
      success: true,
      room: {
        id: roomId,
        name: room.name,
        type: room.type,
        member_count: room.members.length
      },
      presence: {
        users_in_room: usersInRoom,
        online_members: onlineMembers,
        counts: {
          in_room: usersInRoom.length,
          online_members: onlineMembers.length,
          total_members: room.members.length
        }
      },
      sources: {
        realtime: presenceUsers.length,
        database: databaseUsers.length
      }
    })

  } catch (error) {
    console.error('[Room Presence API] Error fetching room presence:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch room presence data',
        presence: {
          users_in_room: [],
          online_members: [],
          counts: { in_room: 0, online_members: 0, total_members: 0 }
        }
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/presence/room/[roomId]
 * Join/leave room presence
 */
export async function POST(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const { roomId } = await params
    const body = await request.json()
    const { userId, action } = body // action: 'join' | 'leave'

    if (!roomId || !userId || !action) {
      return NextResponse.json(
        { error: 'roomId, userId, and action are required' },
        { status: 400 }
      )
    }

    // Verify user is a member of the room
    const membership = await prisma.room_member.findUnique({
      where: {
        room_id_user_id: {
          room_id: roomId,
          user_id: userId
        }
      },
      include: {
        user: {
          select: {
            username: true,
            full_name: true,
            user_profile: true
          }
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this room' },
        { status: 403 }
      )
    }

    // Broadcast room presence change
    const supabase = createClient()
    
    try {
      const eventType = action === 'join' ? 'room_joined' : 'room_left'
      
      await supabase
        .channel('room-presence-broadcast')
        .send({
          type: 'broadcast',
          event: eventType,
          payload: {
            room_id: roomId,
            user_id: userId,
            username: membership.user.username,
            full_name: membership.user.full_name,
            user_profile: membership.user.user_profile,
            timestamp: new Date().toISOString()
          }
        })

      console.log(`📍 User ${action}ed room:`, { roomId, userId, action })
    } catch (error) {
      console.warn('[Room Presence API] Failed to broadcast room presence:', error)
    }

    return NextResponse.json({
      success: true,
      action: action,
      room_id: roomId,
      user_id: userId,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[Room Presence API] Error updating room presence:', error)
    return NextResponse.json(
      { error: 'Failed to update room presence' },
      { status: 500 }
    )
  }
}
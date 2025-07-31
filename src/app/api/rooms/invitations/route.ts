import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { InvitationStatus } from '@/types/chat-app'

/**
 * Room Invitations API
 * 
 * Handles creating, listing, and managing room invitations
 * following the REALTIME_PATTERN.md guidelines
 */

// GET /api/rooms/invitations - List invitations for current user
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'sent' or 'received'
    const status = searchParams.get('status') // Filter by status

    const where: any = {}
    
    if (type === 'sent') {
      where.invited_by = user.id
    } else {
      where.invited_user = user.id
    }

    if (status && Object.values(InvitationStatus).includes(status as InvitationStatus)) {
      where.status = status
    }

    const invitations = await prisma.room_invitation.findMany({
      where,
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            avatar_url: true,
          }
        },
        inviter: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          }
        },
        invitee: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    })

    return NextResponse.json({ invitations })
  } catch (error) {
    console.error('[API] Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

// POST /api/rooms/invitations - Create new invitation
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { room_id, invited_user, message } = await request.json()

    if (!room_id || !invited_user) {
      return NextResponse.json(
        { error: 'Room ID and invited user are required' },
        { status: 400 }
      )
    }

    // Verify room exists and user has permission to invite
    const room = await prisma.room.findFirst({
      where: {
        id: room_id,
        OR: [
          { owner_id: user.id },
          { 
            members: {
              some: { user_id: user.id }
            }
          }
        ]
      },
      include: {
        members: {
          select: { user_id: true }
        }
      }
    })

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found or no permission' },
        { status: 404 }
      )
    }

    // Check if user is already a member
    const isAlreadyMember = room.members.some(member => member.user_id === invited_user)
    if (isAlreadyMember) {
      return NextResponse.json(
        { error: 'User is already a member of this room' },
        { status: 400 }
      )
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.room_invitation.findFirst({
      where: {
        room_id,
        invited_user,
        status: InvitationStatus.PENDING
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'Invitation already pending for this user' },
        { status: 400 }
      )
    }

    // Verify invited user exists
    const invitedUserRecord = await prisma.user.findUnique({
      where: { id: invited_user },
      select: { id: true, username: true, full_name: true, user_profile: true }
    })

    if (!invitedUserRecord) {
      return NextResponse.json(
        { error: 'Invited user not found' },
        { status: 404 }
      )
    }

    // Create invitation
    const invitation = await prisma.room_invitation.create({
      data: {
        room_id,
        invited_by: user.id,
        invited_user,
        message: message || null,
        status: InvitationStatus.PENDING
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            avatar_url: true,
          }
        },
        inviter: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          }
        },
        invitee: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          }
        }
      }
    })

    // Broadcast invitation via Supabase realtime
    await supabase
      .channel('room-invitations')
      .send({
        type: 'broadcast',
        event: 'invitation_created',
        payload: {
          invitation,
          invited_user: invited_user
        }
      })

    return NextResponse.json({ 
      invitation,
      message: 'Invitation sent successfully' 
    })
  } catch (error) {
    console.error('[API] Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}
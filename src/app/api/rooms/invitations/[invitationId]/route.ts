import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { invitation_status } from '@prisma/client'

/**
 * Room Invitation Response API
 * 
 * Handles accepting/declining invitations and adding users to rooms
 */

// PATCH /api/rooms/invitations/[invitationId] - Accept/decline invitation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invitationId } = await params
    const { status } = await request.json()

    // Validate status
    if (!status || ![invitation_status.ACCEPTED, invitation_status.DECLINED].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be ACCEPTED or DECLINED' },
        { status: 400 }
      )
    }

    // Find invitation and verify ownership
    const invitation = await prisma.room_invitation.findFirst({
      where: {
        id: invitationId,
        invited_user: user.id,
        status: invitation_status.PENDING
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
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already responded' },
        { status: 404 }
      )
    }

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update invitation status
      const updatedInvitation = await tx.room_invitation.update({
        where: { id: invitationId },
        data: {
          status
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

      // If accepted, add user to room
      if (status === invitation_status.ACCEPTED) {
        // Check if already a member (edge case protection)
        const existingMember = await tx.room_member.findFirst({
          where: {
            room_id: invitation.room_id,
            user_id: user.id
          }
        })

        if (!existingMember) {
          await tx.room_member.create({
            data: {
              room_id: invitation.room_id,
              user_id: user.id
            }
          })
        }
      }

      return updatedInvitation
    })

    // Broadcast invitation response via Supabase realtime to multiple channels
    await Promise.all([
      supabase
        .channel('room-invitations')
        .send({
          type: 'broadcast',
          event: 'invitation_responded',
          payload: {
            invitation: result,
            status,
            room_id: invitation.room_id,
            invited_user: user.id
          }
        }),
      // Also broadcast to room membership channel for immediate room updates
      supabase
        .channel('room-membership-updates')
        .send({
          type: 'broadcast',
          event: 'invitation_responded',
          payload: {
            invitation: result,
            status,
            room_id: invitation.room_id,
            invited_user: user.id
          }
        })
    ])

    // If accepted, also broadcast room membership change
    if (status === invitation_status.ACCEPTED) {
      // Broadcast to both channels for compatibility
      await Promise.all([
        supabase
          .channel('chat-rooms')
          .send({
            type: 'broadcast',
            event: 'member_added',
            payload: {
              room_id: invitation.room_id,
              user_id: user.id,
              member: {
                id: user.id,
                username: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown',
                full_name: user.user_metadata?.full_name || 'Unknown User',
                user_profile: user.user_metadata?.user_profile
              }
            }
          }),
        supabase
          .channel('room-membership-updates')
          .send({
            type: 'broadcast',
            event: 'member_added',
            payload: {
              room_id: invitation.room_id,
              user_id: user.id,
              member: {
                id: user.id,
                username: user.user_metadata?.username || user.email?.split('@')[0] || 'Unknown',
                full_name: user.user_metadata?.full_name || 'Unknown User',
                user_profile: user.user_metadata?.user_profile
              }
            }
          })
      ])
    }

    return NextResponse.json({ 
      invitation: result,
      message: status === invitation_status.ACCEPTED 
        ? 'Invitation accepted! You have joined the room.' 
        : 'Invitation declined.'
    })
  } catch (error) {
    console.error('[API] Error responding to invitation:', error)
    return NextResponse.json(
      { error: 'Failed to respond to invitation' },
      { status: 500 }
    )
  }
}

// DELETE /api/rooms/invitations/[invitationId] - Cancel invitation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { invitationId } = await params

    // Find invitation and verify ownership (only inviter can cancel)
    const invitation = await prisma.room_invitation.findFirst({
      where: {
        id: invitationId,
        invited_by: user.id,
        status: invitation_status.PENDING
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or cannot be cancelled' },
        { status: 404 }
      )
    }

    // Update invitation to cancelled
    const cancelledInvitation = await prisma.room_invitation.update({
      where: { id: invitationId },
      data: {
        status: invitation_status.CANCELLED
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

    // Broadcast cancellation
    await supabase
      .channel('room-invitations')
      .send({
        type: 'broadcast',
        event: 'invitation_cancelled',
        payload: {
          invitation: cancelledInvitation,
          invited_user: invitation.invited_user
        }
      })

    return NextResponse.json({ 
      message: 'Invitation cancelled successfully' 
    })
  } catch (error) {
    console.error('[API] Error cancelling invitation:', error)
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    )
  }
}
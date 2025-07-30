import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.response || NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Verify user is a member of the room or owner
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: userId,
      },
      include: {
        room: {
          select: {
            owner_id: true,
          },
        },
      },
    });

    if (!roomMember) {
      return NextResponse.json(
        { error: 'You are not a member of this room' },
        { status: 403 }
      );
    }

    // Get pending invitations for this room with full user details
    const invitations = await prisma.room_invitation.findMany({
      where: {
        room_id: roomId,
        status: 'PENDING',
      },
      include: {
        invitee: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
        inviter: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      invitations: invitations.map(invitation => ({
        id: invitation.id,
        invited_user: invitation.invited_user,
        invited_by: invitation.invited_by,
        status: invitation.status,
        message: invitation.message,
        created_at: invitation.created_at,
        invitee: invitation.invitee,
        inviter: invitation.inviter,
      })),
    });

  } catch (error) {
    console.error('Error fetching room invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room invitations' },
      { status: 500 }
    );
  }
}
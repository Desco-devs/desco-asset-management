// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD

import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  return NextResponse.json(
    { error: "Chat app temporarily disabled" },
    { status: 503 }
  );
}

/*
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Get pending invitations for this room
    const invitations = await prisma.room_invitation.findMany({
      where: {
        room_id: roomId,
        status: 'PENDING',
      },
      select: {
        id: true,
        invited_user: true,
        invited_by: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      invitations,
    });

  } catch (error) {
    console.error('Error fetching room invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room invitations' },
      { status: 500 }
    );
  }
}
*/
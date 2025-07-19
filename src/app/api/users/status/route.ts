import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, isOnline, lastSeen } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Update user online status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        is_online: isOnline,
        last_seen: lastSeen ? new Date(lastSeen) : new Date(),
      },
      select: {
        id: true,
        is_online: true,
        last_seen: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
    });

  } catch (error) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { error: 'Failed to update user status' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIds = searchParams.get('userIds')?.split(',') || [];

    if (userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs are required' },
        { status: 400 }
      );
    }

    // Get online status for multiple users
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        is_online: true,
        last_seen: true,
      },
    });

    return NextResponse.json({
      success: true,
      users,
    });

  } catch (error) {
    console.error('Error fetching user statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user statuses' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, status } = body;

    if (!userId || !status) {
      return NextResponse.json(
        { error: 'UserId and status are required' },
        { status: 400 }
      );
    }

    const isOnline = status === 'online';
    
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        is_online: isOnline,
        last_seen: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      status: isOnline ? 'online' : 'offline',
    });

  } catch (error) {
    console.error('Error updating online status:', error);
    return NextResponse.json(
      { error: 'Failed to update online status' },
      { status: 500 }
    );
  }
}
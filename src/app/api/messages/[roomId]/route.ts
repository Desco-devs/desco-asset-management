import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from "@/lib/prisma";

/**
 * Messages API with Cursor-based Pagination
 * 
 * Supports efficient pagination for large chat histories
 * Following REALTIME_PATTERN.md guidelines
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { roomId } = await params;
    
    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Parse query parameters for pagination
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') // Message ID to start from
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100) // Max 100 messages
    const direction = searchParams.get('direction') || 'older' // 'older' or 'newer'

    // Verify user has access to room
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: user.id
      }
    })

    if (!roomMember) {
      return NextResponse.json(
        { error: "Access denied to this room" },
        { status: 403 }
      )
    }

    // Build where clause for cursor-based pagination
    const where: any = {
      room_id: roomId,
    }

    if (cursor) {
      if (direction === 'older') {
        where.created_at = { lt: new Date(cursor) }
      } else {
        where.created_at = { gt: new Date(cursor) }
      }
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            type: true,
          }
        }
      },
      orderBy: {
        created_at: direction === 'older' ? 'desc' : 'asc',
      },
      take: limit + 1, // Get one extra to check if there are more
    });

    // Check if there are more messages
    const hasMore = messages.length > limit
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages

    // For older messages, reverse to show chronological order
    if (direction === 'older') {
      messagesToReturn.reverse()
    }

    // Calculate next cursor
    let nextCursor: string | null = null
    if (hasMore && messagesToReturn.length > 0) {
      const lastMessage = direction === 'older' 
        ? messagesToReturn[0] // Oldest message for loading more older messages
        : messagesToReturn[messagesToReturn.length - 1] // Newest for loading newer
      nextCursor = lastMessage.created_at.toISOString()
    }

    return NextResponse.json({
      messages: messagesToReturn,
      has_more: hasMore,
      next_cursor: nextCursor,
      direction,
      total_returned: messagesToReturn.length
    });

  } catch (error) {
    console.error("[API] Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
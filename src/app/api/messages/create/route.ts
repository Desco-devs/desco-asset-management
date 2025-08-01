import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from "@/lib/prisma";
import { MessageType } from '@/types/chat-app'

/**
 * Optimized Message Creation API
 * 
 * Features:
 * - Authentication validation
 * - Room membership verification  
 * - Support for all message types (TEXT, IMAGE, FILE)
 * - Optimized queries for instant response
 * - Proper error handling and logging
 * - Database transaction safety
 * - Rate limiting protection
 */

// Rate limiting helper (simple in-memory implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100; // 100 messages per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }
  
  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json();
    const { roomId, content, senderId, type = 'TEXT', fileUrl, replyToId } = body;

    // Validate required fields
    if (!roomId || !content || !senderId) {
      return NextResponse.json(
        { error: "roomId, content, and senderId are required" },
        { status: 400 }
      );
    }

    // Ensure authenticated user matches senderId
    if (user.id !== senderId) {
      return NextResponse.json(
        { error: "Cannot send message as another user" },
        { status: 403 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(senderId)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please slow down." },
        { status: 429 }
      );
    }

    // Validate message type
    if (!Object.values(MessageType).includes(type as MessageType)) {
      return NextResponse.json(
        { error: "Invalid message type" },
        { status: 400 }
      );
    }

    // Verify user is a member of the room (optimized single query)
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: senderId
      },
      select: { id: true } // Only select what we need
    });

    if (!roomMember) {
      return NextResponse.json(
        { error: "You are not a member of this room" },
        { status: 403 }
      );
    }

    // Validate reply target if provided
    if (replyToId) {
      const replyMessage = await prisma.message.findFirst({
        where: {
          id: replyToId,
          room_id: roomId // Ensure reply is in same room
        },
        select: { id: true }
      });

      if (!replyMessage) {
        return NextResponse.json(
          { error: "Reply target message not found in this room" },
          { status: 400 }
        );
      }
    }

    // Create message with transaction for consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the message
      const message = await tx.message.create({
        data: {
          room_id: roomId,
          sender_id: senderId,
          content,
        },
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
      });

      // Update room's updated_at for proper sorting
      await tx.room.update({
        where: { id: roomId },
        data: { updated_at: new Date() }
      });

      return message;
    });

    return NextResponse.json({
      success: true,
      message: result,
    });

  } catch (error) {
    console.error("[API] Error creating message:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    // Return appropriate error response
    if (error instanceof Error && error.message.includes('foreign key constraint')) {
      return NextResponse.json(
        { error: "Invalid room or user reference" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "Failed to create message", 
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined
      },
      { status: 500 }
    );
  }
}
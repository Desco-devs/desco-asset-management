import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

// Validation schema for sending messages
const sendMessageSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  content: z.string().min(1, "Content is required").max(2000, "Content too long"),
  type: z.enum(["TEXT", "IMAGE", "FILE", "SYSTEM"]).default("TEXT"),
  replyToId: z.string().uuid().optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Create Supabase client for authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // No-op for request handling
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);
    const { roomId, content, type, replyToId, fileUrl } = validatedData;

    // Verify user is a member of the room
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: user.id,
      },
    });

    if (!roomMember) {
      return NextResponse.json(
        { error: "You are not a member of this room" },
        { status: 403 }
      );
    }

    // If replying to a message, verify it exists and is in the same room
    if (replyToId) {
      const replyToMessage = await prisma.message.findFirst({
        where: {
          id: replyToId,
          room_id: roomId,
        },
      });

      if (!replyToMessage) {
        return NextResponse.json(
          { error: "Reply target message not found" },
          { status: 400 }
        );
      }
    }

    // Create the message with transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the message
      const message = await tx.message.create({
        data: {
          room_id: roomId,
          sender_id: user.id,
          content: content.trim(),
          type,
          reply_to_id: replyToId || null,
          file_url: fileUrl || null,
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
            },
          },
          reply_to: {
            select: {
              id: true,
              content: true,
              sender: {
                select: {
                  id: true,
                  username: true,
                  full_name: true,
                },
              },
            },
          },
        },
      });

      // Update room's updated_at timestamp for sorting
      await tx.room.update({
        where: { id: roomId },
        data: { updated_at: new Date() },
      });

      return message;
    });

    // Broadcast the new message to all room members via Supabase realtime
    try {
      const channel = supabase.channel(`room_${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'message_event',
        payload: {
          message: result,
          event_type: 'message_sent',
          room_id: roomId,
          sender_id: user.id,
        },
      });
      
      console.log(`Message broadcasted to room: ${roomId}`);
    } catch (broadcastError) {
      console.error('Error broadcasting message:', broadcastError);
      // Don't fail the request if broadcast fails, just log the error
    }

    return NextResponse.json({
      success: true,
      message: result,
    });

  } catch (error) {
    console.error("Error sending message:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
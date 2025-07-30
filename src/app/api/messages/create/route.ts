import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/prisma";
import { ChatQueries } from "@/lib/database/chat-queries";
import { createMessageSchema } from "@/lib/validations/chat";
import { z } from "zod";

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
    const validatedData = createMessageSchema.parse(body);
    const { roomId, content, type, replyToId, fileUrl } = validatedData;

    // Verify user is a member of the room
    const roomMember = await ChatQueries.verifyRoomMembership(roomId, user.id);

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

    // Create the message with optimized transaction
    const message = await ChatQueries.createMessage({
      roomId,
      senderId: user.id,
      content,
      type,
      replyToId,
      fileUrl,
    });

    // TODO: Replace with Supabase realtime broadcast
    // supabase.channel(`room:${roomId}`).send({
    //   type: 'broadcast',
    //   event: 'message:new',
    //   payload: message
    // });

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error("Error creating message:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create message" },
      { status: 500 }
    );
  }
}
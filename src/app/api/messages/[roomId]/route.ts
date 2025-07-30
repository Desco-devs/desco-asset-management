import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ChatQueries } from "@/lib/database/chat-queries";
import { messagesPaginationSchema } from "@/lib/validations/chat";
import { z } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
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

    const { searchParams } = new URL(request.url);
    const { roomId } = await params;

    // Validate roomId
    if (!roomId || !z.string().uuid().safeParse(roomId).success) {
      return NextResponse.json(
        { error: "Invalid room ID" },
        { status: 400 }
      );
    }

    // Validate query parameters
    const queryParams = {
      cursor: searchParams.get("cursor") || undefined,
      limit: searchParams.get("limit") || "50",
      includeReplies: searchParams.get("includeReplies") !== "false",
    };

    const validatedQuery = messagesPaginationSchema.parse(queryParams);
    const { cursor, limit, includeReplies } = validatedQuery;

    // Verify user is a member of the room and get room info
    const roomMember = await ChatQueries.verifyRoomMembership(roomId, user.id);

    if (!roomMember) {
      return NextResponse.json(
        { error: "You are not a member of this room" },
        { status: 403 }
      );
    }

    // Get messages with optimized pagination
    const { messages, hasMore, nextCursor } = await ChatQueries.getMessages({
      roomId,
      cursor,
      limit,
      includeReplies,
    });

    // Update user's last read timestamp for this room
    await ChatQueries.markMessagesAsRead(roomId, user.id);

    return NextResponse.json({
      messages,
      hasMore,
      nextCursor,
      room: roomMember.room,
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
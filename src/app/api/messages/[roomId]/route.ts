// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD

import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

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
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "50");

    const { roomId } = await params;

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: "Missing roomId or userId parameter" },
        { status: 400 }
      );
    }

    // Verify user is a member of the room
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: userId,
      },
    });

    if (!roomMember) {
      return NextResponse.json(
        { error: "You are not a member of this room" },
        { status: 403 }
      );
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: {
        room_id: roomId,
        ...(cursor && {
          created_at: {
            lt: new Date(cursor),
          },
        }),
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
      },
      orderBy: {
        created_at: "desc",
      },
      take: limit,
    });

    // Check if there are more messages
    const hasMore = messages.length === limit;
    const nextCursor = hasMore ? messages[messages.length - 1].created_at.toISOString() : null;

    // Return messages in chronological order (oldest first)
    const reversedMessages = messages.reverse();

    return NextResponse.json({
      messages: reversedMessages,
      hasMore,
      nextCursor,
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
*/
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    
    if (!roomId) {
      return NextResponse.json(
        { error: "Room ID is required" },
        { status: 400 }
      );
    }

    // Get messages for the room
    const messages = await prisma.message.findMany({
      where: {
        room_id: roomId,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            full_name: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      messages: messages.reverse(), // Show oldest first
    });

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}
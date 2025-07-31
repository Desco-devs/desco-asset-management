import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, content, senderId } = body;

    if (!roomId || !content || !senderId) {
      return NextResponse.json(
        { error: "RoomId, content, and senderId are required" },
        { status: 400 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
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
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error("Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to create message", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
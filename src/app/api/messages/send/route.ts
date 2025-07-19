import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomId, content, senderId, type = "TEXT" } = body;

    if (!roomId || !content || !senderId) {
      return NextResponse.json(
        { error: "Missing required fields: roomId, content, or senderId" },
        { status: 400 }
      );
    }

    // Verify user is a member of the room
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: senderId,
      },
    });

    if (!roomMember) {
      return NextResponse.json(
        { error: "You are not a member of this room" },
        { status: 403 }
      );
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        room_id: roomId,
        sender_id: senderId,
        content: content.trim(),
        type,
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
    });

    // Update room's updated_at timestamp for sorting
    await prisma.room.update({
      where: { id: roomId },
      data: { updated_at: new Date() },
    });

    // TODO: Emit socket event for real-time updates
    // if (global.io) {
    //   global.io.to(`room:${roomId}`).emit('message:new', message);
    // }

    return NextResponse.json({
      success: true,
      message,
    });

  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
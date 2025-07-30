import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type = "GROUP", ownerId } = body;

    if (!name || !ownerId) {
      return NextResponse.json(
        { error: "Name and ownerId are required" },
        { status: 400 }
      );
    }

    // Create room
    const room = await prisma.room.create({
      data: {
        name,
        type,
        owner_id: ownerId,
      },
    });

    // Add owner as member
    await prisma.room_member.create({
      data: {
        room_id: room.id,
        user_id: ownerId,
      },
    });

    return NextResponse.json({
      success: true,
      room,
    });

  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
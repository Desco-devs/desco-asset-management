import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type = "GROUP", ownerId } = body;

    console.log("=== ROOM CREATION REQUEST ===");
    console.log("Name:", name);
    console.log("Type:", type);
    console.log("Owner ID:", ownerId);
    console.log("Timestamp:", new Date().toISOString());

    if (!name || !ownerId) {
      return NextResponse.json(
        { error: "Name and ownerId are required" },
        { status: 400 }
      );
    }

    // Check if a room with the same name already exists for this owner
    const existingRoom = await prisma.room.findFirst({
      where: {
        name: name.trim(),
        owner_id: ownerId,
      },
    });

    if (existingRoom) {
      return NextResponse.json(
        { error: "A room with this name already exists" },
        { status: 409 }
      );
    }

    // Use transaction to ensure atomicity and prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Double-check for existing room within transaction
      const existingRoomInTx = await tx.room.findFirst({
        where: {
          name: name.trim(),
          owner_id: ownerId,
        },
      });

      if (existingRoomInTx) {
        throw new Error("A room with this name already exists");
      }

      // Create room
      const room = await tx.room.create({
        data: {
          name: name.trim(),
          type,
          owner_id: ownerId,
        },
      });

      // Add owner as member (simple create since trigger is removed)
      const roomMember = await tx.room_member.create({
        data: {
          room_id: room.id,
          user_id: ownerId,
        },
      });

      return { room, roomMember };
    });

    const { room } = result;

    return NextResponse.json({
      success: true,
      room,
    });

  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
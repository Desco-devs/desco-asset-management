// CHAT APP TEMPORARILY DISABLED FOR PRODUCTION BUILD

import { NextRequest, NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

export async function DELETE(
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    console.log("DELETE API - Received roomId:", roomId, "userId:", userId);

    if (!roomId || !userId) {
      return NextResponse.json(
        { error: "Missing roomId or userId parameter" },
        { status: 400 }
      );
    }

    // Verify user is a member of the room (and has permission to delete)
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: userId,
      },
      include: {
        room: {
          select: {
            owner_id: true,
            type: true,
          },
        },
      },
    });

    if (!roomMember) {
      return NextResponse.json(
        { error: "You are not a member of this room" },
        { status: 403 }
      );
    }

    // Check if user has permission to delete the room
    // For DIRECT rooms, any member can delete
    // For GROUP rooms, only the owner can delete
    if (roomMember.room.type === "GROUP" && roomMember.room.owner_id !== userId) {
      return NextResponse.json(
        { error: "Only the room owner can delete group rooms" },
        { status: 403 }
      );
    }

    // Get all room members before deletion for socket notification
    const roomMembers = await prisma.room_member.findMany({
      where: { room_id: roomId },
      select: { user_id: true },
    });

    // Delete room and all related data (cascade should handle this)
    // Order matters due to foreign key constraints
    
    // Delete messages first
    await prisma.message.deleteMany({
      where: { room_id: roomId },
    });

    // Delete room members
    await prisma.room_member.deleteMany({
      where: { room_id: roomId },
    });

    // Delete room invitations
    await prisma.room_invitation.deleteMany({
      where: { room_id: roomId },
    });

    // Finally delete the room
    await prisma.room.delete({
      where: { id: roomId },
    });

    // Emit socket event for real-time updates
    if (global.io) {
      // Notify all room members about deletion
      roomMembers.forEach((member) => {
        global.io?.to(`user:${member.user_id}`).emit('room:deleted', {
          roomId: roomId,
          deletedBy: userId,
        });
      });
    }

    return NextResponse.json({
      success: true,
      message: "Room deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Failed to delete room" },
      { status: 500 }
    );
  }
}
*/
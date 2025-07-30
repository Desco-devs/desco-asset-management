import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth/api-auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.response || NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = authResult.user.id;

    if (!roomId) {
      return NextResponse.json(
        { error: "Missing roomId parameter" },
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

    // Get all room members before deletion for potential notifications
    const roomMembers = await prisma.room_member.findMany({
      where: { room_id: roomId },
      select: { user_id: true },
    });

    // Delete room using transaction - cascade will handle related data
    await prisma.$transaction(async (tx) => {
      // The schema has onDelete: Cascade, so deleting the room will automatically 
      // delete related messages, invitations, and members
      await tx.room.delete({
        where: { id: roomId },
      });
    });

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
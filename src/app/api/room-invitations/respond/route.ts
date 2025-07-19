import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitationId, userId, action } = body;

    if (!invitationId || !userId || !action) {
      return NextResponse.json(
        { error: "Missing required fields: invitationId, userId, or action" },
        { status: 400 }
      );
    }

    if (!["ACCEPTED", "DECLINED"].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be ACCEPTED or DECLINED" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find the invitation
      const invitation = await tx.room_invitation.findFirst({
        where: {
          id: invitationId,
          invited_user: userId,
          status: "PENDING",
        },
        include: {
          room: true,
        },
      });

      if (!invitation) {
        throw new Error("Invitation not found or already responded to");
      }

      // Update invitation status
      const updatedInvitation = await tx.room_invitation.update({
        where: { id: invitationId },
        data: { 
          status: action,
          responded_at: new Date(),
        },
      });

      // If accepted, add user to room members
      if (action === "ACCEPTED") {
        await tx.room_member.create({
          data: {
            room_id: invitation.room_id,
            user_id: userId,
          },
        });
      }

      // If declined and it's a DIRECT room, delete the room entirely
      if (action === "DECLINED" && invitation.room.type === "DIRECT") {
        // Delete all messages in the room
        await tx.message.deleteMany({
          where: { room_id: invitation.room_id },
        });

        // Delete all room members (the inviter)
        await tx.room_member.deleteMany({
          where: { room_id: invitation.room_id },
        });

        // Delete all invitations for this room
        await tx.room_invitation.deleteMany({
          where: { room_id: invitation.room_id },
        });

        // Delete the room itself
        await tx.room.delete({
          where: { id: invitation.room_id },
        });

        return { invitation: updatedInvitation, room: invitation.room, roomDeleted: true };
      }

      return { invitation: updatedInvitation, room: invitation.room };
    });

    // Emit socket events for real-time updates
    if (global.io) {
      // If room was deleted due to decline, notify the inviter
      if (result.roomDeleted) {
        global.io.to(`user:${result.room.owner_id}`).emit('room:deleted', {
          roomId: result.room.id,
          deletedBy: userId, // The user who declined
          reason: 'invitation_declined'
        });
      } else {
        // Normal invitation response
        global.io.emit('invitation:responded', {
          invitationId: result.invitation.id,
          userId,
          action,
          room: result.room,
        });
      }
    }

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      room: result.room,
      roomDeleted: result.roomDeleted || false,
    });

  } catch (error) {
    console.error("Error responding to invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}
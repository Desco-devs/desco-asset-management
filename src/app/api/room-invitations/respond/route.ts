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

      return { invitation: updatedInvitation, room: invitation.room };
    });

    // TODO: Emit socket event for real-time updates when socket is properly initialized
    // if (global.io) {
    //   global.io.emit('invitation:responded', {
    //     invitationId: result.invitation.id,
    //     userId,
    //     action,
    //     room: result.room,
    //   });
    // }

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      room: result.room,
    });

  } catch (error) {
    console.error("Error responding to invitation:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}
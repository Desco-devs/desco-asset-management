import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      type, 
      ownerId, 
      invitedUsers = [], 
      inviteUsername 
    } = body;

    if (!name || !type || !ownerId) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, or ownerId" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the room
      const room = await tx.room.create({
        data: {
          name,
          description,
          type,
          owner_id: ownerId,
        },
      });

      // Add room owner as a member
      await tx.room_member.create({
        data: {
          room_id: room.id,
          user_id: ownerId,
        },
      });

      // Handle different invitation methods
      const invitations = [];

      // Invite selected users
      for (const user of invitedUsers) {
        if (user.id !== ownerId) {
          const invitation = await tx.room_invitation.create({
            data: {
              room_id: room.id,
              invited_by: ownerId,
              invited_user: user.id,
              status: "PENDING",
            },
          });
          invitations.push(invitation);
        }
      }

      // Handle username invitation
      if (inviteUsername) {
        const existingUser = await tx.user.findFirst({
          where: { username: inviteUsername },
        });

        if (existingUser && existingUser.id !== ownerId) {
          const invitation = await tx.room_invitation.create({
            data: {
              room_id: room.id,
              invited_by: ownerId,
              invited_user: existingUser.id,
              status: "PENDING",
            },
          });
          invitations.push(invitation);
        }
      }

      return { room, invitations };
    });

    // TODO: Emit socket event for real-time updates when socket is properly initialized
    // if (global.io) {
    //   global.io.emit('room:created', {
    //     room: result.room,
    //     invitations: result.invitations,
    //     creatorId: ownerId,
    //   });
    // }

    return NextResponse.json({
      success: true,
      room: result.room,
      invitations: result.invitations,
    });

  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Failed to create room" },
      { status: 500 }
    );
  }
}
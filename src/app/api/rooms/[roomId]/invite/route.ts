import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/auth/api-auth";

export async function POST(
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

    const inviterId = authResult.user.id;
    const body = await request.json();
    const { invitedUsers, inviteUsername, inviteEmail } = body;

    if (!roomId) {
      return NextResponse.json(
        { error: "Missing roomId" },
        { status: 400 }
      );
    }

    if (!invitedUsers?.length && !inviteUsername && !inviteEmail) {
      return NextResponse.json(
        { error: "No users to invite" },
        { status: 400 }
      );
    }

    // Verify the inviter is a member of the room
    const roomMember = await prisma.room_member.findFirst({
      where: {
        room_id: roomId,
        user_id: inviterId,
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            owner_id: true,
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

    // Only allow inviting to GROUP rooms
    if (roomMember.room.type !== "GROUP") {
      return NextResponse.json(
        { error: "Can only invite users to group rooms" },
        { status: 400 }
      );
    }

    // Only allow room owners to invite new users
    if (roomMember.room.owner_id !== inviterId) {
      return NextResponse.json(
        { error: "Only room owners can invite new users" },
        { status: 403 }
      );
    }

    const invitations = [];
    let usersToInvite = invitedUsers || [];

    // If inviting by username, find the user
    if (inviteUsername) {
      const userByUsername = await prisma.user.findFirst({
        where: {
          username: inviteUsername,
        },
        select: {
          id: true,
          username: true,
          full_name: true,
          user_profile: true,
        },
      });

      if (userByUsername) {
        usersToInvite.push(userByUsername);
      } else {
        return NextResponse.json(
          { error: `User with username "${inviteUsername}" not found` },
          { status: 404 }
        );
      }
    }

    // If inviting by email, find the user (assuming email is stored in username field)
    if (inviteEmail) {
      const userByEmail = await prisma.user.findFirst({
        where: {
          username: inviteEmail,
        },
        select: {
          id: true,
          username: true,
          full_name: true,
          user_profile: true,
        },
      });

      if (userByEmail) {
        usersToInvite.push(userByEmail);
      } else {
        return NextResponse.json(
          { error: `User with email "${inviteEmail}" not found` },
          { status: 404 }
        );
      }
    }

    // Create invitations for each user
    for (const user of usersToInvite) {
      // Check if user is already a member
      const existingMember = await prisma.room_member.findFirst({
        where: {
          room_id: roomId,
          user_id: user.id,
        },
      });

      if (existingMember) {
        continue; // Skip if already a member
      }

      // Check if there's already a pending invitation
      const existingInvitation = await prisma.room_invitation.findFirst({
        where: {
          room_id: roomId,
          invited_user: user.id,
          status: "PENDING",
        },
      });

      if (existingInvitation) {
        continue; // Skip if already invited
      }

      // Create the invitation
      const invitation = await prisma.room_invitation.create({
        data: {
          room_id: roomId,
          invited_user: user.id,
          invited_by: inviterId,
          status: "PENDING",
        },
        include: {
          room: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          inviter: {
            select: {
              id: true,
              username: true,
              full_name: true,
              user_profile: true,
            },
          },
        },
      });

      invitations.push(invitation);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully invited ${invitations.length} user(s) to the room`,
      invitations,
    });

  } catch (error) {
    console.error("Error inviting users to room:", error);
    return NextResponse.json(
      { error: "Failed to invite users to room" },
      { status: 500 }
    );
  }
}
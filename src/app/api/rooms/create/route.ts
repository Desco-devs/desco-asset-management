import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { ChatQueries } from "@/lib/database/chat-queries";
import { createRoomSchema } from "@/lib/validations/chat";

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return authResult.response || NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createRoomSchema.parse(body);
    
    const { 
      name, 
      description, 
      type, 
      avatarUrl,
      invitedUsers = [], 
      inviteUsername 
    } = validatedData;

    // Use authenticated user as owner
    const ownerId = authResult.user.id;

    // Prepare member IDs for room creation
    const memberIds = invitedUsers.map(user => user.id);
    
    // Handle username invitation
    if (inviteUsername) {
      // This would need to be handled separately as we need to look up the user
      // For now, we'll skip this optimization and handle it in the transaction
    }

    // Create room with optimized transaction
    const room = await ChatQueries.createRoom({
      name,
      description,
      type,
      ownerId,
      avatarUrl,
      memberIds: type === 'DIRECT' ? memberIds : [], // Only add members directly for DIRECT rooms
    });

    const invitations = [];

    // For GROUP rooms, create invitations
    if (type === 'GROUP' && invitedUsers.length > 0) {
      // This would need to be implemented in ChatQueries for full optimization
      // For now, keeping the existing invitation logic
      for (const user of invitedUsers) {
        if (user.id !== ownerId) {
          const invitation = await prisma.room_invitation.create({
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
    }

    const result = { room, invitations };

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
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    // Get rooms where user is already a member
    const memberRooms = await prisma.room.findMany({
      where: {
        members: {
          some: {
            user_id: userId,
          },
        },
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
                user_status: true,
                role: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            created_at: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: [
        {
          messages: {
            _count: "desc",
          },
        },
        {
          updated_at: "desc",
        },
      ],
    });

    // Get pending invitations for this user
    const pendingInvitations = await prisma.room_invitation.findMany({
      where: {
        invited_user: userId,
        status: "PENDING",
      },
      include: {
        room: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    full_name: true,
                    user_profile: true,
                    user_status: true,
                    role: true,
                  },
                },
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
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

    // Calculate unread counts for each room
    const roomsWithUnreadCount = await Promise.all(
      memberRooms.map(async (room) => {
        // Find current user's membership to get last_read timestamp
        const userMembership = room.members.find(member => member.user_id === userId);
        const lastRead = userMembership?.last_read || new Date(0);
        
        // Count unread messages (messages after last_read that weren't sent by current user)
        const unreadCount = await prisma.message.count({
          where: {
            room_id: room.id,
            created_at: {
              gt: lastRead,
            },
            sender_id: {
              not: userId,
            },
          },
        });
        
        return { ...room, unread_count: unreadCount };
      })
    );

    // Transform member rooms to RoomListItem format
    const transformedMemberRooms = roomsWithUnreadCount.map((room) => {
      const lastMessage = room.messages[0];
      
      // For DIRECT rooms, display name should be the other participant's name
      let displayName = room.name;
      let displayAvatarUrl = room.avatar_url;
      
      if (room.type === 'DIRECT') {
        // Find the other participant (not the current user)
        const otherParticipant = room.members.find(member => member.user_id !== userId);
        if (otherParticipant) {
          displayName = otherParticipant.user.full_name;
          displayAvatarUrl = otherParticipant.user.user_profile || room.avatar_url;
        }
      }
      
      return {
        id: room.id,
        name: displayName,
        description: room.description,
        type: room.type,
        avatar_url: displayAvatarUrl,
        owner_id: room.owner_id, // Add owner_id
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender_name: lastMessage.sender.full_name,
          created_at: lastMessage.created_at,
          type: lastMessage.type,
        } : null,
        unread_count: room.unread_count,
        is_owner: room.owner_id === userId,
        member_count: room._count.members,
        created_at: room.created_at,
        updated_at: room.updated_at,
        owner: room.owner,
        members: room.members.map(member => ({
          ...member,
          user: member.user,
        })),
      };
    });

    // Transform pending invitations to RoomListItem format
    const transformedInvitations = pendingInvitations.map((invitation) => {
      const room = invitation.room;
      
      // For DIRECT rooms, display name should be the inviter's name (the other participant)
      let displayName = room.name;
      let displayAvatarUrl = room.avatar_url;
      
      if (room.type === 'DIRECT') {
        // For pending invitations, the other participant is the inviter
        displayName = invitation.inviter.full_name;
        displayAvatarUrl = invitation.inviter.user_profile || room.avatar_url;
      }
      
      return {
        id: room.id,
        name: displayName,
        description: room.description,
        type: room.type,
        avatar_url: displayAvatarUrl,
        lastMessage: null, // No messages accessible until accepted
        unread_count: 0,
        is_owner: room.owner_id === userId,
        member_count: room._count.members,
        created_at: room.created_at,
        updated_at: room.updated_at,
        // Invitation specific fields
        invitation_status: invitation.status,
        invitation_id: invitation.id,
        invited_by: invitation.inviter,
        owner: room.owner,
        members: room.members.map(member => ({
          ...member,
          user: member.user,
        })),
      };
    });

    // Combine member rooms and pending invitations
    // Sort by updated_at with invitations appearing first
    const allRooms = [
      ...transformedInvitations.map(room => ({ ...room, priority: 1 })),
      ...transformedMemberRooms.map(room => ({ ...room, priority: 2 }))
    ].sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }).map(({ priority, ...room }) => room);

    return NextResponse.json(allRooms);

  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
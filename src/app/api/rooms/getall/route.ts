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

    const rooms = await prisma.room.findMany({
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
            messages: {
              where: {
                created_at: {
                  gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
                sender_id: {
                  not: userId,
                },
                // TODO: Add read status when implemented
              },
            },
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

    // Transform the data to match the RoomListItem interface
    const transformedRooms = rooms.map((room) => {
      const lastMessage = room.messages[0];
      const currentUserMember = room.members.find(m => m.user_id === userId);

      return {
        id: room.id,
        name: room.name,
        description: room.description,
        type: room.type,
        avatar_url: room.avatar_url,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender_name: lastMessage.sender.full_name,
          created_at: lastMessage.created_at,
          type: lastMessage.type,
        } : null,
        unread_count: room._count.messages,
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

    return NextResponse.json(transformedRooms);

  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
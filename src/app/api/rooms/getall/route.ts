import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "UserId is required" },
        { status: 400 }
      );
    }

    // Get rooms where user is a member
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
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            created_at: 'desc',
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
      },
      orderBy: {
        updated_at: 'desc',
      },
    });

    const transformedRooms = rooms.map((room) => {
      const lastMessage = room.messages[0];
      
      return {
        id: room.id,
        name: room.name,
        type: room.type,
        owner_id: room.owner_id,
        lastMessage: lastMessage ? {
          content: lastMessage.content,
          sender_name: lastMessage.sender.full_name,
          created_at: lastMessage.created_at,
        } : null,
        is_owner: room.owner_id === userId,
        member_count: room.members.length,
        created_at: room.created_at,
        updated_at: room.updated_at,
        owner: room.owner,
        members: room.members,
      };
    });

    return NextResponse.json({ rooms: transformedRooms });

  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Failed to fetch rooms" },
      { status: 500 }
    );
  }
}
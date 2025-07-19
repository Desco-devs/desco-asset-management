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

    const invitations = await prisma.room_invitation.findMany({
      where: {
        invited_user: userId,
        status: "PENDING",
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            created_at: true,
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
        invitee: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return NextResponse.json(invitations);

  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";

// Validation schema for query parameters
const getInvitationsQuerySchema = z.object({
  status: z.enum(["PENDING", "ACCEPTED", "DECLINED", "CANCELLED"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function GET(request: NextRequest) {
  try {
    // Create Supabase client for authentication
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // No-op for request handling
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters
    const queryParams = {
      status: searchParams.get("status") || undefined,
      limit: searchParams.get("limit") || "50",
      offset: searchParams.get("offset") || "0",
    };

    const validatedQuery = getInvitationsQuerySchema.parse(queryParams);
    const { status, limit, offset } = validatedQuery;

    // Get invitations for the authenticated user
    const invitations = await prisma.room_invitation.findMany({
      where: {
        invited_user: user.id,
        ...(status && { status }),
      },
      include: {
        room: {
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            avatar_url: true,
            created_at: true,
            owner: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
              },
            },
            _count: {
              select: {
                members: true,
                messages: true,
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
      skip: offset,
      take: limit,
    });

    // Get total count for pagination
    const totalCount = await prisma.room_invitation.count({
      where: {
        invited_user: user.id,
        ...(status && { status }),
      },
    });

    const hasMore = offset + limit < totalCount;

    return NextResponse.json({
      invitations,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore,
      },
    });

  } catch (error) {
    console.error("Error fetching invitations:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}
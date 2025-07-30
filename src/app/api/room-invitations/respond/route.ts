import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ChatQueries } from "@/lib/database/chat-queries";
import { respondToInvitationSchema } from "@/lib/validations/chat";
import { z } from "zod";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = respondToInvitationSchema.parse(body);
    const { invitationId, action } = validatedData;

    // Use optimized invitation response handling
    const result = await ChatQueries.respondToInvitation({
      invitationId,
      userId: user.id,
      action,
    });

    // TODO: Replace with Supabase realtime broadcast
    // if (result.roomDeleted) {
    //   supabase.channel(`user:${result.room.owner_id}`).send({
    //     type: 'broadcast',
    //     event: 'room:deleted',
    //     payload: {
    //       roomId: result.room.id,
    //       deletedBy: user.id,
    //       reason: 'invitation_declined'
    //     }
    //   });
    // } else {
    //   supabase.channel('invitations').send({
    //     type: 'broadcast',
    //     event: 'invitation:responded',
    //     payload: {
    //       invitationId: result.invitation.id,
    //       userId: user.id,
    //       action,
    //       room: result.room,
    //     }
    //   });
    // }

    return NextResponse.json({
      success: true,
      invitation: result.invitation,
      room: result.room,
      roomDeleted: result.roomDeleted,
    });

  } catch (error) {
    console.error("Error responding to invitation:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to respond to invitation" },
      { status: 500 }
    );
  }
}
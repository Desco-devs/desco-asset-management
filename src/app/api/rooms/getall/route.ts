import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from "@/lib/prisma";

/**
 * Optimized Rooms API
 * 
 * Features:
 * - Authentication validation
 * - Optimized queries with selective field loading
 * - Proper error handling and logging
 * - Memory-efficient data structures
 * - Cache-friendly response format
 */
export async function GET(request: NextRequest) {
  let userId: string | undefined;
  
  try {
    // Authenticate user
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url);
    userId = searchParams.get('userId') || user.id;

    // Ensure user can only access their own rooms
    if (user.id !== userId) {
      return NextResponse.json(
        { error: "Cannot access another user's rooms" },
        { status: 403 }
      );
    }

    // Get rooms where user is a member with optimized query
    const rooms = await prisma.room.findMany({
      where: {
        members: {
          some: {
            user_id: userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        avatar_url: true,
        owner_id: true,
        created_at: true,
        updated_at: true,
        owner: {
          select: {
            id: true,
            username: true,
            full_name: true,
            user_profile: true,
          },
        },
        members: {
          select: {
            user_id: true,
            joined_at: true,
            user: {
              select: {
                id: true,
                username: true,
                full_name: true,
                user_profile: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            created_at: 'desc',
          },
          select: {
            id: true,
            content: true,
            created_at: true,
            sender: {
              select: {
                id: true,
                username: true,
                full_name: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      },
      orderBy: [
        { updated_at: 'desc' },
        { created_at: 'desc' }
      ],
    });

    // Transform rooms for optimal client-side usage
    const transformedRooms = rooms.map((room) => {
      const lastMessage = room.messages[0];
      
      return {
        id: room.id,
        name: room.name,
        type: room.type,
        avatar_url: room.avatar_url,
        owner_id: room.owner_id,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          sender_name: lastMessage.sender.full_name,
          created_at: lastMessage.created_at,
        } : null,
        unread_count: 0, // TODO: Implement unread count calculation
        is_owner: room.owner_id === userId,
        member_count: room._count?.members || room.members.length,
        message_count: room._count?.messages || 0,
        created_at: room.created_at,
        updated_at: room.updated_at,
        owner: room.owner,
        members: room.members,
      };
    });

    // Add cache headers for better performance
    const response = NextResponse.json({ 
      rooms: transformedRooms,
      total: transformedRooms.length,
      timestamp: new Date().toISOString()
    });
    
    // Cache for 30 seconds - rooms don't change frequently
    response.headers.set('Cache-Control', 'private, max-age=30, s-maxage=30');
    
    return response;

  } catch (error) {
    console.error("[API] Error fetching rooms:", {
      error: error instanceof Error ? error.message : String(error),
      userId,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: "Failed to fetch rooms",
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.message : String(error))
          : undefined
      },
      { status: 500 }
    );
  }
}
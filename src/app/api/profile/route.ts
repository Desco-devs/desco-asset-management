import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";
import { ProfileUpdateData } from "@/types/profile";
import { Prisma } from "@prisma/client";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user profile from database
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        username: true,
        full_name: true,
        phone: true,
        user_profile: true,
        role: true,
        user_status: true,
        is_online: true,
        last_seen: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Combine database user data with auth user email
    const userWithEmail = {
      ...user,
      email: authUser.email, // Add email from Supabase auth
    };

    // Add mobile-optimized response headers
    const response = NextResponse.json(userWithEmail);
    
    // Cache headers for mobile performance
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    response.headers.set('ETag', `"${user.updated_at}"`);
    
    return response;
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ProfileUpdateData = await request.json();
    
    // Validate required fields
    if (!body.username?.trim() || !body.full_name?.trim()) {
      return NextResponse.json(
        { error: "Username and full name are required" },
        { status: 400 }
      );
    }

    // Update user profile with proper error handling
    let updatedUser;
    try {
      updatedUser = await prisma.user.update({
        where: { id: authUser.id },
        data: {
          username: body.username,
          full_name: body.full_name,
          phone: body.phone,
          user_profile: body.user_profile,
        },
        select: {
          id: true,
          username: true,
          full_name: true,
          phone: true,
          user_profile: true,
          role: true,
          user_status: true,
          is_online: true,
          last_seen: true,
          created_at: true,
          updated_at: true,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle unique constraint violation
        if (error.code === 'P2002') {
          return NextResponse.json(
            { error: "Username already exists" },
            { status: 409 }
          );
        }
      }
      throw error; // Re-throw other errors
    }

    // Update Supabase user metadata
    try {
      await supabase.auth.updateUser({
        data: {
          full_name: updatedUser.full_name,
          username: updatedUser.username,
        }
      });
    } catch (metadataError) {
      console.warn("Failed to update Supabase metadata:", metadataError);
      // Don't fail the request if metadata update fails
    }

    // Add mobile-optimized response headers for updated profile
    const response = NextResponse.json(updatedUser);
    
    // Fresh cache after update
    response.headers.set('Cache-Control', 'private, max-age=300, stale-while-revalidate=60');
    response.headers.set('ETag', `"${updatedUser.updated_at}"`);
    
    return response;
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
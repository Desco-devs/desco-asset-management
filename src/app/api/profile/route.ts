import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PrismaClient } from "@prisma/client";
import { ProfileUpdateData } from "@/types/profile";

const prisma = new PrismaClient();

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

    return NextResponse.json(user);
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

    // Check if username is unique (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        username: body.username,
        NOT: { id: authUser.id }
      }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        username: body.username,
        full_name: body.full_name,
        phone: body.phone,
        user_profile: body.user_profile,
        updated_at: new Date(),
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

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
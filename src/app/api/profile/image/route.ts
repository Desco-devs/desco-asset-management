import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function DELETE() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get current user to check if they have a profile image
    const currentUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { user_profile: true }
    });

    if (!currentUser?.user_profile) {
      return NextResponse.json({ message: "No profile image to delete" });
    }

    // Update user to remove profile image
    await prisma.user.update({
      where: { id: authUser.id },
      data: {
        user_profile: null,
        updated_at: new Date(),
      },
    });

    // TODO: If using file storage, delete the actual image file here
    // For now, we just remove the URL from the database

    return NextResponse.json({ message: "Profile image deleted successfully" });
  } catch (error) {
    console.error("Profile image deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete profile image" },
      { status: 500 }
    );
  }
}
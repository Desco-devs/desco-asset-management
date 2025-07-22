"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function createLocation(address: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile from database
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        full_name: true,
        role: true,
        user_status: true,
      },
    });

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    if (userProfile.user_status !== 'ACTIVE') {
      throw new Error("Account is inactive");
    }

    // Check if user has permission to create locations (ADMIN or SUPERADMIN)
    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions to create locations");
    }

    if (!address || typeof address !== "string" || !address.trim()) {
      throw new Error("Address is required and must be a non-empty string");
    }

    const newLocation = await prisma.location.create({
      data: {
        address: address.trim(),
        created_by: userProfile.id,
      },
      include: { 
        clients: true,
        user: {
          select: {
            id: true,
            full_name: true,
            username: true,
          }
        }
      }
    });

    revalidatePath("/projects");
    revalidatePath("/locations");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: newLocation,
    };
  } catch (error: unknown) {
    console.error("Error creating location:", error);
    
    if (error instanceof Error && 'code' in error && error.code === "P2002") {
      throw new Error("Location with this address already exists");
    }
    
    throw new Error(error instanceof Error ? error.message : "Failed to create location");
  }
}
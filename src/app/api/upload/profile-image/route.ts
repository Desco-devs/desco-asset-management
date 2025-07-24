import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    // Check authentication using server client
    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${authUser.id}_${Date.now()}.${fileExtension}`;
    const filePath = `profiles/${fileName}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Use service role client for file upload operations
    const serviceRoleClient = createServiceRoleClient();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceRoleClient.storage
      .from('avatars') // Make sure this bucket exists in your Supabase project
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true // This will overwrite if file exists
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload to storage" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = serviceRoleClient.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({
      message: "File uploaded successfully",
      url: publicUrl,
      path: filePath
    });

  } catch (error) {
    console.error("Profile image upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
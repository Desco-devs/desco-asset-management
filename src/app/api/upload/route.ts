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
    const folder = formData.get("folder") as string || "general";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type based on folder
    let allowedTypes: string[] = [];
    let maxSize = 10 * 1024 * 1024; // 10MB default

    if (folder.includes("maintenance-parts") || folder.includes("maintenance-attachments") || folder.includes("/parts") || folder.includes("/attachments")) {
      // Allow images and documents for maintenance
      allowedTypes = [
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif",
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];
      maxSize = 15 * 1024 * 1024; // 15MB for maintenance files
    } else {
      // Default to images only
      allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    }

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          error: `Invalid file type. Allowed types: ${allowedTypes.join(", ")}` 
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum size is ${maxSizeMB}MB.` },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'bin';
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${Date.now()}_${authUser.id}_${sanitizedFileName}`;
    const filePath = `${folder}/${fileName}`;

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Use service role client for file upload operations
    const serviceRoleClient = createServiceRoleClient();

    // Determine storage bucket based on folder
    let bucket = "equipments"; // Default to equipments bucket (maintenance bucket doesn't exist)
    if (folder.includes("profile")) {
      bucket = "avatars";
    } else if (folder.includes("vehicle")) {
      bucket = "vehicles";
    } else if (folder.includes("equipment") || folder.includes("maintenance")) {
      bucket = "equipments"; // Use equipments bucket for equipment and maintenance files
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await serviceRoleClient.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false // Don't overwrite existing files
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
      .from(bucket)
      .getPublicUrl(filePath);

    return NextResponse.json({
      message: "File uploaded successfully",
      url: publicUrl,
      path: filePath,
      bucket: bucket,
      folder: folder,
      originalName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
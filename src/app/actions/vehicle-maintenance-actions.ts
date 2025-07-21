"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

// Helper to upload files to Supabase for maintenance attachments
const uploadMaintenanceFileToSupabase = async (
  file: File,
  vehicleId: string,
  reportId: string
): Promise<string> => {
  const supabase = await createServerSupabaseClient();
  const timestamp = Date.now();
  const ext = file.name.split('.').pop();
  const filename = `maintenance_${timestamp}.${ext}`;
  
  const filepath = `vehicle-maintenance/${vehicleId}/${reportId}/${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadErr } = await supabase
    .storage
    .from('vehicles')
    .upload(filepath, buffer, { cacheControl: '3600', upsert: false });

  if (uploadErr || !uploadData) {
    throw new Error(`Upload failed: ${uploadErr?.message}`);
  }

  const { data: urlData } = supabase
    .storage
    .from('vehicles')
    .getPublicUrl(uploadData.path);

  return urlData.publicUrl;
};

export async function createVehicleMaintenanceReportAction(formData: FormData) {
  try {
    // Get form data
    const vehicleId = formData.get("vehicleId") as string;
    const locationId = formData.get("locationId") as string;
    const issueDescription = formData.get("issueDescription") as string;
    const remarks = formData.get("remarks") as string;
    const inspectionDetails = formData.get("inspectionDetails") as string;
    const actionTaken = formData.get("actionTaken") as string;
    const partsReplaced = formData.get("partsReplaced") as string;
    const priority = formData.get("priority") as string;
    const status = formData.get("status") as string;
    const downtimeHours = formData.get("downtimeHours") as string;
    const dateReported = formData.get("dateReported") as string;
    const dateRepaired = formData.get("dateRepaired") as string;
    const repairedBy = formData.get("repairedBy") as string;

    // Basic validation
    if (!vehicleId || !locationId || !issueDescription) {
      throw new Error("Missing required fields");
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
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

    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions");
    }

    // Validate vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new Error("Location not found");
    }

    // Parse parts replaced (comma-separated string to array)
    const partsReplacedArray = partsReplaced 
      ? partsReplaced.split(',').map(part => part.trim()).filter(part => part.length > 0)
      : [];

    // Create maintenance report first (without attachments)
    const maintenanceReport = await prisma.maintenance_vehicle_report.create({
      data: {
        vehicle_id: vehicleId,
        location_id: locationId,
        issue_description: issueDescription,
        remarks: remarks || null,
        inspection_details: inspectionDetails || null,
        action_taken: actionTaken || null,
        parts_replaced: partsReplacedArray,
        priority: priority ? (priority as "LOW" | "MEDIUM" | "HIGH") : null,
        status: status ? (status as "REPORTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") : 'REPORTED',
        downtime_hours: downtimeHours || null,
        date_reported: dateReported ? new Date(dateReported) : new Date(),
        date_repaired: dateRepaired ? new Date(dateRepaired) : null,
        reported_by: userProfile.id,
        repaired_by: repairedBy || null,
        attachment_urls: [], // Will update if files uploaded
      },
    });

    // Handle file attachments
    const attachmentUrls: string[] = [];
    
    // Process multiple attachment files
    const attachmentFiles = formData.getAll("attachments") as File[];
    
    for (const file of attachmentFiles) {
      if (file && file.size > 0) {
        try {
          const uploadUrl = await uploadMaintenanceFileToSupabase(
            file,
            vehicleId,
            maintenanceReport.id
          );
          
          attachmentUrls.push(uploadUrl);
          console.log(`✅ Uploaded attachment:`, uploadUrl);
        } catch (error) {
          console.error(`❌ Failed to upload attachment:`, error);
          // Continue with other files, don't fail the entire creation
        }
      }
    }

    // Update maintenance report with attachment URLs if any were uploaded
    if (attachmentUrls.length > 0) {
      await prisma.maintenance_vehicle_report.update({
        where: { id: maintenanceReport.id },
        data: { attachment_urls: attachmentUrls },
      });
      console.log(`📁 Updated maintenance report ${maintenanceReport.id} with ${attachmentUrls.length} attachments`);
    }

    // Revalidate relevant pages
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { 
      success: true, 
      reportId: maintenanceReport.id,
      attachmentsUploaded: attachmentUrls.length
    };

  } catch (error) {
    console.error("Error creating vehicle maintenance report:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to create maintenance report");
  }
}

export async function updateVehicleMaintenanceReportAction(formData: FormData) {
  try {
    // Get form data
    const reportId = formData.get("reportId") as string;
    const vehicleId = formData.get("vehicleId") as string;
    const locationId = formData.get("locationId") as string;
    const issueDescription = formData.get("issueDescription") as string;
    const remarks = formData.get("remarks") as string;
    const inspectionDetails = formData.get("inspectionDetails") as string;
    const actionTaken = formData.get("actionTaken") as string;
    const partsReplaced = formData.get("partsReplaced") as string;
    const priority = formData.get("priority") as string;
    const status = formData.get("status") as string;
    const downtimeHours = formData.get("downtimeHours") as string;
    const dateReported = formData.get("dateReported") as string;
    const dateRepaired = formData.get("dateRepaired") as string;
    const repairedBy = formData.get("repairedBy") as string;

    // Basic validation
    if (!reportId || !vehicleId || !locationId || !issueDescription) {
      throw new Error("Missing required fields");
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
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

    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions");
    }

    // Check if maintenance report exists
    const existingReport = await prisma.maintenance_vehicle_report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      throw new Error("Maintenance report not found");
    }

    // Parse parts replaced
    const partsReplacedArray = partsReplaced 
      ? partsReplaced.split(',').map(part => part.trim()).filter(part => part.length > 0)
      : [];

    // Update maintenance report basic data
    await prisma.maintenance_vehicle_report.update({
      where: { id: reportId },
      data: {
        vehicle_id: vehicleId,
        location_id: locationId,
        issue_description: issueDescription,
        remarks: remarks || null,
        inspection_details: inspectionDetails || null,
        action_taken: actionTaken || null,
        parts_replaced: partsReplacedArray,
        priority: priority ? (priority as "LOW" | "MEDIUM" | "HIGH") : null,
        status: status ? (status as "REPORTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED") : existingReport.status,
        downtime_hours: downtimeHours || null,
        date_reported: dateReported ? new Date(dateReported) : existingReport.date_reported,
        date_repaired: dateRepaired ? new Date(dateRepaired) : null,
        repaired_by: repairedBy || null,
      },
    });

    // Handle new file attachments (append to existing)
    const newAttachmentUrls: string[] = [];
    
    const attachmentFiles = formData.getAll("attachments") as File[];
    
    for (const file of attachmentFiles) {
      if (file && file.size > 0) {
        try {
          const uploadUrl = await uploadMaintenanceFileToSupabase(
            file,
            vehicleId,
            reportId
          );
          
          newAttachmentUrls.push(uploadUrl);
          console.log(`✅ Uploaded new attachment:`, uploadUrl);
        } catch (error) {
          console.error(`❌ Failed to upload attachment:`, error);
        }
      }
    }

    // Update with new attachments (append to existing)
    if (newAttachmentUrls.length > 0) {
      const allAttachments = [...(existingReport.attachment_urls || []), ...newAttachmentUrls];
      
      await prisma.maintenance_vehicle_report.update({
        where: { id: reportId },
        data: { attachment_urls: allAttachments },
      });
      
      console.log(`📁 Added ${newAttachmentUrls.length} new attachments to report ${reportId}`);
    }

    // Revalidate relevant pages
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { 
      success: true, 
      reportId: reportId,
      newAttachmentsUploaded: newAttachmentUrls.length
    };

  } catch (error) {
    console.error("Error updating vehicle maintenance report:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to update maintenance report");
  }
}

export async function deleteVehicleMaintenanceReportAction(formData: FormData) {
  try {
    const reportId = formData.get("reportId") as string;

    if (!reportId) {
      throw new Error("Report ID is required");
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
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

    if (userProfile.role !== 'ADMIN' && userProfile.role !== 'SUPERADMIN') {
      throw new Error("Insufficient permissions");
    }

    // Check if maintenance report exists
    const existingReport = await prisma.maintenance_vehicle_report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      throw new Error("Maintenance report not found");
    }

    // Delete associated files from storage if any
    if (existingReport.attachment_urls && existingReport.attachment_urls.length > 0) {
      for (const url of existingReport.attachment_urls) {
        try {
          // Extract file path from URL for deletion
          const urlPath = new URL(url).pathname;
          const filePath = urlPath.split('/').pop();
          
          if (filePath) {
            await supabase.storage
              .from('vehicles')
              .remove([`vehicle-maintenance/${existingReport.vehicle_id}/${reportId}/${filePath}`]);
          }
        } catch (error) {
          console.error('Failed to delete attachment file:', error);
          // Continue deletion even if file removal fails
        }
      }
    }

    // Delete the maintenance report
    await prisma.maintenance_vehicle_report.delete({
      where: { id: reportId },
    });

    // Revalidate relevant pages
    revalidatePath("/vehicles");
    revalidatePath("/dashboard");

    return { 
      success: true, 
      message: "Maintenance report deleted successfully"
    };

  } catch (error) {
    console.error("Error deleting vehicle maintenance report:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to delete maintenance report");
  }
}

export async function getAllVehicleMaintenanceReportsAction(vehicleId: string) {
  try {
    if (!vehicleId) {
      throw new Error("Vehicle ID is required");
    }

    // Auth check
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error("Unauthorized");
    }

    // Get user profile
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
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

    // Get all maintenance reports for the vehicle with related data
    const reports = await prisma.maintenance_vehicle_report.findMany({
      where: { vehicle_id: vehicleId },
      include: {
        vehicle: {
          select: {
            brand: true,
            model: true,
            plate_number: true,
          },
        },
        location: {
          select: {
            id: true,
            address: true,
          },
        },
        reported_user: {
          select: {
            full_name: true,
            username: true,
          },
        },
        repaired_user: {
          select: {
            full_name: true,
            username: true,
          },
        },
      },
      orderBy: {
        date_reported: 'desc',
      },
    });

    return { 
      success: true, 
      data: reports,
      count: reports.length
    };

  } catch (error) {
    console.error("Error fetching vehicle maintenance reports:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to fetch maintenance reports");
  }
}
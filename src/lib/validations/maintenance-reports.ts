import { z } from 'zod'

// Define the enums as const arrays to match Prisma schema
const REPORT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const
const REPORT_STATUSES = ['REPORTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const

// Parts validation schema - ensures text-only entries
export const partsReplacedSchema = z
  .array(
    z.string()
      .trim()
      .min(1, "Part description cannot be empty")
      .max(255, "Part description too long")
      .refine(
        (part) => {
          // Ensure no URLs are included in parts
          const urlPattern = /^https?:\/\/|^www\.|\.com|\.org|\.net|\.gov/i
          return !urlPattern.test(part)
        },
        {
          message: "Part description cannot contain URLs. Use attachment_urls for files."
        }
      )
  )
  .max(50, "Too many parts listed")
  .default([])

// Attachment URLs validation schema
export const attachmentUrlsSchema = z
  .array(
    z.string()
      .url("Invalid URL format")
      .max(500, "URL too long")
  )
  .max(20, "Too many attachments")
  .default([])

// Base maintenance report schema (shared fields)
export const baseMaintenanceReportSchema = z.object({
  issue_description: z.string()
    .min(1, "Issue description is required")
    .max(1000, "Issue description too long"),
  
  remarks: z.string()
    .max(500, "Remarks too long")
    .optional()
    .nullable(),
  
  inspection_details: z.string()
    .max(1000, "Inspection details too long")
    .optional()
    .nullable(),
  
  action_taken: z.string()
    .max(1000, "Action taken description too long")
    .optional()
    .nullable(),
  
  parts_replaced: partsReplacedSchema,
  
  attachment_urls: attachmentUrlsSchema,
  
  priority: z.enum(REPORT_PRIORITIES)
    .optional()
    .nullable(),
  
  status: z.enum(REPORT_STATUSES)
    .optional()
    .nullable(),
  
  downtime_hours: z.string()
    .max(50, "Downtime hours description too long")
    .optional()
    .nullable(),
  
  date_repaired: z.coerce.date()
    .optional()
    .nullable(),
  
  date_reported: z.coerce.date()
    .default(() => new Date()),
  
  reported_by: z.string()
    .uuid("Invalid reporter ID")
    .optional()
    .nullable(),
  
  repaired_by: z.string()
    .uuid("Invalid repairer ID")
    .optional()
    .nullable(),
})

// Equipment maintenance report creation schema
export const createEquipmentMaintenanceReportSchema = baseMaintenanceReportSchema.extend({
  equipment_id: z.string()
    .uuid("Invalid equipment ID"),
  
  location_id: z.string()
    .uuid("Invalid location ID"),
})

// Equipment maintenance report update schema
export const updateEquipmentMaintenanceReportSchema = baseMaintenanceReportSchema.extend({
  equipment_id: z.string().uuid("Invalid equipment ID").optional(),
  location_id: z.string().uuid("Invalid location ID").optional(),
}).partial()

// Vehicle maintenance report creation schema
export const createVehicleMaintenanceReportSchema = baseMaintenanceReportSchema.extend({
  vehicle_id: z.string()
    .uuid("Invalid vehicle ID"),
  
  location_id: z.string()
    .uuid("Invalid location ID"),
})

// Vehicle maintenance report update schema
export const updateVehicleMaintenanceReportSchema = baseMaintenanceReportSchema.extend({
  vehicle_id: z.string().uuid("Invalid vehicle ID").optional(),
  location_id: z.string().uuid("Invalid location ID").optional(),
}).partial()

// Search and filter schemas
export const maintenanceReportFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.enum(REPORT_STATUSES).optional(),
  priority: z.enum(REPORT_PRIORITIES).optional(),
  equipment_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  location_id: z.string().uuid().optional(),
  reported_by: z.string().uuid().optional(),
  repaired_by: z.string().uuid().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  has_parts: z.boolean().optional(), // Filter reports that have parts replaced
  part_name: z.string().optional(), // Search for specific part name
  limit: z.number().positive().max(100).default(50),
  offset: z.number().min(0).default(0),
})

// Parts search schema for analytics
export const partsSearchSchema = z.object({
  search: z.string().min(1, "Search term required"),
  limit: z.number().positive().max(100).default(20),
  equipment_type: z.string().optional(),
  vehicle_type: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
})

// Utility function to sanitize parts array (consistent filtering)
export const sanitizePartsArray = (parts: unknown): string[] => {
  if (!Array.isArray(parts)) return []
  
  return parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map(part => part.trim())
    .filter(part => {
      // Remove any URLs that might have been included by mistake
      const urlPattern = /^https?:\/\/|^www\.|\.com|\.org|\.net|\.gov/i
      return !urlPattern.test(part)
    })
    .slice(0, 50) // Reasonable limit to prevent abuse
}

// Utility function to validate and sanitize attachment URLs
export const sanitizeAttachmentUrls = (urls: unknown): string[] => {
  if (!Array.isArray(urls)) return []
  
  return urls
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
    .filter(url => {
      try {
        new URL(url)
        return true
      } catch {
        return false
      }
    })
    .slice(0, 20) // Reasonable limit
}

// Type exports
export type CreateEquipmentMaintenanceReportSchema = z.infer<typeof createEquipmentMaintenanceReportSchema>
export type UpdateEquipmentMaintenanceReportSchema = z.infer<typeof updateEquipmentMaintenanceReportSchema>
export type CreateVehicleMaintenanceReportSchema = z.infer<typeof createVehicleMaintenanceReportSchema>
export type UpdateVehicleMaintenanceReportSchema = z.infer<typeof updateVehicleMaintenanceReportSchema>
export type MaintenanceReportFiltersSchema = z.infer<typeof maintenanceReportFiltersSchema>
export type PartsSearchSchema = z.infer<typeof partsSearchSchema>
import { z } from 'zod'

// Define the enums to match Prisma schema
const ROOM_TYPES = ['DIRECT', 'GROUP'] as const
const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'FILE', 'SYSTEM'] as const
const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'] as const

// Common validation patterns
const uuidSchema = z.string().uuid("Invalid UUID format")
const userIdSchema = uuidSchema
const roomIdSchema = uuidSchema

// Message content validation with performance optimizations
export const messageContentSchema = z.string()
  .min(1, "Message content cannot be empty")
  .max(2000, "Message content too long")
  .refine(
    (content) => content.trim().length > 0,
    { message: "Message cannot be only whitespace" }
  )

// File URL validation for attachments
export const fileUrlSchema = z.string()
  .url("Invalid file URL")
  .max(500, "File URL too long")
  .refine(
    (url) => {
      // Basic file extension validation for common types
      const allowedExtensions = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|txt|mp4|mov|avi)$/i
      return allowedExtensions.test(url) || url.includes('supabase.co/storage')
    },
    { message: "Unsupported file type or invalid storage URL" }
  )

// Room name validation
export const roomNameSchema = z.string()
  .min(1, "Room name cannot be empty")
  .max(100, "Room name too long")
  .refine(
    (name) => name.trim().length > 0,
    { message: "Room name cannot be only whitespace" }
  )

// Room description validation
export const roomDescriptionSchema = z.string()
  .max(500, "Room description too long")
  .optional()
  .nullable()

// Message creation schema
export const createMessageSchema = z.object({
  roomId: roomIdSchema,
  content: messageContentSchema,
  type: z.enum(MESSAGE_TYPES).default('TEXT'),
  replyToId: uuidSchema.optional().nullable(),
  fileUrl: fileUrlSchema.optional().nullable(),
})

// Message update schema (for editing)
export const updateMessageSchema = z.object({
  content: messageContentSchema,
  fileUrl: fileUrlSchema.optional().nullable(),
})

// Message pagination schema with optimized defaults
export const messagesPaginationSchema = z.object({
  cursor: z.string().datetime().optional(),
  limit: z.coerce.number()
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(50),
  includeReplies: z.boolean().default(true),
})

// Room creation schema
export const createRoomSchema = z.object({
  name: roomNameSchema,
  description: roomDescriptionSchema,
  type: z.enum(ROOM_TYPES),
  avatarUrl: z.string().url().optional().nullable(),
  invitedUsers: z.array(
    z.object({
      id: userIdSchema,
      username: z.string(),
      full_name: z.string(),
    })
  ).default([]),
  inviteUsername: z.string()
    .min(1, "Username cannot be empty")
    .max(50, "Username too long")
    .optional(),
})

// Room update schema
export const updateRoomSchema = z.object({
  name: roomNameSchema.optional(),
  description: roomDescriptionSchema,
  avatarUrl: z.string().url().optional().nullable(),
}).partial()

// Room invitation schema
export const createRoomInvitationSchema = z.object({
  roomId: roomIdSchema,
  invitedUsers: z.array(userIdSchema).min(1, "Must invite at least one user"),
  message: z.string().max(200, "Invitation message too long").optional(),
})

// Invitation response schema
export const respondToInvitationSchema = z.object({
  invitationId: uuidSchema,
  action: z.enum(['ACCEPTED', 'DECLINED'], {
    required_error: "Action is required",
    invalid_type_error: "Action must be ACCEPTED or DECLINED",
  }),
})

// Room member management schema
export const addRoomMemberSchema = z.object({
  roomId: roomIdSchema,
  userId: userIdSchema,
})

export const removeRoomMemberSchema = z.object({
  roomId: roomIdSchema,
  userId: userIdSchema,
})

// Room search and filtering schema
export const roomFiltersSchema = z.object({
  search: z.string().optional(),
  type: z.enum(ROOM_TYPES).optional(),
  isOwner: z.boolean().optional(),
  hasUnread: z.boolean().optional(),
  limit: z.coerce.number()
    .min(1)
    .max(100)
    .default(50),
  offset: z.coerce.number()
    .min(0)
    .default(0),
})

// Message search schema
export const messageSearchSchema = z.object({
  query: z.string().min(1, "Search query required"),
  roomId: roomIdSchema.optional(),
  senderId: userIdSchema.optional(),
  messageType: z.enum(MESSAGE_TYPES).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  limit: z.coerce.number()
    .min(1)
    .max(100)
    .default(20),
  offset: z.coerce.number()
    .min(0)
    .default(0),
})

// Unread messages schema
export const unreadMessagesSchema = z.object({
  roomIds: z.array(roomIdSchema).optional(),
  userId: userIdSchema,
})

// Mark messages as read schema
export const markAsReadSchema = z.object({
  roomId: roomIdSchema,
  lastReadAt: z.coerce.date().optional(),
})

// Real-time subscription schema for frontend
export const chatSubscriptionSchema = z.object({
  roomId: roomIdSchema,
  userId: userIdSchema,
  eventTypes: z.array(
    z.enum(['message:new', 'message:updated', 'message:deleted', 'user:typing', 'user:online'])
  ).default(['message:new', 'message:updated']),
})

// Typing indicator schema
export const typingIndicatorSchema = z.object({
  roomId: roomIdSchema,
  userId: userIdSchema,
  isTyping: z.boolean(),
})

// User presence schema
export const userPresenceSchema = z.object({
  userId: userIdSchema,
  isOnline: z.boolean(),
  lastSeen: z.coerce.date().optional(),
})

// Bulk operations schemas
export const bulkDeleteMessagesSchema = z.object({
  messageIds: z.array(uuidSchema).min(1, "Must provide at least one message ID"),
  roomId: roomIdSchema,
})

export const bulkMarkAsReadSchema = z.object({
  roomIds: z.array(roomIdSchema).min(1, "Must provide at least one room ID"),
  userId: userIdSchema,
})

// Analytics and reporting schemas
export const chatAnalyticsSchema = z.object({
  roomId: roomIdSchema.optional(),
  userId: userIdSchema.optional(),
  dateFrom: z.coerce.date(),
  dateTo: z.coerce.date(),
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
})

// Utility validation functions
export const validateUserAccess = (userId: string, roomMembers: Array<{ user_id: string }>) => {
  return roomMembers.some(member => member.user_id === userId)
}

export const validateMessageOwnership = (userId: string, senderId: string) => {
  return userId === senderId
}

export const validateRoomOwnership = (userId: string, ownerId: string) => {
  return userId === ownerId
}

// Sanitization utilities
export const sanitizeMessageContent = (content: string): string => {
  return content
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 2000) // Enforce max length
}

export const sanitizeRoomName = (name: string): string => {
  return name
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100) // Enforce max length
}

// Type exports for better TypeScript integration
export type CreateMessageSchema = z.infer<typeof createMessageSchema>
export type UpdateMessageSchema = z.infer<typeof updateMessageSchema>
export type MessagesPaginationSchema = z.infer<typeof messagesPaginationSchema>
export type CreateRoomSchema = z.infer<typeof createRoomSchema>
export type UpdateRoomSchema = z.infer<typeof updateRoomSchema>
export type CreateRoomInvitationSchema = z.infer<typeof createRoomInvitationSchema>
export type RespondToInvitationSchema = z.infer<typeof respondToInvitationSchema>
export type RoomFiltersSchema = z.infer<typeof roomFiltersSchema>
export type MessageSearchSchema = z.infer<typeof messageSearchSchema>
export type UnreadMessagesSchema = z.infer<typeof unreadMessagesSchema>
export type MarkAsReadSchema = z.infer<typeof markAsReadSchema>
export type ChatSubscriptionSchema = z.infer<typeof chatSubscriptionSchema>
export type TypingIndicatorSchema = z.infer<typeof typingIndicatorSchema>
export type UserPresenceSchema = z.infer<typeof userPresenceSchema>
export type BulkDeleteMessagesSchema = z.infer<typeof bulkDeleteMessagesSchema>
export type BulkMarkAsReadSchema = z.infer<typeof bulkMarkAsReadSchema>
export type ChatAnalyticsSchema = z.infer<typeof chatAnalyticsSchema>
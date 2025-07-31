/**
 * Centralized Query Keys for Chat Application
 * 
 * This file defines all query keys used across the chat application
 * to ensure consistency and prevent cache invalidation issues.
 */

export const CHAT_QUERY_KEYS = {
  // Room-related queries
  rooms: (userId: string) => ['chat-rooms', userId] as const,
  room: (roomId: string) => ['chat-room', roomId] as const,
  roomMessages: (roomId: string) => ['chat-room-messages', roomId] as const,
  
  // Invitation-related queries
  invitations: (userId: string, type?: 'sent' | 'received', status?: string) => 
    ['chat-invitations', userId, type, status].filter(Boolean),
  invitation: (invitationId: string) => ['chat-invitation', invitationId] as const,
  
  // User-related queries
  users: () => ['chat-users'] as const,
  user: (userId: string) => ['chat-user', userId] as const,
  
  // Message-related queries
  messages: (roomId: string) => ['chat-messages', roomId] as const,
  messagesPaginated: (roomId: string, page: number) => ['chat-messages-paginated', roomId, page] as const,
  
  // Presence and typing
  presence: (roomId?: string) => roomId ? ['chat-presence', roomId] as const : ['chat-presence'] as const,
  typing: (roomId: string) => ['chat-typing', roomId] as const,
} as const

/**
 * Legacy query keys for backward compatibility
 * @deprecated Use CHAT_QUERY_KEYS instead
 */
export const ROOMS_QUERY_KEYS = {
  rooms: (userId: string) => CHAT_QUERY_KEYS.rooms(userId),
  roomMessages: (roomId: string) => CHAT_QUERY_KEYS.roomMessages(roomId),
}

export const INVITATIONS_QUERY_KEYS = {
  invitations: (userId: string, type?: 'sent' | 'received', status?: string) => 
    CHAT_QUERY_KEYS.invitations(userId, type, status),
  invitation: (invitationId: string) => CHAT_QUERY_KEYS.invitation(invitationId)
}
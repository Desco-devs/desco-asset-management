// Re-export all chat-app hooks for easy importing
export { useRooms, useInvalidateRooms, ROOMS_QUERY_KEYS } from './useRooms';
// useRoomMessages moved to useChatApp for better integration
export { useUsers, useUserProfile, USERS_QUERY_KEYS } from './useUsers';
export { useChatMutations } from './useChatMutations';
export { useRoomInvitations, ROOM_INVITATIONS_QUERY_KEYS } from './useRoomInvitations';
export { useUserStatuses, USER_STATUSES_QUERY_KEYS } from './useUserStatuses';

// Real-time layer hooks
export { useRealtimeMessaging } from './useRealtimeMessaging';
export { useRealtimeRooms } from './useRealtimeRooms';
export { useRealtimeSubscriptionManager, SubscriptionType } from './useRealtimeSubscriptionManager';
export { usePresenceAndTyping } from './usePresenceAndTyping';

// Presence hooks for real-time user status tracking
export { useSupabasePresence } from './useSupabasePresence';
export { useOnlineStatus } from './useOnlineStatus';
export { useRoomPresence } from './useRoomPresence';

// Supabase integration hooks (with real-time functionality)
export { useSupabaseMessages } from './useSupabaseMessages';
export { useSupabaseRooms } from './useSupabaseRooms';

// Combined hook for common chat app functionality
export { useChatApp } from './useChatApp';

// Enhanced real-time chat app hook with full synchronization
export { useRealtimeChatApp } from './useRealtimeChatApp';

// Cache management for real-time synchronization
export { useChatCacheManager, CHAT_QUERY_KEYS } from './useChatCacheManager';

// Real-time invitation notifications
export { useRoomInvitationNotifications } from './useRoomInvitationNotifications';
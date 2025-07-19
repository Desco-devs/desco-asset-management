// Re-export all chat-app hooks for easy importing
export { useRooms, useRoomMessages, useInvalidateRooms, ROOMS_QUERY_KEYS } from './useRooms';
export { useUsers, useUserProfile, USERS_QUERY_KEYS } from './useUsers';
export { useChatMutations } from './useChatMutations';

// Combined hook for common chat app functionality
export { useChatApp } from './useChatApp';
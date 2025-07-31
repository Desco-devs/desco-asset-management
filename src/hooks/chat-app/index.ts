// Core chat functionality
export { useChatApp } from './useChatApp';
export { CHAT_QUERY_KEYS, ROOMS_QUERY_KEYS, INVITATIONS_QUERY_KEYS } from './queryKeys';
export { useRooms } from './useRooms';
export { useRoomInvitations, ROOM_INVITATIONS_QUERY_KEYS } from './useRoomInvitations';

// Phase 2: Real-time Core Features
export { 
  useChatRealtime, 
  useChatRealtimeStatus 
} from './useChatRealtime';

export { 
  useChatPresence, 
  useUserOnlineStatus, 
  useRoomPresence 
} from './useChatPresence';

export { 
  useChatTyping, 
  useRoomTyping 
} from './useChatTyping';

export { 
  useChatMessages, 
  useRoomMessages 
} from './useChatMessages';

export { useChatConnection } from './useChatConnection';

// Legacy (Phase 1)
export { useOnlineStatus } from './useOnlineStatus';
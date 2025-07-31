# Online Presence System

A comprehensive real-time online presence system for the Desco Company chat application, built with Supabase real-time subscriptions and following established architectural patterns.

## Overview

The online presence system provides:
- **Real-time online/offline status tracking** using Supabase presence channels
- **Room-specific presence** showing who's currently viewing which room
- **Automatic heartbeat mechanism** with network-adaptive intervals
- **Comprehensive API endpoints** for presence management and analytics
- **Utility functions** for presence data handling and display
- **React components** for easy UI integration

## Architecture

### Core Components

1. **`useOnlinePresence` Hook** (`src/hooks/chat-app/useOnlinePresence.ts`)
   - Main real-time presence management
   - Network-adaptive heartbeat mechanism
   - Automatic connection handling and reconnection
   - Room-specific presence tracking

2. **API Endpoints** (`src/app/api/presence/`)
   - `/api/presence` - Global presence management
   - `/api/presence/room/[roomId]` - Room-specific presence
   - `/api/presence/analytics` - Presence analytics and statistics

3. **Utility Functions** (`src/lib/presence-utils.ts`)
   - Presence data formatting and validation
   - Time calculations and status indicators
   - Batch operations and analytics helpers

4. **UI Components** (`src/components/chat/OnlinePresenceIndicator.tsx`)
   - Online presence indicators
   - User status displays
   - Room presence summaries

## Features

### Real-time Presence Tracking
- Uses Supabase presence channels for real-time updates
- Automatic heartbeat with adaptive intervals based on network conditions
- Handles connection drops and automatic reconnection
- Tracks both global online status and room-specific presence

### Network Adaptation
The system adapts to different network conditions:
- **Fast connections (4G/5G/WiFi)**: 10s heartbeat, 30s timeout
- **Medium connections (3G)**: 20s heartbeat, 60s timeout  
- **Slow connections (2G)**: 30s heartbeat, 90s timeout
- **Unknown/Default**: 15s heartbeat, 45s timeout

### Room-specific Presence
- Track which users are currently viewing specific rooms
- Show real-time counts of users in rooms
- Automatic updates when users join/leave rooms
- Integration with existing room membership system

## Usage

### Basic Hook Usage

```typescript
import { useOnlinePresence } from '@/hooks/chat-app/useOnlinePresence'

function ChatComponent({ currentUser, activeRoomId }) {
  const {
    onlineUsers,
    onlineCount,
    isUserOnline,
    setPresence,
    connectionStatus,
    roomUsers
  } = useOnlinePresence(currentUser, activeRoomId)

  // Check if specific user is online
  const isJohnOnline = isUserOnline('john-user-id')
  
  // Manually set presence status
  const goOnline = () => setPresence('online')
  const goOffline = () => setPresence('offline')
  
  return (
    <div>
      <p>{onlineCount} users online</p>
      <p>{roomUsers.length} users in this room</p>
      <p>Connection: {connectionStatus}</p>
    </div>
  )
}
```

### Simplified Hooks

```typescript
// Just check if a user is online
import { useUserOnline } from '@/hooks/chat-app/useOnlinePresence'

function UserCard({ userId, currentUser }) {
  const { isOnline } = useUserOnline(userId, currentUser)
  
  return (
    <div className={isOnline ? 'online' : 'offline'}>
      User is {isOnline ? 'online' : 'offline'}
    </div>
  )
}

// Room-specific presence
import { useRoomOnlinePresence } from '@/hooks/chat-app/useOnlinePresence'

function RoomHeader({ roomId, currentUser }) {
  const { usersInRoom, userCount, usernames } = useRoomOnlinePresence(roomId, currentUser)
  
  return (
    <div>
      <p>{userCount} users viewing this room</p>
      <p>Users: {usernames}</p>
    </div>
  )
}
```

### UI Components

```typescript
import { 
  OnlinePresenceIndicator,
  UserOnlineStatus,
  RoomPresenceSummary 
} from '@/components/chat/OnlinePresenceIndicator'

function ChatLayout({ currentUser, activeRoomId }) {
  return (
    <div>
      {/* Global presence indicator */}
      <OnlinePresenceIndicator 
        currentUser={currentUser}
        activeRoomId={activeRoomId}
        showStats={true}
        showUserList={true}
      />
      
      {/* Individual user status */}
      <UserOnlineStatus 
        userId="some-user-id"
        currentUser={currentUser}
        showUsername={true}
      />
      
      {/* Room presence summary */}
      <RoomPresenceSummary 
        roomId={activeRoomId}
        currentUser={currentUser}
      />
    </div>
  )
}
```

## API Endpoints

### GET /api/presence
Get current online users globally or by room.

**Query Parameters:**
- `roomId` (optional) - Filter by specific room
- `includeDatabase` (optional) - Include database fallback data

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "user_id": "user-123",
      "username": "john_doe",
      "full_name": "John Doe",
      "user_profile": "https://...",
      "last_seen": "2024-01-01T12:00:00.000Z",
      "room_id": "room-456",
      "source": "realtime"
    }
  ],
  "count": 5,
  "totalOnline": 15
}
```

### POST /api/presence
Update user presence status.

**Request Body:**
```json
{
  "userId": "user-123",
  "status": "online", // or "offline"
  "roomId": "room-456" // optional
}
```

### GET /api/presence/room/[roomId]
Get presence information for a specific room.

**Response:**
```json
{
  "success": true,
  "room": {
    "id": "room-123",
    "name": "General Chat",
    "type": "GROUP",
    "member_count": 10
  },
  "presence": {
    "users_in_room": [...],
    "online_members": [...],
    "counts": {
      "in_room": 3,
      "online_members": 7,
      "total_members": 10
    }
  }
}
```

### POST /api/presence/room/[roomId]
Join or leave room presence.

**Request Body:**
```json
{
  "userId": "user-123",
  "action": "join" // or "leave"
}
```

### GET /api/presence/analytics
Get presence analytics and statistics (Admin only).

**Query Parameters:**
- `timeframe` - 1h, 24h, 7d, 30d (default: 24h)
- `includeRooms` - Include room breakdown (default: false)

## Utility Functions

### Presence Data Helpers

```typescript
import {
  formatPresenceUser,
  isRecentlyOnline,
  getTimeSinceOnline,
  createPresenceIndicator
} from '@/lib/presence-utils'

// Format raw presence data
const user = formatPresenceUser(rawData)

// Check if user was recently online (within 5 minutes)
const isRecent = isRecentlyOnline(user.last_seen, 5)

// Get human-readable time since online
const timeSince = getTimeSinceOnline(user.last_seen) // "5m ago"

// Create indicator data for UI
const indicator = createPresenceIndicator(user)
```

### Analytics and Stats

```typescript
import {
  calculatePresenceMetrics,
  groupUsersByRoom,
  filterStalePresence
} from '@/lib/presence-utils'

// Calculate engagement metrics
const metrics = calculatePresenceMetrics(onlineUsers)

// Group users by their current rooms
const roomGroups = groupUsersByRoom(onlineUsers)

// Remove stale presence data (users not seen in 10 minutes)
const activeUsers = filterStalePresence(onlineUsers, 10)
```

## Integration with Existing Systems

### Chat Real-time Integration
The presence system integrates seamlessly with the existing `useChatRealtime` hook:

```typescript
// In your main chat component
function ChatApp({ currentUser }) {
  // Existing real-time features
  const chatRealtime = useChatRealtime(currentUser?.id)
  const chatMessages = useChatMessages(currentUser)
  
  // Add presence tracking
  const presence = useOnlinePresence(currentUser, selectedRoom)
  
  return (
    <ChatLayout>
      <OnlinePresenceIndicator 
        currentUser={currentUser}
        activeRoomId={selectedRoom}
      />
      {/* Rest of chat UI */}
    </ChatLayout>
  )
}
```

### Database Fallback
The system provides database fallback when real-time presence is unavailable:
- Updates `user.is_online` and `user.last_seen` fields
- API endpoints can return database data when real-time fails
- Automatic synchronization between real-time and database states

## Performance Considerations

### Efficient Subscription Management
- Single presence channel per user session
- Automatic cleanup on component unmount
- Debounced updates to prevent excessive re-renders

### Network Adaptation
- Heartbeat intervals adapt to connection quality
- Reduced frequency on slow connections
- Smart reconnection with exponential backoff

### Memory Management
- Proper cleanup of timeouts and intervals
- Automatic removal of stale presence data
- Efficient state updates using React optimizations

## Testing

### Manual Testing
Use the provided test script:
```bash
node scripts/test-online-presence.js
```

### Integration Testing
```typescript
import { renderHook } from '@testing-library/react'
import { useOnlinePresence } from '@/hooks/chat-app/useOnlinePresence'

test('presence hook tracks online users', async () => {
  const { result } = renderHook(() => 
    useOnlinePresence(mockUser, 'test-room')
  )
  
  expect(result.current.connectionStatus).toBe('connecting')
  // ... more test assertions
})
```

## Security Considerations

### Access Control
- Presence data respects existing room membership
- Only room members can see room-specific presence
- Admin endpoints require proper authentication

### Data Privacy
- Only essential user data is tracked (ID, username, display name)
- No sensitive information in presence payload
- Automatic cleanup of presence data on disconnect

## Troubleshooting

### Common Issues

1. **Presence not updating**
   - Check Supabase connection and credentials
   - Verify user authentication
   - Check browser network connectivity

2. **High bandwidth usage**
   - Presence system adapts to network conditions
   - Consider adjusting heartbeat intervals for your use case
   - Use room-specific presence instead of global when possible

3. **Stale presence data**
   - Automatic cleanup removes stale data after timeout
   - Manual cleanup available via utility functions
   - Check system clock synchronization

### Debug Information
The hook provides debug information:
```typescript
const { stats, connectionStatus, reconnectAttempts } = useOnlinePresence(user)

console.log('Connection:', connectionStatus)
console.log('Heartbeat interval:', stats.heartbeatInterval)
console.log('Reconnect attempts:', reconnectAttempts)
```

## Future Enhancements

- **Typing indicators** integration with presence
- **Custom presence states** (away, busy, etc.)
- **Presence history** and analytics
- **Mobile app** push notification integration
- **Presence-based** smart notifications

## License

This presence system is part of the Desco Company application and follows the same licensing terms.
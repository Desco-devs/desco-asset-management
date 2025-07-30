# Real-time Messaging Layer Implementation Guide

## Overview

The real-time messaging layer for the Desco Company chat system has been fully implemented using Supabase real-time subscriptions. This provides instant message delivery, room synchronization, typing indicators, and presence management.

## Architecture

### Core Components

#### 1. `useRealtimeMessaging`
- **Purpose**: Handles real-time message broadcasting and reception
- **Features**:
  - Database change subscriptions for message INSERT/UPDATE/DELETE
  - Broadcast channels for instant message delivery
  - Typing indicators with auto-timeout
  - Message deduplication and ordering

#### 2. `useRealtimeRooms`
- **Purpose**: Manages real-time room state synchronization
- **Features**:
  - Room membership change notifications
  - Unread count updates
  - Room metadata synchronization
  - Member count tracking

#### 3. `useRealtimeSubscriptionManager`
- **Purpose**: Efficient channel lifecycle management
- **Features**:
  - Connection retry logic with exponential backoff
  - Subscription status tracking
  - Auto-cleanup on component unmount
  - Global error handling

#### 4. `usePresenceAndTyping`
- **Purpose**: User presence and typing indicator management
- **Features**:
  - Global user presence tracking
  - Room-specific typing indicators
  - Status updates (online/away/busy/offline)
  - Automatic cleanup of stale indicators

## Integration with Existing Hooks

### Updated `useSupabaseMessages`
```typescript
const {
  messages,
  loading,
  error,
  sendMessage,
  typingUsers,
  sendTypingIndicator,
  broadcastMessage,
  isRealtimeConnected,
} = useSupabaseMessages({ 
  roomId, 
  userId, 
  enabled: true 
});
```

### Updated `useSupabaseRooms`
```typescript
const {
  rooms,
  loading,
  error,
  markRoomAsRead,
  refetch,
  roomStates,
  broadcastRoomUpdate,
  isRealtimeConnected,
} = useSupabaseRooms({ 
  userId, 
  enabled: true 
});
```

## API Integration

### Message Broadcasting
The message sending API (`/api/messages/send/route.ts`) now automatically broadcasts new messages to all room members:

```typescript
// After creating message in database
const channel = supabase.channel(`room_${roomId}`);
await channel.send({
  type: 'broadcast',
  event: 'message_event',
  payload: {
    message: result,
    event_type: 'message_sent',
    room_id: roomId,
    sender_id: user.id,
  },
});
```

## Real-time Event Flow

### Message Delivery
1. User sends message via API
2. Message is saved to database
3. Supabase triggers database change event
4. Broadcast event is sent to room channel
5. All connected room members receive the message instantly
6. UI updates without page refresh

### Room Synchronization
1. Room membership changes (join/leave)
2. Database triggers change events
3. Real-time hooks update local state
4. UI reflects new member counts and room states
5. Unread counts are updated automatically

### Typing Indicators
1. User starts typing in message input
2. `startTyping()` is called
3. Typing event is broadcast to room members
4. Other users see typing indicator
5. Auto-timeout stops typing after 3 seconds
6. Manual `stopTyping()` on message send

### Presence Management
1. User connects to global presence channel
2. Presence is tracked with heartbeat updates
3. Online/offline status is broadcast to all users
4. Room-specific online user lists are maintained
5. Status changes (away/busy) are synchronized

## Usage Examples

### Basic Message Component
```typescript
import { useSupabaseMessages, usePresenceAndTyping } from '@/hooks/chat-app';

function MessageComponent({ roomId, userId }) {
  const {
    messages,
    sendMessage,
    typingUsers,
    sendTypingIndicator,
    isRealtimeConnected
  } = useSupabaseMessages({ roomId, userId });

  const {
    onlineUsers,
    startTyping,
    stopTyping,
    isUserOnline
  } = usePresenceAndTyping({ userId, roomId });

  const handleSend = async (content: string) => {
    await sendMessage(content);
    stopTyping(); // Stop typing when message is sent
  };

  const handleTyping = () => {
    startTyping(); // Will auto-stop after 3 seconds
  };

  return (
    <div>
      <div className="connection-status">
        {isRealtimeConnected ? 'Connected' : 'Connecting...'}
      </div>
      
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className="message">
            <span className="sender">{message.sender.full_name}</span>
            <span className="content">{message.content}</span>
            <span className="online-indicator">
              {isUserOnline(message.sender_id) && '🟢'}
            </span>
          </div>
        ))}
      </div>

      <div className="typing-indicators">
        {typingUsers.map(user => (
          <div key={user.user_id}>
            {user.username} is typing...
          </div>
        ))}
      </div>

      <input
        onChange={handleTyping}
        onKeyPress={(e) => e.key === 'Enter' && handleSend(e.target.value)}
        placeholder="Type a message..."
      />
    </div>
  );
}
```

### Room List with Real-time Updates
```typescript
import { useSupabaseRooms } from '@/hooks/chat-app';

function RoomList({ userId }) {
  const {
    rooms,
    loading,
    markRoomAsRead,
    isRealtimeConnected
  } = useSupabaseRooms({ userId });

  return (
    <div>
      <div className="status">
        Real-time: {isRealtimeConnected ? '✅' : '❌'}
      </div>
      
      {rooms.map(room => (
        <div key={room.id} className="room-item">
          <h3>{room.name}</h3>
          <p>{room.member_count} members</p>
          {room.unread_count > 0 && (
            <span className="unread-badge">{room.unread_count}</span>
          )}
          <button onClick={() => markRoomAsRead(room.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Performance Considerations

### Subscription Management
- Subscriptions are automatically cleaned up on component unmount
- Connection retry logic prevents infinite reconnection attempts
- Heartbeat intervals maintain presence without excessive API calls

### Message Deduplication
- Messages are deduplicated to prevent double-display
- Optimistic updates work alongside real-time subscriptions
- Chronological ordering is maintained automatically

### Typing Indicator Optimization
- Auto-timeout prevents stale typing indicators
- Cleanup intervals remove expired indicators
- Room-specific channels prevent global typing noise

## Error Handling

### Connection Failures
- Automatic retry with exponential backoff
- Connection status indicators for user feedback
- Graceful degradation to polling fallback

### Message Delivery
- Failed broadcasts don't block message creation
- Error logging for debugging
- User feedback for delivery status

## Security Considerations

### Application-Level Security
- Database subscriptions respect application authentication
- Users only receive updates for rooms they're members of (enforced by API)
- Message content is filtered by room membership (application-level)

### Authentication
- All real-time operations require valid Supabase auth
- User identity is verified before subscription
- Presence data includes authenticated user information

## Testing

### Connection Testing
```typescript
// Test real-time connection
const { isRealtimeConnected } = useSupabaseMessages({ roomId, userId });
console.log('Real-time connected:', isRealtimeConnected);
```

### Message Flow Testing
```typescript
// Test message broadcasting
const { broadcastMessage } = useRealtimeMessaging({ roomId, userId });
await broadcastMessage(testMessage, 'message_sent');
```

## Troubleshooting

### Common Issues
1. **Messages not appearing instantly**: Check real-time connection status
2. **Typing indicators stuck**: Verify auto-timeout is working
3. **Presence not updating**: Check heartbeat interval and connection
4. **Memory leaks**: Ensure component cleanup is working

### Debug Tools
```typescript
// Enable debug logging
localStorage.setItem('supabase.realtime.debug', 'true');

// Check subscription status
const { getAllSubscriptions } = useRealtimeSubscriptionManager();
console.log('Active subscriptions:', getAllSubscriptions());
```

## Migration Notes

### From Polling to Real-time
- Old polling intervals have been removed
- TanStack Query integration maintained for compatibility
- API routes still work but now include broadcasting

### Breaking Changes
- `useSupabaseMessages` now requires `userId` parameter
- `useSupabaseRooms` now requires `userId` parameter
- Real-time connection status is now available in return values

This implementation provides a robust, scalable real-time messaging foundation that can be extended with additional features like file attachments, message reactions, and push notifications.
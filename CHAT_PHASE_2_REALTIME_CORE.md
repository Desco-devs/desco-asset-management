# Chat System Phase 2: Real-time Core Implementation

This document outlines the Phase 2 implementation of the chat system's real-time functionality, building upon the foundational Phase 1 infrastructure.

## Overview

Phase 2 enhances the chat system with comprehensive real-time capabilities:

- **Enhanced Message Broadcasting** with optimistic updates and delivery confirmation
- **Room State Sync** with presence tracking and typing indicators  
- **Connection Management** with heartbeat monitoring and automatic reconnection
- **Network-Aware Performance** with adaptive throttling and quality detection

## Architecture

### Real-time Layer Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Real-time Layer (Phase 2)                │
├─────────────────────────────────────────────────────────────┤
│ useChatConnection  │ Connection management & heartbeat      │
│ useChatRealtime    │ Core real-time subscriptions          │
│ useChatPresence    │ Online status & room presence         │
│ useChatTyping      │ Typing indicators & broadcast         │
│ useChatMessages    │ Optimistic updates & retry logic     │
│ useChatApp         │ Enhanced integration layer           │
├─────────────────────────────────────────────────────────────┤
│                 Foundation Layer (Phase 1)                  │
│                    Database & API Routes                    │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Enhanced Message Broadcasting (`useChatMessages.ts`)

**Features:**
- Optimistic message updates for instant UI feedback
- Automatic retry logic with exponential backoff
- Message delivery confirmation and status tracking
- Proper error handling with user-friendly feedback

**Key Functions:**
```typescript
const { sendMessage, pendingMessages, manualRetry, cancelMessage } = useChatMessages(currentUser)

// Send message with optimistic update
await sendMessage({
  roomId: 'room-123',
  content: 'Hello world!',
  type: 'TEXT'
})

// Handle failed messages
const failedMessages = getPendingMessages(roomId).filter(m => m.failed)
```

**Message States:**
- `pending`: Message being sent (optimistic update)
- `sent`: Message confirmed delivered
- `failed`: Message failed, retry available

### 2. Room State Sync (`useChatPresence.ts`)

**Features:**
- Real-time online/offline status tracking
- Room-specific presence (who's viewing which room)
- Automatic presence broadcasting with heartbeat
- Efficient state management with cleanup

**Key Functions:**
```typescript
const { onlineUsers, usersInCurrentRoom, isUserOnline } = useChatPresence(currentUser, roomId)

// Check if user is online
const isOnline = isUserOnline('user-123')

// Get users currently in room
const activeUsers = usersInCurrentRoom // Array of users in current room
```

**Presence States:**
- Global online/offline status
- Room-specific presence tracking
- Automatic presence updates on room changes

### 3. Typing Indicators (`useChatTyping.ts`)

**Features:**
- Real-time typing indicators using Supabase broadcast
- Automatic timeout management (3 seconds)
- Throttled typing events to prevent spam
- Room-specific typing state

**Key Functions:**
```typescript
const { getTypingText, handleTyping, isAnyoneTyping } = useChatTyping(currentUser)

// Handle input typing
onInputChange = (e) => {
  handleTyping(roomId) // Throttled typing broadcast
}

// Display typing indicator
const typingText = getTypingText(roomId) // "John is typing..."
```

**Typing Display Logic:**
- 1 user: "John is typing..."
- 2 users: "John and Jane are typing..."
- 3+ users: "John, Jane and 2 others are typing..."

### 4. Connection Management (`useChatConnection.ts`)

**Features:**
- Enhanced connection status with detailed metrics
- Heartbeat monitoring with automatic reconnection
- Network quality detection and adaptation
- Connection diagnostics and user feedback

**Key Functions:**
```typescript
const { 
  connectionStatus, 
  isConnected, 
  connectionQuality, 
  metrics, 
  reconnect 
} = useChatConnection(userId)

// Connection states: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'
// Quality levels: 'poor' | 'fair' | 'good' | 'offline' | 'unknown'
```

**Connection Features:**
- Automatic reconnection with exponential backoff
- Network-aware retry delays
- Connection metrics (uptime, reconnect attempts)
- Heartbeat every 30 seconds

### 5. Enhanced Real-time Subscriptions (`useChatRealtime.ts`)

**Enhancements over Phase 1:**
- Optimistic message update utilities
- Enhanced invalidation patterns with delivery confirmation
- Better error handling and reconnection logic
- Network-adaptive throttling

**New Functions:**
```typescript
const { 
  updateMessageOptimistically, 
  markMessageFailed, 
  reconnect 
} = useChatRealtime(userId)

// Optimistically update message
updateMessageOptimistically(message, isConfirmed)

// Mark message as failed
markMessageFailed(messageId, roomId)
```

### 6. Integrated Chat App (`useChatApp.ts`)

**Enhanced Integration:**
- All real-time features integrated into main chat hook
- Enhanced message sending with optimistic updates
- Typing and presence tracking
- Connection status monitoring

**New Features:**
```typescript
const {
  // Enhanced messaging
  handleSendMessage,
  handleTyping,
  handleRetryMessage,
  handleCancelMessage,
  
  // Real-time status
  currentRoomTyping,
  currentRoomPresence,
  onlineUsers,
  isRealtimeConnected,
  connectionQuality,
  
  // System hooks
  realtimeStatus,
  connectionStatus,
  presenceSystem,
  typingSystem,
  messageSystem
} = useChatApp({ userId })
```

## Usage Examples

### Basic Message Sending with Optimistic Updates

```typescript
const ChatMessageInput = ({ roomId, currentUser }) => {
  const { handleSendMessage, handleTyping, currentRoomTyping } = useChatApp({ 
    userId: currentUser.id 
  })
  
  const [message, setMessage] = useState('')
  
  const sendMessage = async () => {
    if (!message.trim()) return
    
    try {
      await handleSendMessage(roomId, message)
      setMessage('')
    } catch (error) {
      // Error handling is managed by the hook
      console.error('Send failed:', error)
    }
  }
  
  return (
    <div>
      <input
        value={message}
        onChange={(e) => {
          setMessage(e.target.value)
          handleTyping(roomId) // Automatic typing indicator
        }}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      {currentRoomTyping && (
        <div className="typing-indicator">{currentRoomTyping}</div>
      )}
    </div>
  )
}
```

### Presence and Online Status

```typescript
const RoomMembersList = ({ roomId, currentUser }) => {
  const { currentRoomPresence, onlineUsers } = useChatApp({ 
    userId: currentUser.id 
  })
  
  return (
    <div>
      <h3>Active in Room ({currentRoomPresence.length})</h3>
      {currentRoomPresence.map(user => (
        <div key={user.user_id}>
          <span className="online-indicator" />
          {user.full_name}
        </div>
      ))}
      
      <h3>All Online ({onlineUsers.length})</h3>
      {onlineUsers.map(user => (
        <div key={user.user_id}>{user.full_name}</div>
      ))}
    </div>
  )
}
```

### Connection Status Display

```typescript
const ConnectionStatus = ({ userId }) => {
  const { 
    isConnected, 
    connectionQuality, 
    statusMessage, 
    reconnect, 
    canReconnect 
  } = useChatConnection(userId)
  
  return (
    <div className={`connection-status ${connectionQuality}`}>
      <span>{statusMessage}</span>
      {!isConnected && canReconnect && (
        <button onClick={reconnect}>Reconnect</button>
      )}
    </div>
  )
}
```

### Message Retry Interface

```typescript
const MessageItem = ({ message, onRetry, onCancel }) => {
  const optimisticMessage = message as OptimisticMessage
  
  return (
    <div className={`message ${optimisticMessage.pending ? 'pending' : ''} ${optimisticMessage.failed ? 'failed' : ''}`}>
      <p>{message.content}</p>
      
      {optimisticMessage.pending && (
        <span className="status">Sending...</span>
      )}
      
      {optimisticMessage.failed && (
        <div className="retry-actions">
          <span className="status">Failed to send</span>
          <button onClick={() => onRetry(optimisticMessage.optimistic_id)}>
            Retry
          </button>
          <button onClick={() => onCancel(optimisticMessage.optimistic_id)}>
            Cancel
          </button>
        </div>
      )}
      
      {optimisticMessage.sent && (
        <span className="status">Sent</span>
      )}
    </div>
  )
}
```

## Network Performance

### Adaptive Throttling

The system automatically adjusts performance based on network conditions:

- **WiFi/4G/5G**: 500ms throttling (responsive)
- **3G**: 1000ms throttling (balanced)
- **2G/Slow**: 1500ms throttling (conservative)
- **Offline**: 2000ms throttling (recovery mode)

### Connection Quality Detection

```typescript
const connectionQuality = useChatConnection(userId).connectionQuality
// Returns: 'poor' | 'fair' | 'good' | 'offline' | 'unknown'
```

Quality levels affect:
- Reconnection delays
- Heartbeat intervals
- Throttling aggressiveness
- Retry backoff timing

## Error Handling

### Message Delivery Failures

1. **Optimistic Update**: Message appears immediately in UI
2. **Network Failure**: Message marked as `failed` with retry option
3. **Automatic Retry**: Up to 3 attempts with exponential backoff
4. **Manual Retry**: User can manually retry failed messages
5. **Cancel Option**: User can remove failed messages from UI

### Connection Failures

1. **Detection**: Heartbeat monitoring detects connection loss
2. **Reconnection**: Automatic reconnection with progressive delays
3. **Max Attempts**: Up to 10 reconnection attempts
4. **User Feedback**: Clear status messages and manual reconnect option
5. **Network Recovery**: Automatic reconnection when network returns

## Performance Characteristics

### Memory Management
- Automatic cleanup of subscriptions and timeouts
- Efficient state management with minimal re-renders
- Proper cleanup on component unmount

### Scalability
- Throttled invalidations prevent excessive re-renders
- Network-aware performance adjustments
- Efficient presence state updates

### Reliability
- Comprehensive error boundaries
- Graceful degradation on connection loss
- Data consistency maintained during network issues

## Migration from Phase 1

Phase 2 is fully backward-compatible with Phase 1. To migrate:

1. **Import Enhanced Hooks**: Use the new hooks from the updated index
2. **Optional Features**: Add typing, presence, and connection status as needed
3. **Progressive Enhancement**: Existing functionality continues to work unchanged

```typescript
// Phase 1 (still works)
const { handleSendMessage } = useChatApp({ userId })

// Phase 2 (enhanced)
const { 
  handleSendMessage,        // Now with optimistic updates
  handleTyping,             // New typing indicators
  currentRoomPresence,      // New presence tracking
  connectionStatus          // New connection management
} = useChatApp({ userId })
```

## Future Enhancements

Phase 2 provides the foundation for future features:

- **Phase 3**: Message reactions and thread replies
- **Phase 4**: Voice/video calling integration
- **Phase 5**: Advanced features (message scheduling, AI integration)

The real-time infrastructure is designed to support these upcoming features with minimal changes to the core architecture.

## File Structure

```
src/hooks/chat-app/
├── useChatApp.ts           # Enhanced main hook
├── useChatRealtime.ts      # Enhanced core subscriptions
├── useChatPresence.ts      # NEW: Presence tracking
├── useChatTyping.ts        # NEW: Typing indicators
├── useChatMessages.ts      # NEW: Optimistic messaging
├── useChatConnection.ts    # NEW: Connection management
└── index.ts                # Updated exports
```

All Phase 2 functionality is now ready for integration with UI components and provides a robust, scalable foundation for real-time chat features.
## Architecture Summary

Your chat app uses a hybrid approach combining Socket.io for real-time features with REST APIs for data persistence. The system is built around:

Core Models: rooms → room_members → messages + room_invitations

Key Components:
- SocketContext.tsx: Global Socket.io provider with centralized event handling
- useSocket.ts: Core connection management with auth and error handling
- Chat hooks: Specialized hooks for rooms, messages, invitations, and user status
- API routes: RESTful endpoints for data persistence and initial loading

## Message Flow Process

1. Send Message: MessageInput → Optimistic UI → Socket.io message:send → Server validates → DB save → Broadcast message:new → Update all clients
2. Receive Message: Socket message:new event → Local state update → Cache invalidation → UI re-render
3. Message States: Pending (optimistic) → Sent (acknowledged) → Delivered (to all room members)

## Real-time Features

- Room Management: Create/join/leave rooms with live member updates
- Typing Indicators: Real-time typing status across room members
- Online Status: User presence tracking with online/offline broadcasts
- Invitations: Real-time invitation notifications and responses
- Message Delivery: Optimistic updates with acknowledgments

## Key Technical Patterns

- State Management: React Query for API data + local reducer for real-time messages
- Error Handling: Connection resilience, retry mechanisms, fallback polling
- Performance: Cursor-based pagination, lazy loading, optimistic updates
- Security: Authentication via Socket.io events, room membership validation

The implementation provides excellent UX through optimistic updates while maintaining data consistency via the hybrid Socket.io + REST API approach.
# Viewer Chat Integration Plan

## Overview
Integrate chat functionality into the assets page for VIEWER role users while reusing existing admin chat infrastructure. This creates a unified communication system where admins and viewers can interact in the same chat environment.

## Current State Analysis

### Assets Page Structure
- **Main Route:** `/assets` (viewer's landing page after login)
- **Layout:** Server-side auth check in `src/app/assets/layout.tsx`
- **Components:** 
  - `AssetsHeader` - Top navigation
  - `AssetsClientViewer` - Main content area with equipment/vehicle grids
- **Features:** Asset viewing, filtering, search, pagination

### Existing Chat Infrastructure
- **Location:** `src/app/(admin-dashboard)/chat-app/`
- **Hooks:** Comprehensive chat system in `src/hooks/chat-app/`
- **Backend:** Supabase real-time with Prisma models
- **Features:** Rooms, invitations, typing indicators, message pagination

## Integration Strategy

### Phase 1: UI Integration (Assets Page Enhancement)

#### 1.1 Add Chat Toggle to Assets Header
**File:** `src/app/assets/components/AssetsHeader.tsx`
- Add floating chat toggle button (bottom-right corner)
- Chat icon with unread message badge
- Toggle between assets view and chat overlay

#### 1.2 Create Chat Overlay Component
**New File:** `src/app/assets/components/ChatOverlay.tsx`
- Modal/slide-over style chat interface
- Responsive design (mobile-friendly)
- Close button to return to assets view
- Minimized state option

#### 1.3 Viewer-Specific Chat Components
**New Directory:** `src/app/assets/chat-components/`

**Components to Create:**
- `ViewerChatInterface.tsx` - Main chat container
- `ViewerRoomsList.tsx` - Simplified room list (joined rooms only)
- `ViewerMessagesList.tsx` - Message display (reuse admin component)
- `ViewerMessageInput.tsx` - Message input (simplified features)
- `ViewerChatHeader.tsx` - Chat header with room info

### Phase 2: Hook Modifications (Role-Based Access)

#### 2.1 Extend Existing Chat Hooks
**Files to Modify:**
- `src/hooks/chat-app/useRooms.ts`
- `src/hooks/chat-app/useChatApp.ts`
- `src/hooks/chat-app/useChatInvitations.ts`

**Changes:**
- Add role-based filtering for room visibility
- Viewers see only rooms they're members of
- Remove room creation capabilities for viewers
- Maintain invitation acceptance functionality

#### 2.2 Create Viewer-Specific Hook
**New File:** `src/hooks/chat-app/useViewerChat.ts`
- Wrapper around existing chat hooks
- Simplified interface for viewer needs
- Pre-configured permissions and restrictions

### Phase 3: Backend Considerations

#### 3.1 Database Schema (No Changes Needed)
- Current Prisma schema already supports the requirements
- `room_member` table handles user-room relationships
- `room_invitation` table manages invitations
- Role-based access controlled at application level

#### 3.2 API Routes (Existing Routes Sufficient)
- Reuse existing API endpoints in `src/app/api/`
- Add role validation middleware if needed
- No new database operations required

### Phase 4: User Experience Enhancements

#### 4.1 Notification System
- Real-time message notifications while browsing assets
- Browser notifications (with permission)
- Unread message counters

#### 4.2 Mobile Optimization
- Responsive chat overlay
- Touch-friendly interface
- Proper keyboard handling on mobile

## Implementation Roadmap

### Sprint 1: Foundation (Week 1)
- [ ] Create chat toggle button in AssetsHeader
- [ ] Implement ChatOverlay component structure
- [ ] Set up viewer chat components directory
- [ ] Create basic ViewerChatInterface

### Sprint 2: Core Chat Features (Week 2)
- [ ] Implement ViewerRoomsList (joined rooms only)
- [ ] Adapt MessagesList for viewer use
- [ ] Create simplified MessageInput
- [ ] Add ViewerChatHeader with room info

### Sprint 3: Integration & Hooks (Week 3)
- [ ] Modify existing chat hooks for role-based access
- [ ] Create useViewerChat wrapper hook
- [ ] Implement invitation acceptance flow
- [ ] Add real-time message updates

### Sprint 4: Polish & Testing (Week 4)
- [ ] Add notification system
- [ ] Mobile responsiveness testing
- [ ] Cross-browser compatibility
- [ ] Performance optimization
- [ ] User acceptance testing

## File Structure

```
src/app/assets/
├── page.tsx (existing - modify to include chat toggle)
├── layout.tsx (existing - no changes)
├── components/
│   ├── AssetsHeader.tsx (modify - add chat toggle)
│   ├── ChatOverlay.tsx (new)
│   └── AssetsClientViewer.tsx (existing - no changes)
├── chat-components/ (new directory)
│   ├── ViewerChatInterface.tsx
│   ├── ViewerRoomsList.tsx
│   ├── ViewerMessagesList.tsx
│   ├── ViewerMessageInput.tsx
│   └── ViewerChatHeader.tsx
└── stores/ (existing - may extend for chat state)

src/hooks/chat-app/
├── useViewerChat.ts (new)
├── useRooms.ts (modify for role filtering)
├── useChatApp.ts (modify for viewer permissions)
└── [other existing hooks] (minimal changes)
```

## Technical Considerations

### State Management
- Extend existing Zustand stores or create viewer-specific stores
- Manage chat overlay open/closed state
- Handle notification state and unread counts

### Performance
- Lazy load chat components when first opened
- Implement message virtualization for large conversations
- Optimize real-time subscription management

### Security
- Ensure viewers can only access rooms they're members of
- Validate permissions on all chat operations
- Sanitize message content and file uploads

### Accessibility
- Keyboard navigation for chat interface
- Screen reader compatibility
- Focus management when opening/closing chat

## Success Criteria

### Functional Requirements
- [ ] Viewers can access chat from assets page
- [ ] Viewers can participate in rooms they're invited to
- [ ] Real-time messaging works seamlessly
- [ ] Mobile-responsive chat interface
- [ ] Message history and pagination

### Non-Functional Requirements
- [ ] Chat overlay doesn't impact assets page performance
- [ ] Less than 2-second load time for chat interface
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Accessible to users with disabilities
- [ ] Maintains existing assets page functionality

## Risk Mitigation

### Technical Risks
- **Performance Impact:** Implement lazy loading and code splitting
- **Real-time Conflicts:** Use proper connection management
- **Mobile UX Issues:** Extensive mobile testing and responsive design

### User Experience Risks
- **Complexity:** Keep viewer interface simple and intuitive
- **Navigation Confusion:** Clear visual indicators for chat vs assets
- **Notification Overload:** Implement smart notification settings

## Future Enhancements (Post-MVP)

### Phase 2 Features
- File sharing in chat (images, documents)
- Asset-specific chat rooms (discussion per equipment/vehicle)
- Voice messages
- Message search functionality
- Chat themes and customization

### Advanced Features
- Video/audio calls integration
- Asset maintenance discussions
- Scheduled maintenance chat reminders
- Integration with asset reports and documentation

## Testing Strategy

### Unit Testing
- Test chat hooks with role-based scenarios
- Component testing for viewer-specific UI
- Mock real-time subscriptions

### Integration Testing  
- Test chat overlay integration with assets page
- Real-time message flow testing
- Cross-role communication testing (admin ↔ viewer)

### User Acceptance Testing
- Viewer user journey testing
- Mobile device testing
- Performance testing with multiple concurrent users

## Deployment Considerations

### Environment Setup
- Ensure Supabase real-time is properly configured
- Verify database permissions for chat tables
- Test in staging environment first

### Monitoring
- Add logging for chat-related errors
- Monitor real-time connection health
- Track user engagement metrics

### Rollback Plan
- Feature flag for chat integration
- Database backup before deployment
- Quick disable mechanism if issues arise

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Set up development environment** for chat integration
3. **Create feature branch** for chat development
4. **Begin Sprint 1** implementation
5. **Regular progress reviews** and plan adjustments

---

*Last Updated: 2025-08-01*
*Status: Planning Phase*
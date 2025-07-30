import { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import { chatCache, cacheInvalidation } from '@/lib/database/chat-cache'

/**
 * Real-time subscription patterns optimized for chat functionality
 * This module provides optimized patterns for Supabase real-time subscriptions
 * with proper cache invalidation and data synchronization
 */

export interface ChatRealtimeConfig {
  supabase: SupabaseClient
  userId: string
  onError?: (error: Error) => void
  onConnect?: () => void
  onDisconnect?: () => void
}

export interface MessageEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: 'messages'
  new?: any
  old?: any
  eventType: 'message:new' | 'message:updated' | 'message:deleted'
}

export interface RoomEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: 'rooms' | 'room_members' | 'room_invitations'
  new?: any
  old?: any
  eventType: 'room:created' | 'room:updated' | 'room:deleted' | 'member:joined' | 'member:left' | 'invitation:created' | 'invitation:updated'
}

export interface PresenceEvent {
  userId: string
  isOnline: boolean
  lastSeen?: Date
}

/**
 * Optimized chat subscription manager
 */
export class ChatRealtimeManager {
  private config: ChatRealtimeConfig
  private channels: Map<string, RealtimeChannel> = new Map()
  private isConnected = false

  constructor(config: ChatRealtimeConfig) {
    this.config = config
  }

  /**
   * Subscribe to all user's chat-related events
   */
  async subscribeToUserChats(callbacks: {
    onMessage?: (event: MessageEvent) => void
    onRoom?: (event: RoomEvent) => void
    onPresence?: (event: PresenceEvent) => void
    onTyping?: (event: { roomId: string; userId: string; isTyping: boolean }) => void
  }) {
    try {
      // TODO: Implement real-time subscriptions
      // These methods need to be implemented in the ChatRealtimeManager class
      console.log('Real-time subscriptions setup - TODO: implement', { callbacks })
      
      // Subscribe to messages in user's rooms
      // await this.subscribeToMessages(callbacks.onMessage)
      
      // Subscribe to room changes  
      // await this.subscribeToRooms(callbacks.onRoom)
      
      // Subscribe to user presence
      // await this.subscribeToPresence(callbacks.onPresence)
      
      // Subscribe to typing indicators
      // if (callbacks.onTyping) {
      //   await this.subscribeToTyping(callbacks.onTyping)
      // }

      this.isConnected = true
      this.config.onConnect?.()
      
    } catch (error) {
      this.config.onError?.(error as Error)
      throw error
    }
  }

  /**
   * Subscribe to messages with optimized filtering
   */
  async subscribeToMessages(onMessage?: (event: MessageEvent) => void) {
    const channel = this.config.supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          // Only listen to messages in rooms where user is a member
          filter: `room_id=in.(${await this.getUserRoomIds()})`,
        },
        (payload) => {
          this.handleMessageEvent(payload, onMessage)
        }
      )
      .subscribe()

    this.channels.set('messages', channel)
  }

  /**
   * Subscribe to room-related changes
   */
  async subscribeToRooms(onRoom?: (event: RoomEvent) => void) {
    // Subscribe to rooms
    const roomsChannel = this.config.supabase
      .channel('rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `owner_id=eq.${this.config.userId}`,
        },
        (payload) => {
          this.handleRoomEvent(payload, onRoom)
        }
      )
      .subscribe()

    // Subscribe to room memberships
    const membersChannel = this.config.supabase
      .channel('room_members')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `user_id=eq.${this.config.userId}`,
        },
        (payload) => {
          this.handleMembershipEvent(payload, onRoom)
        }
      )
      .subscribe()

    // Subscribe to invitations
    const invitationsChannel = this.config.supabase
      .channel('room_invitations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_invitations',
          filter: `invited_user=eq.${this.config.userId}`,
        },
        (payload) => {
          this.handleInvitationEvent(payload, onRoom)
        }
      )
      .subscribe()

    this.channels.set('rooms', roomsChannel)
    this.channels.set('room_members', membersChannel)
    this.channels.set('room_invitations', invitationsChannel)
  }

  /**
   * Subscribe to user presence updates
   */
  async subscribeToPresence(onPresence?: (event: PresenceEvent) => void) {
    const channel = this.config.supabase
      .channel('user_presence')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=neq.${this.config.userId}`, // Don't listen to own presence
        },
        (payload) => {
          if (payload.new?.is_online !== payload.old?.is_online || 
              payload.new?.last_seen !== payload.old?.last_seen) {
            
            // Invalidate user cache
            cacheInvalidation.invalidateUser(payload.new.id)
            
            onPresence?.({
              userId: payload.new.id,
              isOnline: payload.new.is_online,
              lastSeen: payload.new.last_seen ? new Date(payload.new.last_seen) : undefined,
            })
          }
        }
      )
      .subscribe()

    this.channels.set('user_presence', channel)
  }

  /**
   * Subscribe to typing indicators using broadcast
   */
  async subscribeToTyping(onTyping: (event: { roomId: string; userId: string; isTyping: boolean }) => void) {
    const channel = this.config.supabase
      .channel('typing_indicators')
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload.userId !== this.config.userId) {
          onTyping(payload.payload)
        }
      })
      .subscribe()

    this.channels.set('typing_indicators', channel)
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(roomId: string, isTyping: boolean) {
    const channel = this.channels.get('typing_indicators')
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          roomId,
          userId: this.config.userId,
          isTyping,
        },
      })
    }
  }

  /**
   * Handle message events with cache invalidation
   */
  private handleMessageEvent(payload: any, onMessage?: (event: MessageEvent) => void) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    let eventTypeEnum: MessageEvent['eventType']
    switch (eventType) {
      case 'INSERT':
        eventTypeEnum = 'message:new'
        // Invalidate unread counts for all room members except sender
        if (newRecord?.room_id && newRecord?.sender_id) {
          cacheInvalidation.invalidateAfterMessage(newRecord.room_id, newRecord.sender_id)
        }
        break
      case 'UPDATE':
        eventTypeEnum = 'message:updated'
        break
      case 'DELETE':
        eventTypeEnum = 'message:deleted'
        break
      default:
        return
    }

    onMessage?.({
      type: eventType,
      table: 'messages',
      new: newRecord,
      old: oldRecord,
      eventType: eventTypeEnum,
    })
  }

  /**
   * Handle room events with cache invalidation
   */
  private handleRoomEvent(payload: any, onRoom?: (event: RoomEvent) => void) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    let eventTypeEnum: RoomEvent['eventType']
    switch (eventType) {
      case 'INSERT':
        eventTypeEnum = 'room:created'
        break
      case 'UPDATE':
        eventTypeEnum = 'room:updated'
        break
      case 'DELETE':
        eventTypeEnum = 'room:deleted'
        if (oldRecord?.id) {
          cacheInvalidation.invalidateRoom(oldRecord.id)
        }
        break
      default:
        return
    }

    onRoom?.({
      type: eventType,
      table: 'rooms',
      new: newRecord,
      old: oldRecord,
      eventType: eventTypeEnum,
    })
  }

  /**
   * Handle membership events with cache invalidation
   */
  private handleMembershipEvent(payload: any, onRoom?: (event: RoomEvent) => void) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    let eventTypeEnum: RoomEvent['eventType']
    switch (eventType) {
      case 'INSERT':
        eventTypeEnum = 'member:joined'
        if (newRecord?.room_id && newRecord?.user_id) {
          cacheInvalidation.invalidateAfterMembershipChange(newRecord.room_id, newRecord.user_id)
        }
        break
      case 'DELETE':
        eventTypeEnum = 'member:left'
        if (oldRecord?.room_id && oldRecord?.user_id) {
          cacheInvalidation.invalidateAfterMembershipChange(oldRecord.room_id, oldRecord.user_id)
        }
        break
      default:
        return
    }

    onRoom?.({
      type: eventType,
      table: 'room_members',
      new: newRecord,
      old: oldRecord,
      eventType: eventTypeEnum,
    })
  }

  /**
   * Handle invitation events
   */
  private handleInvitationEvent(payload: any, onRoom?: (event: RoomEvent) => void) {
    const { eventType, new: newRecord, old: oldRecord } = payload
    
    let eventTypeEnum: RoomEvent['eventType']
    switch (eventType) {
      case 'INSERT':
        eventTypeEnum = 'invitation:created'
        break
      case 'UPDATE':
        eventTypeEnum = 'invitation:updated'
        break
      default:
        return
    }

    onRoom?.({
      type: eventType,
      table: 'room_invitations',
      new: newRecord,
      old: oldRecord,
      eventType: eventTypeEnum,
    })
  }

  /**
   * Get room IDs for the current user (for filtering)
   */
  private async getUserRoomIds(): Promise<string> {
    // This would typically come from the application state or a cached query
    // For now, return empty string to subscribe to all messages
    // In production, this should be optimized to only subscribe to relevant rooms
    return ''
  }

  /**
   * Update user's online status
   */
  async updatePresence(isOnline: boolean) {
    try {
      await this.config.supabase
        .from('users')
        .update({
          is_online: isOnline,
          last_seen: isOnline ? null : new Date().toISOString(),
        })
        .eq('id', this.config.userId)
        
      // Invalidate user cache
      cacheInvalidation.invalidateUser(this.config.userId)
      
    } catch (error) {
      this.config.onError?.(error as Error)
    }
  }

  /**
   * Cleanup all subscriptions
   */
  async unsubscribeAll() {
    for (const [name, channel] of this.channels) {
      try {
        await this.config.supabase.removeChannel(channel)
      } catch (error) {
        console.warn(`Failed to unsubscribe from ${name}:`, error)
      }
    }
    
    this.channels.clear()
    this.isConnected = false
    this.config.onDisconnect?.()
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      channelCount: this.channels.size,
      channels: Array.from(this.channels.keys()),
    }
  }
}

/**
 * Utility functions for common real-time patterns
 */
export const realtimeUtils = {
  /**
   * Create optimized message broadcast
   */
  async broadcastMessage(
    supabase: SupabaseClient,
    roomId: string,
    message: any
  ) {
    const channel = supabase.channel(`room:${roomId}`)
    
    await channel.send({
      type: 'broadcast',
      event: 'message:new',
      payload: message,
    })
  },

  /**
   * Create typing indicator with debouncing
   */
  createTypingIndicator(
    manager: ChatRealtimeManager,
    roomId: string,
    debounceMs = 1000
  ) {
    let typingTimeout: NodeJS.Timeout | null = null

    return {
      startTyping: () => {
        manager.sendTypingIndicator(roomId, true)
        
        if (typingTimeout) {
          clearTimeout(typingTimeout)
        }
        
        typingTimeout = setTimeout(() => {
          manager.sendTypingIndicator(roomId, false)
        }, debounceMs)
      },
      
      stopTyping: () => {
        if (typingTimeout) {
          clearTimeout(typingTimeout)
          typingTimeout = null
        }
        manager.sendTypingIndicator(roomId, false)
      },
    }
  },

  /**
   * Batch presence updates to reduce database load
   */
  createPresenceBatcher(
    manager: ChatRealtimeManager,
    batchIntervalMs = 5000
  ) {
    let pendingUpdate: boolean | null = null
    let updateTimeout: NodeJS.Timeout | null = null

    return {
      updatePresence: (isOnline: boolean) => {
        pendingUpdate = isOnline
        
        if (updateTimeout) {
          clearTimeout(updateTimeout)
        }
        
        updateTimeout = setTimeout(() => {
          if (pendingUpdate !== null) {
            manager.updatePresence(pendingUpdate)
            pendingUpdate = null
          }
        }, batchIntervalMs)
      },
      
      flush: () => {
        if (updateTimeout) {
          clearTimeout(updateTimeout)
          updateTimeout = null
        }
        
        if (pendingUpdate !== null) {
          manager.updatePresence(pendingUpdate)
          pendingUpdate = null
        }
      },
    }
  },
}
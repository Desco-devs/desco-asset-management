'use client'

import { useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase'
import { CHAT_QUERY_KEYS } from './queryKeys'
import type { RoomListItem, ChatUser } from '@/types/chat-app'

/**
 * Real-time Room List Updates
 * 
 * Handles instant updates to room list when:
 * - New messages arrive (update lastMessage, timestamp)
 * - Rooms are created/updated
 * - Room membership changes
 * 
 * This hook ensures the room sidebar is always current without delays
 */
export function useRoomListRealtime(currentUser?: ChatUser) {
  const queryClient = useQueryClient()
  const userId = currentUser?.id

  // Update room's last message immediately
  const updateRoomLastMessage = useCallback((roomId: string, message: any) => {
    if (!userId) return

    queryClient.setQueryData(
      CHAT_QUERY_KEYS.rooms(userId),
      (oldRooms: RoomListItem[] = []) => {
        return oldRooms.map(room => {
          if (room.id === roomId) {
            return {
              ...room,
              lastMessage: {
                content: message.content,
                sender_name: message.sender?.full_name || 'Unknown',
                created_at: message.created_at
              },
              updated_at: message.created_at
            }
          }
          return room
        }).sort((a, b) => {
          // Sort by most recent activity
          const aTime = new Date(a.updated_at || a.created_at).getTime()
          const bTime = new Date(b.updated_at || b.created_at).getTime()
          return bTime - aTime
        })
      }
    )
  }, [queryClient, userId])

  // Add new room to list immediately
  const addNewRoom = useCallback((room: any) => {
    if (!userId) return

    queryClient.setQueryData(
      CHAT_QUERY_KEYS.rooms(userId),
      (oldRooms: RoomListItem[] = []) => {
        // Check if room already exists
        const exists = oldRooms.some(r => r.id === room.id)
        if (exists) return oldRooms

        // Add new room at the top
        const newRooms = [room, ...oldRooms]
        return newRooms.sort((a, b) => {
          const aTime = new Date(a.updated_at || a.created_at).getTime()
          const bTime = new Date(b.updated_at || b.created_at).getTime()
          return bTime - aTime
        })
      }
    )
  }, [queryClient, userId])

  // Update room metadata
  const updateRoom = useCallback((updatedRoom: any) => {
    if (!userId) return

    queryClient.setQueryData(
      CHAT_QUERY_KEYS.rooms(userId),
      (oldRooms: RoomListItem[] = []) => {
        return oldRooms.map(room =>
          room.id === updatedRoom.id ? { ...room, ...updatedRoom } : room
        )
      }
    )
  }, [queryClient, userId])

  // Remove room from list
  const removeRoom = useCallback((roomId: string) => {
    if (!userId) return

    queryClient.setQueryData(
      CHAT_QUERY_KEYS.rooms(userId),
      (oldRooms: RoomListItem[] = []) => {
        return oldRooms.filter(room => room.id !== roomId)
      }
    )
  }, [queryClient, userId])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()

    // Create dedicated channel for room list updates
    const channel = supabase
      .channel(`room-list-${userId}`, {
        config: { broadcast: { self: false } }
      })
      // Listen for message changes to update last message
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log('📩 Room list: New message for room list update:', payload.new)
          if (payload.new?.room_id) {
            // Get sender info from cache
            const users = queryClient.getQueryData(CHAT_QUERY_KEYS.users()) as ChatUser[] || []
            const sender = users.find(user => user.id === payload.new.sender_id)
            
            const enrichedMessage = {
              ...payload.new,
              sender: sender ? {
                id: sender.id,
                full_name: sender.full_name,
                username: sender.username
              } : {
                id: payload.new.sender_id,
                full_name: 'Unknown',
                username: 'Unknown'
              }
            }
            
            updateRoomLastMessage(payload.new.room_id, enrichedMessage)
          }
        }
      )
      // Listen for room changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        (payload) => {
          console.log('🏠 Room list: Room change detected:', payload.eventType, (payload.new as any)?.id)
          
          if (payload.eventType === 'INSERT' && payload.new) {
            addNewRoom(payload.new)
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            updateRoom(payload.new)
          } else if (payload.eventType === 'DELETE' && payload.old) {
            removeRoom(payload.old.id)
          }
        }
      )
      // Listen for room membership changes
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_members',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('👥 Room list: Membership change for user:', payload.eventType)
          
          if (payload.eventType === 'INSERT' && payload.new?.room_id) {
            // User was added to a room - invalidate to fetch full room data
            queryClient.invalidateQueries({
              queryKey: CHAT_QUERY_KEYS.rooms(userId),
              refetchType: 'active'
            })
          } else if (payload.eventType === 'DELETE' && payload.old?.room_id) {
            // User was removed from a room
            removeRoom(payload.old.room_id)
          }
        }
      )
      .subscribe((status) => {
        console.log('📋 Room list realtime status:', status)
      })

    return () => {
      channel.unsubscribe()
    }
  }, [userId, updateRoomLastMessage, addNewRoom, updateRoom, removeRoom, queryClient])

  return {
    updateRoomLastMessage,
    addNewRoom,
    updateRoom,
    removeRoom
  }
}
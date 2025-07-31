'use client'

import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { MessageWithRelations, PaginatedMessages, ChatUser } from '@/types/chat-app'

/**
 * Chat Messages Pagination Hook
 * 
 * Provides efficient message loading with infinite scroll/pagination
 * Following REALTIME_PATTERN.md guidelines
 */

// Fetch paginated messages
const fetchMessages = async (
  roomId: string,
  cursor?: string,
  direction: 'older' | 'newer' = 'older',
  limit: number = 50
): Promise<PaginatedMessages> => {
  const params = new URLSearchParams()
  if (cursor) params.set('cursor', cursor)
  params.set('direction', direction)
  params.set('limit', limit.toString())

  const response = await fetch(`/api/messages/${roomId}?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch messages')
  }
  
  const data = await response.json()
  return {
    messages: data.messages,
    has_more: data.has_more,
    next_cursor: data.next_cursor
  }
}

/**
 * Infinite query hook for message pagination
 */
export function useChatMessagesPagination(roomId?: string, currentUser?: ChatUser) {
  const queryClient = useQueryClient()

  // Infinite query for loading older messages
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['chat-messages-paginated', roomId],
    queryFn: ({ pageParam }) => {
      if (!roomId) throw new Error('Room ID required')
      return fetchMessages(roomId, pageParam, 'older', 50)
    },
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.next_cursor : undefined
    },
    enabled: !!roomId && !!currentUser,
    staleTime: 30000, // 30 seconds - messages don't change often
    refetchOnWindowFocus: false
  })

  // Get all messages from all pages
  const allMessages = infiniteQuery.data?.pages
    .flatMap(page => page.messages)
    .reverse() || [] // Reverse to show newest at bottom

  // Load more messages (older)
  const loadMoreMessages = useCallback(() => {
    if (infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage) {
      infiniteQuery.fetchNextPage()
    }
  }, [infiniteQuery])

  // Check if can load more
  const canLoadMore = infiniteQuery.hasNextPage && !infiniteQuery.isFetchingNextPage

  // Add new message optimistically (for real-time updates)
  const addOptimisticMessage = useCallback((message: MessageWithRelations) => {
    if (!roomId) return

    queryClient.setQueryData(
      ['chat-messages-paginated', roomId],
      (old: any) => {
        if (!old) return old

        // Add to the last (most recent) page
        const newPages = [...old.pages]
        if (newPages.length > 0) {
          const lastPage = { ...newPages[newPages.length - 1] }
          lastPage.messages = [...lastPage.messages, message]
          newPages[newPages.length - 1] = lastPage
        }

        return {
          ...old,
          pages: newPages
        }
      }
    )
  }, [queryClient, roomId])

  // Remove message (for failed sends)
  const removeMessage = useCallback((messageId: string) => {
    if (!roomId) return

    queryClient.setQueryData(
      ['chat-messages-paginated', roomId],
      (old: any) => {
        if (!old) return old

        const newPages = old.pages.map((page: PaginatedMessages) => ({
          ...page,
          messages: page.messages.filter(msg => 
            msg.id !== messageId && (msg as any).optimistic_id !== messageId
          )
        }))

        return {
          ...old,
          pages: newPages
        }
      }
    )
  }, [queryClient, roomId])

  // Update message (for status changes)
  const updateMessage = useCallback((messageId: string, updates: Partial<MessageWithRelations>) => {
    if (!roomId) return

    queryClient.setQueryData(
      ['chat-messages-paginated', roomId],
      (old: any) => {
        if (!old) return old

        const newPages = old.pages.map((page: PaginatedMessages) => ({
          ...page,
          messages: page.messages.map(msg => 
            (msg.id === messageId || (msg as any).optimistic_id === messageId)
              ? { ...msg, ...updates }
              : msg
          )
        }))

        return {
          ...old,
          pages: newPages
        }
      }
    )
  }, [queryClient, roomId])

  // Scroll to bottom helper
  const scrollToBottom = useCallback((smooth = true) => {
    const messagesContainer = document.querySelector('[data-messages-container]')
    if (messagesContainer) {
      messagesContainer.scrollTo({
        top: messagesContainer.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant'
      })
    }
  }, [])

  // Check if at bottom (for auto-scroll on new messages)
  const isAtBottom = useCallback(() => {
    const container = document.querySelector('[data-messages-container]')
    if (!container) return true

    const threshold = 100 // pixels from bottom
    return (
      container.scrollTop + container.clientHeight >= 
      container.scrollHeight - threshold
    )
  }, [])

  // Reset pagination (for room changes)
  const resetPagination = useCallback(() => {
    if (roomId) {
      queryClient.removeQueries({ 
        queryKey: ['chat-messages-paginated', roomId] 
      })
    }
  }, [queryClient, roomId])

  return {
    // Data
    messages: allMessages,
    
    // Pagination state
    isLoading: infiniteQuery.isLoading,
    isLoadingMore: infiniteQuery.isFetchingNextPage,
    canLoadMore,
    hasMessages: allMessages.length > 0,
    totalMessages: allMessages.length,
    
    // Actions
    loadMoreMessages,
    resetPagination,
    
    // Optimistic updates
    addOptimisticMessage,
    removeMessage,
    updateMessage,
    
    // Scroll utilities
    scrollToBottom,
    isAtBottom,
    
    // Error handling
    error: infiniteQuery.error,
    refetch: infiniteQuery.refetch
  }
}

/**
 * Hook for getting latest messages (for real-time updates)
 * This complements the paginated hook
 */
export function useLatestMessages(roomId?: string, currentUser?: ChatUser) {
  return useQuery({
    queryKey: ['chat-messages-latest', roomId],
    queryFn: () => {
      if (!roomId) throw new Error('Room ID required')
      return fetchMessages(roomId, undefined, 'newer', 20)
    },
    enabled: !!roomId && !!currentUser,
    staleTime: 0, // Always fresh for real-time
    refetchInterval: 5000, // Fallback polling every 5 seconds
    refetchIntervalInBackground: false
  })
}

/**
 * Combined hook that manages both pagination and real-time updates
 */
export function useRoomMessages(roomId?: string, currentUser?: ChatUser) {
  const pagination = useChatMessagesPagination(roomId, currentUser)
  const queryClient = useQueryClient()

  // Merge new messages from real-time updates
  const mergeNewMessages = useCallback((newMessages: MessageWithRelations[]) => {
    if (!roomId || !newMessages.length) return

    // Add new messages to the latest page
    newMessages.forEach(message => {
      pagination.addOptimisticMessage(message)
    })

    // Scroll to bottom if user was already at bottom
    if (pagination.isAtBottom()) {
      setTimeout(() => pagination.scrollToBottom(), 100)
    }
  }, [roomId, pagination])

  // Invalidate queries for real-time sync
  const invalidateMessages = useCallback(() => {
    if (roomId) {
      queryClient.invalidateQueries({ 
        queryKey: ['chat-messages-latest', roomId] 
      })
    }
  }, [queryClient, roomId])

  return {
    ...pagination,
    mergeNewMessages,
    invalidateMessages
  }
}
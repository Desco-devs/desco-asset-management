'use client'

import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

interface UpdateOnlineStatusData {
  is_online: boolean
}

async function updateOnlineStatus(data: UpdateOnlineStatusData) {
  const response = await fetch('/api/users/online-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update online status')
  }

  return response.json()
}

// Simple heartbeat function
async function sendHeartbeat() {
  try {
    const response = await fetch('/api/users/online-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_online: true }),
    })
    return response.ok
  } catch {
    return false
  }
}

export function useUpdateOnlineStatus() {
  return useMutation({
    mutationFn: updateOnlineStatus,
    // Don't show toasts for online status updates - they happen frequently
    onError: (error) => {
      console.warn('Failed to update online status:', error)
    },
  })
}

// Heartbeat hook - sends periodic "I'm alive" signals
export function useOnlineHeartbeat(isAuthenticated: boolean) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Send heartbeat every 2 minutes
    intervalRef.current = setInterval(() => {
      sendHeartbeat()
    }, 2 * 60 * 1000)

    // Send initial heartbeat
    sendHeartbeat()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isAuthenticated])
}

// Utility functions for easier usage
export function useSetOnline() {
  const mutation = useUpdateOnlineStatus()
  
  return () => mutation.mutate({ is_online: true })
}

export function useSetOffline() {
  const mutation = useUpdateOnlineStatus()
  
  return () => mutation.mutate({ is_online: false })
}
'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'

interface ConnectionMetrics {
  connectedAt?: Date
  lastHeartbeat?: Date
  reconnectAttempts: number
  totalReconnects: number
  uptime: number
}

interface NetworkInfo {
  isOnline: boolean
  connectionType: string
  downlink?: number
  rtt?: number
}

/**
 * Chat Connection Management Hook
 * 
 * Provides comprehensive connection management for chat features:
 * - Enhanced connection status tracking
 * - Heartbeat monitoring with automatic reconnection
 * - Network quality detection and adaptation
 * - Connection metrics and diagnostics
 * - User-friendly connection feedback
 */
export function useChatConnection(userId?: string) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown'
  })
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    reconnectAttempts: 0,
    totalReconnects: 0,
    uptime: 0
  })
  
  const channelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const metricsIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const connectionAttemptRef = useRef<Promise<void> | null>(null)
  
  const HEARTBEAT_INTERVAL = 30000 // 30 seconds
  const MAX_RECONNECT_ATTEMPTS = 10
  const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000] // Progressive delays

  // Update network information
  const updateNetworkInfo = useCallback(() => {
    if (typeof navigator === 'undefined') return
    
    const isOnline = navigator.onLine
    // @ts-ignore - Connection API is experimental but widely supported
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    
    const info: NetworkInfo = {
      isOnline,
      connectionType: connection?.effectiveType || connection?.type || 'unknown'
    }
    
    if (connection) {
      info.downlink = connection.downlink
      info.rtt = connection.rtt
    }
    
    setNetworkInfo(info)
  }, [])

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!channelRef.current || connectionStatus !== 'connected') return
    
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'heartbeat',
        payload: { 
          user_id: userId,
          timestamp: Date.now()
        }
      })
      
      setMetrics(prev => ({
        ...prev,
        lastHeartbeat: new Date()
      }))
      
      console.log('💓 Heartbeat sent')
    } catch (error) {
      console.warn('[ChatConnection] Heartbeat failed:', error)
      // Don't trigger reconnect immediately on heartbeat failure
      // The subscription status will handle connection loss
    }
  }, [connectionStatus, userId])

  // Start heartbeat monitoring
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
    }
    
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL)
    console.log('💓 Heartbeat monitoring started')
  }, [sendHeartbeat])

  // Stop heartbeat monitoring
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    console.log('💓 Heartbeat monitoring stopped')
  }, [])

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback((attemptCount: number): number => {
    const baseDelay = RECONNECT_DELAYS[Math.min(attemptCount, RECONNECT_DELAYS.length - 1)]
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000
    
    // Adjust delay based on network quality
    let multiplier = 1
    switch (networkInfo.connectionType) {
      case 'slow-2g':
      case '2g':
        multiplier = 2
        break
      case '3g':
        multiplier = 1.5
        break
      default:
        multiplier = 1
    }
    
    return Math.min(baseDelay * multiplier + jitter, 30000) // Max 30s
  }, [networkInfo.connectionType])

  // Connect to chat system
  const connect = useCallback(async () => {
    if (connectionAttemptRef.current || !userId || !networkInfo.isOnline) {
      return connectionAttemptRef.current || Promise.resolve()
    }
    
    // Prevent concurrent connection attempts
    connectionAttemptRef.current = (async () => {
      try {
        setConnectionStatus('connecting')
        console.log('🔌 Connecting to chat system...')
        
        const supabase = createClient()
        
        const channel = supabase
          .channel(`chat-connection-${userId}`, {
            config: {
              presence: { key: userId },
              broadcast: { self: true, ack: true },
              heartbeat_interval: 20000 // 20s for Supabase internal heartbeat
            }
          })
          .on('system', {}, (payload) => {
            console.log('🔌 Connection system event:', payload)
            
            switch (payload.status) {
              case 'SUBSCRIBED':
                setConnectionStatus('connected')
                setMetrics(prev => ({
                  ...prev,
                  connectedAt: new Date(),
                  reconnectAttempts: 0
                }))
                startHeartbeat()
                break
                
              case 'CHANNEL_ERROR':
              case 'TIMED_OUT':
                console.warn('🔌 Connection error:', payload.status)
                setConnectionStatus('error')
                stopHeartbeat()
                scheduleReconnect()
                break
                
              case 'CLOSED':
                console.log('🔌 Connection closed')
                setConnectionStatus('disconnected')
                stopHeartbeat()
                break
            }
          })
          .on('broadcast', { event: 'heartbeat' }, (payload) => {
            // Handle heartbeat responses if needed
            console.log('💓 Heartbeat received:', payload)
          })
          .subscribe((status) => {
            console.log('🔌 Connection subscription status:', status)
            
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected')
              setMetrics(prev => {
                const newMetrics = {
                  ...prev,
                  connectedAt: new Date(),
                  reconnectAttempts: 0
                }
                
                // Increment total reconnects if this is a reconnection
                if (prev.totalReconnects > 0 || prev.reconnectAttempts > 0) {
                  newMetrics.totalReconnects = prev.totalReconnects + 1
                }
                
                return newMetrics
              })
              startHeartbeat()
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              setConnectionStatus('error')
              stopHeartbeat()
              scheduleReconnect()
            }
          })
        
        channelRef.current = channel
        
      } catch (error) {
        console.error('[ChatConnection] Connection failed:', error)
        setConnectionStatus('error')
        scheduleReconnect()
      } finally {
        connectionAttemptRef.current = null
      }
    })()
    
    return connectionAttemptRef.current
  }, [userId, networkInfo.isOnline, startHeartbeat, stopHeartbeat])

  // Disconnect from chat system
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from chat system...')
    
    // Cancel any pending connection attempt
    connectionAttemptRef.current = null
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Stop heartbeat
    stopHeartbeat()
    
    // Close channel
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
    
    setConnectionStatus('disconnected')
    setMetrics(prev => ({
      ...prev,
      connectedAt: undefined,
      lastHeartbeat: undefined
    }))
  }, [stopHeartbeat])

  // Schedule reconnection with exponential backoff
  const scheduleReconnect = useCallback(() => {
    if (!networkInfo.isOnline) {
      console.log('🔌 Skipping reconnect - offline')
      return
    }
    
    setMetrics(prev => {
      const newAttempts = prev.reconnectAttempts + 1
      
      if (newAttempts > MAX_RECONNECT_ATTEMPTS) {
        console.warn('🔌 Max reconnection attempts reached')
        setConnectionStatus('error')
        return prev
      }
      
      const delay = getReconnectDelay(newAttempts - 1)
      console.log(`🔌 Scheduling reconnect in ${delay}ms (attempt ${newAttempts})`)
      
      setConnectionStatus('reconnecting')
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
      
      return {
        ...prev,
        reconnectAttempts: newAttempts
      }
    })
  }, [networkInfo.isOnline, getReconnectDelay, connect])

  // Manual reconnect
  const reconnect = useCallback(() => {
    console.log('🔌 Manual reconnect triggered')
    
    // Reset reconnect attempts for manual reconnect
    setMetrics(prev => ({
      ...prev,
      reconnectAttempts: 0
    }))
    
    disconnect()
    setTimeout(() => connect(), 1000)
  }, [disconnect, connect])

  // Update metrics periodically
  const updateMetrics = useCallback(() => {
    setMetrics(prev => {
      if (!prev.connectedAt) return prev
      
      const uptime = Date.now() - prev.connectedAt.getTime()
      return {
        ...prev,
        uptime
      }
    })
  }, [])

  // Network event handlers
  useEffect(() => {
    updateNetworkInfo()
    
    const handleOnline = () => {
      updateNetworkInfo()
      if (userId && connectionStatus === 'disconnected') {
        console.log('🌐 Network back online - reconnecting...')
        connect()
      }
    }
    
    const handleOffline = () => {
      updateNetworkInfo()
      console.log('🌐 Network offline - disconnecting...')
      disconnect()
    }
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo)
    }
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo)
      }
    }
  }, [userId, connectionStatus, connect, disconnect, updateNetworkInfo])

  // Start metrics updates
  useEffect(() => {
    metricsIntervalRef.current = setInterval(updateMetrics, 1000)
    
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current)
      }
    }
  }, [updateMetrics])

  // Auto-connect/disconnect based on user
  useEffect(() => {
    if (userId && networkInfo.isOnline && connectionStatus === 'disconnected') {
      connect()
    } else if (!userId && connectionStatus !== 'disconnected') {
      disconnect()
    }
  }, [userId, networkInfo.isOnline, connectionStatus, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
      
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current)
      }
    }
  }, [disconnect])

  // Helper functions
  const getConnectionQuality = useCallback(() => {
    if (!networkInfo.isOnline) return 'offline'
    
    switch (networkInfo.connectionType) {
      case 'slow-2g':
      case '2g':
        return 'poor'
      case '3g':
        return 'fair'
      case '4g':
      case '5g':
      case 'wifi':
        return 'good'
      default:
        return 'unknown'
    }
  }, [networkInfo])

  const getStatusMessage = useCallback(() => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to chat...'
      case 'connected':
        return 'Connected'
      case 'reconnecting':
        return `Reconnecting... (attempt ${metrics.reconnectAttempts})`
      case 'disconnected':
        return networkInfo.isOnline ? 'Disconnected' : 'Offline'
      case 'error':
        return metrics.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS 
          ? 'Connection failed'
          : 'Connection error'
      default:
        return 'Unknown status'
    }
  }, [connectionStatus, metrics.reconnectAttempts, networkInfo.isOnline])

  return {
    // Status
    connectionStatus,
    networkInfo,
    metrics,
    
    // Computed status
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting' || connectionStatus === 'reconnecting',
    hasError: connectionStatus === 'error',
    connectionQuality: getConnectionQuality(),
    statusMessage: getStatusMessage(),
    
    // Actions
    connect,
    disconnect,
    reconnect,
    
    // Utilities
    canReconnect: metrics.reconnectAttempts < MAX_RECONNECT_ATTEMPTS,
    uptimeFormatted: metrics.connectedAt 
      ? Math.floor(metrics.uptime / 1000) + 's'
      : '0s'
  }
}
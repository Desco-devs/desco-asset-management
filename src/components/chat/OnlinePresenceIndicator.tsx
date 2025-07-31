'use client'

import { useOnlinePresence, useUserOnline } from '@/hooks/chat-app/useOnlinePresence'
import { createPresenceIndicator, getTimeSinceOnline } from '@/lib/presence-utils'
import type { ChatUser } from '@/types/chat-app'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface OnlinePresenceIndicatorProps {
  currentUser?: ChatUser
  activeRoomId?: string
  showStats?: boolean
  showUserList?: boolean
  className?: string
}

/**
 * Online Presence Indicator Component
 * 
 * Displays online presence information using the new useOnlinePresence hook.
 * Shows online user count, room presence, and optionally a list of online users.
 */
export function OnlinePresenceIndicator({
  currentUser,
  activeRoomId,
  showStats = true,
  showUserList = false,
  className
}: OnlinePresenceIndicatorProps) {
  const {
    onlineUsers,
    onlineCount,
    roomUsers,
    connectionStatus,
    isConnected,
    currentPresenceStatus,
    stats
  } = useOnlinePresence(currentUser, activeRoomId)

  if (!currentUser) {
    return null
  }

  const connectionStatusColors = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500',
    disconnected: 'bg-gray-500',
    error: 'bg-red-500'
  }

  const connectionStatusText = {
    connected: 'Connected',
    connecting: 'Connecting...',
    disconnected: 'Disconnected',
    error: 'Connection Error'
  }

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Connection Status Indicator */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  connectionStatusColors[connectionStatus]
                )}
              />
              <span className="text-sm font-medium">
                {connectionStatusText[connectionStatus]}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <p>Status: {connectionStatus}</p>
              <p>Your status: {currentPresenceStatus}</p>
              <p>Heartbeat: {stats.heartbeatInterval}ms</p>
              {stats.lastHeartbeat && (
                <p>Last heartbeat: {getTimeSinceOnline(stats.lastHeartbeat.toISOString())}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Online Stats */}
      {showStats && isConnected && (
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            {onlineCount} online
          </Badge>

          {activeRoomId && roomUsers.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              {roomUsers.length} in room
            </Badge>
          )}
        </div>
      )}

      {/* Online Users List */}
      {showUserList && isConnected && onlineUsers.length > 0 && (
        <div className="flex items-center gap-2 max-w-md">
          <span className="text-sm text-muted-foreground">Online:</span>
          <div className="flex -space-x-2 overflow-hidden">
            {onlineUsers.slice(0, 5).map((user) => {
              const indicator = createPresenceIndicator({...user, is_online: true})
              
              return (
                <TooltipProvider key={user.user_id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative">
                        <Avatar className="w-8 h-8 border-2 border-background">
                          <AvatarImage src={user.user_profile} alt={user.full_name} />
                          <AvatarFallback className="text-xs">
                            {user.full_name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online status dot */}
                        <div
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background',
                            indicator.is_online ? 'bg-green-500' : 'bg-gray-400'
                          )}
                        />
                        {/* Room indicator */}
                        {user.room_id === activeRoomId && (
                          <div className="absolute -top-0.5 -left-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-background" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-muted-foreground">@{user.username}</p>
                        <p>{indicator.status_text}</p>
                        {user.room_id && (
                          <p className="text-blue-400">
                            {user.room_id === activeRoomId ? 'In this room' : 'In another room'}
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
            
            {onlineUsers.length > 5 && (
              <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full border-2 border-background">
                <span className="text-xs font-medium">
                  +{onlineUsers.length - 5}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Simple User Online Status Component
 * Shows just the online status for a specific user
 */
interface UserOnlineStatusProps {
  userId: string
  currentUser?: ChatUser
  showUsername?: boolean
  className?: string
}

export function UserOnlineStatus({
  userId,
  currentUser,
  showUsername = false,
  className
}: UserOnlineStatusProps) {
  const { isOnline } = useUserOnline(userId, currentUser)
  const { onlineUsers } = useOnlinePresence(currentUser)
  
  const user = onlineUsers.find(u => u.user_id === userId)
  
  if (!user && !isOnline) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="w-2 h-2 bg-gray-400 rounded-full" />
        {showUsername && <span className="text-sm text-muted-foreground">Offline</span>}
      </div>
    )
  }
  
  const indicator = user ? createPresenceIndicator({...user, is_online: true}) : null
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-2', className)}>
            <div className={cn(
              'w-2 h-2 rounded-full',
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            )} />
            {showUsername && user && (
              <span className="text-sm">
                {user.full_name}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            {indicator ? (
              <>
                <p>{indicator.full_name}</p>
                <p>{indicator.status_text}</p>
                {indicator.in_room && <p>Active in a room</p>}
              </>
            ) : (
              <p>User is offline</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Room Presence Summary Component
 * Shows presence statistics for a specific room
 */
interface RoomPresenceSummaryProps {
  roomId: string
  currentUser?: ChatUser
  className?: string
}

export function RoomPresenceSummary({
  roomId,
  currentUser,
  className
}: RoomPresenceSummaryProps) {
  const { getUsersInRoom, onlineCount } = useOnlinePresence(currentUser, roomId)
  
  const usersInRoom = getUsersInRoom(roomId)
  const roomPresenceCount = usersInRoom.length
  
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full" />
        <span className="text-sm">
          {roomPresenceCount} viewing this room
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-sm">
          {onlineCount} total online
        </span>
      </div>
    </div>
  )
}
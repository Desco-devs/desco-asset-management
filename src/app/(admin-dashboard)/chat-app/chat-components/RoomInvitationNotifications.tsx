"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Check,
  X,
  UserPlus,
  Clock,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import useRoomInvitationNotifications from "@/hooks/chat-app/useRoomInvitationNotifications";

interface RoomInvitationNotificationsProps {
  userId?: string;
  onAcceptInvitation?: (invitationId: string) => Promise<void>;
  onDeclineInvitation?: (invitationId: string) => Promise<void>;
  className?: string;
}

const RoomInvitationNotifications = ({
  userId,
  onAcceptInvitation,
  onDeclineInvitation,
  className,
}: RoomInvitationNotificationsProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [processingInvitations, setProcessingInvitations] = useState<Set<string>>(new Set());

  const {
    notifications,
    unreadCount,
    pendingInvitations,
    isConnected,
    error,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications,
  } = useRoomInvitationNotifications({
    userId,
    enabled: !!userId,
    onNewInvitation: (notification) => {
      console.log('New invitation notification:', notification);
      // Could trigger a toast notification here
    },
    onInvitationStatusChanged: (invitationId, status) => {
      console.log('Invitation status changed:', invitationId, status);
      // Remove from processing set when status changes
      setProcessingInvitations(prev => {
        const newSet = new Set(prev);
        newSet.delete(invitationId);
        return newSet;
      });
    },
  });

  const handleAcceptInvitation = async (invitationId: string, notificationId: string) => {
    if (!onAcceptInvitation) return;

    setProcessingInvitations(prev => new Set(prev).add(invitationId));
    
    try {
      await onAcceptInvitation(invitationId);
      markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      // Keep the invitation in processing state - will be removed by status change
    }
  };

  const handleDeclineInvitation = async (invitationId: string, notificationId: string) => {
    if (!onDeclineInvitation) return;

    setProcessingInvitations(prev => new Set(prev).add(invitationId));
    
    try {
      await onDeclineInvitation(invitationId);
      removeNotification(notificationId);
    } catch (error) {
      console.error('Failed to decline invitation:', error);
      // Keep the invitation in processing state - will be removed by status change
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500';
      case 'ACCEPTED':
        return 'bg-green-500';
      case 'DECLINED':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-3 w-3" />;
      case 'ACCEPTED':
        return <Check className="h-3 w-3" />;
      case 'DECLINED':
        return <X className="h-3 w-3" />;
      default:
        return <UserPlus className="h-3 w-3" />;
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative", className)}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Room Invitations</span>
          {!isConnected && (
            <Badge variant="secondary" className="text-xs">
              Disconnected
            </Badge>
          )}
        </DropdownMenuLabel>
        
        {unreadCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={markAllAsRead}
              className="text-sm cursor-pointer"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </DropdownMenuItem>
          </>
        )}
        
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={clearAllNotifications}
              className="text-sm cursor-pointer text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all notifications
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <ScrollArea className="max-h-96">
          {error ? (
            <div className="p-4 text-center text-sm text-destructive">
              {error}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No room invitations
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification) => {
                const isProcessing = processingInvitations.has(notification.invitationId);
                
                return (
                  <Card 
                    key={notification.id}
                    className={cn(
                      "m-2 border-0 shadow-sm",
                      !notification.read && "bg-muted/50"
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {notification.invitedByName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium line-clamp-1">
                              {notification.roomName}
                            </p>
                            <Badge
                              variant="secondary"
                              className={cn("text-xs", getStatusColor(notification.status))}
                            >
                              {getStatusIcon(notification.status)}
                            </Badge>
                          </div>
                          
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            Invited by {notification.invitedByName}
                          </p>
                          
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                          
                          {notification.status === 'PENDING' && (
                            <div className="flex items-center space-x-2 mt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2"
                                onClick={() => handleAcceptInvitation(
                                  notification.invitationId,
                                  notification.id
                                )}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1" />
                                ) : (
                                  <Check className="h-3 w-3 mr-1" />
                                )}
                                Accept
                              </Button>
                              
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs px-2"
                                onClick={() => handleDeclineInvitation(
                                  notification.invitationId,
                                  notification.id
                                )}
                                disabled={isProcessing}
                              >
                                {isProcessing ? (
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1" />
                                ) : (
                                  <X className="h-3 w-3 mr-1" />
                                )}
                                Decline
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoomInvitationNotifications;
/**
 * Example: Using the Enhanced Supabase Realtime Hook for Chat Messages
 * 
 * This file demonstrates how to integrate the new realtime message subscriptions
 * with your chat components. Copy this pattern to your actual chat components.
 */

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useChatMessages } from '@/hooks/chat-app/useChatMessages';
import { MessageWithRelations } from '@/types/chat-app';

interface RealtimeChatExampleProps {
  roomId: string;
}

export const RealtimeChatExample: React.FC<RealtimeChatExampleProps> = ({ roomId }) => {
  const [messages, setMessages] = useState<MessageWithRelations[]>([]);
  const [notification, setNotification] = useState<string | null>(null);

  // Handle new messages received in real-time
  const handleNewMessage = useCallback((message: MessageWithRelations) => {
    console.log('New message received in real-time:', message);
    
    // Add to messages list
    setMessages(prev => [...prev, message]);
    
    // Show notification
    setNotification(`New message from ${message.sender.full_name}`);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Handle message updates (edits) in real-time
  const handleMessageUpdated = useCallback((updatedMessage: MessageWithRelations) => {
    console.log('Message updated in real-time:', updatedMessage);
    
    // Update the message in the list
    setMessages(prev => 
      prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      )
    );
    
    // Show notification
    setNotification(`Message edited by ${updatedMessage.sender.full_name}`);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Handle message deletions in real-time
  const handleMessageDeleted = useCallback((messageId: string, roomId: string) => {
    console.log('Message deleted in real-time:', { messageId, roomId });
    
    // Remove from messages list
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    
    // Show notification
    setNotification('A message was deleted');
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Setup real-time message subscriptions
  const { 
    isConnected, 
    connectionError, 
    userRoomIds,
    refreshRooms
  } = useChatMessages({
    onNewMessage: handleNewMessage,
    onMessageUpdated: handleMessageUpdated,
    onMessageDeleted: handleMessageDeleted,
  });

  // Effect to refresh rooms when user joins new rooms
  useEffect(() => {
    // This could be called when user accepts invitations or joins rooms
    // refreshRooms();
  }, [refreshRooms]);

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status */}
      <div className="p-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div 
              className={`h-2 w-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="text-sm text-gray-600">
            Subscribed to {userRoomIds.length} rooms
          </div>
        </div>
        
        {connectionError && (
          <div className="mt-2 text-sm text-red-600">
            Connection Error: {connectionError}
          </div>
        )}
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center">
            <div className="h-2 w-2 bg-blue-500 rounded-full mr-2 animate-pulse" />
            <span className="text-sm text-blue-800">{notification}</span>
          </div>
        </div>
      )}

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start chatting to see real-time updates!
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="flex space-x-3">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                    {message.sender.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">
                      {message.sender.full_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </span>
                    {message.edited_at && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-900">
                    {message.content}
                  </div>
                  {message.reply_to && (
                    <div className="mt-1 pl-3 border-l-2 border-gray-200">
                      <div className="text-xs text-gray-500">
                        Replying to {message.reply_to.sender.full_name}
                      </div>
                      <div className="text-xs text-gray-600">
                        {message.reply_to.content}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Debug Info */}
      <div className="p-4 border-t bg-gray-50">
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-600">
            Debug Info
          </summary>
          <div className="mt-2 space-y-1">
            <div>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
            <div>Subscribed Rooms: {userRoomIds.join(', ')}</div>
            <div>Messages Count: {messages.length}</div>
            <div>Error: {connectionError || 'None'}</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default RealtimeChatExample;
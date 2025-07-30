'use client';

/**
 * Real-time Test Component for Validation
 * 
 * This component is designed to test:
 * - Proper cleanup on unmount
 * - Memory leak prevention
 * - Error handling and recovery
 * - Connection quality monitoring
 * - Subscription lifecycle management
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupabaseRealtimeContext } from '@/context/SupabaseRealtimeContext';
import { useRealtimeMessaging } from '@/hooks/chat-app/useRealtimeMessaging';
import { usePresenceAndTyping } from '@/hooks/chat-app/usePresenceAndTyping';
import { useRealtimeErrorHandling } from '@/lib/realtime/error-handling';
import { useConnectionManager } from '@/lib/realtime/connection-manager';
import { MessageWithRelations } from '@/types/chat-app';

interface TestStats {
  messagesReceived: number;
  errorsEncountered: number;
  reconnectionAttempts: number;
  memoryUsage?: number;
  subscriptionCount: number;
  lastActivity: Date | null;
}

export const RealtimeTestComponent: React.FC<{
  testRoomId?: string;
  testUserId?: string;
  onTestComplete?: (results: TestStats) => void;
}> = ({
  testRoomId = 'test-room-123',
  testUserId = 'test-user-456',
  onTestComplete,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [testStats, setTestStats] = useState<TestStats>({
    messagesReceived: 0,
    errorsEncountered: 0,
    reconnectionAttempts: 0,
    subscriptionCount: 0,
    lastActivity: null,
  });
  
  const [testLog, setTestLog] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Real-time hooks
  const realtimeContext = useSupabaseRealtimeContext();
  const { stats, lastError } = useRealtimeErrorHandling();
  const { connectionState, subscriptions, metrics } = useConnectionManager();

  // Message handling for testing
  const handleNewMessageForTest = (message: MessageWithRelations) => {
    setTestStats(prev => ({
      ...prev,
      messagesReceived: prev.messagesReceived + 1,
      lastActivity: new Date(),
    }));
    addToLog(`📨 Received message: ${message.id} from ${message.sender.username}`);
  };

  const handleMessageUpdatedForTest = (message: MessageWithRelations) => {
    addToLog(`📝 Updated message: ${message.id}`);
  };

  const handleMessageDeletedForTest = (messageId: string) => {
    addToLog(`🗑️ Deleted message: ${messageId}`);
  };

  const handleTypingChangeForTest = (typingUsers: Array<{ id: string; name: string }>) => {
    if (typingUsers.length > 0) {
      addToLog(`⌨️ Users typing: ${typingUsers.map(u => u.name).join(', ')}`);
    }
  };

  // Test-specific real-time hooks
  const messagingHook = useRealtimeMessaging({
    roomId: isActive ? testRoomId : undefined,
    userId: testUserId,
    enabled: isActive,
    onMessageReceived: handleNewMessageForTest,
    onMessageUpdated: handleMessageUpdatedForTest,
    onMessageDeleted: handleMessageDeletedForTest,
    onTypingUpdate: handleTypingChangeForTest,
  });

  const presenceHook = usePresenceAndTyping({
    userId: testUserId,
    roomId: isActive ? testRoomId : undefined,
    enabled: isActive,
    onUserPresenceChanged: (userId, isOnline) => {
      addToLog(`👤 User ${userId} ${isOnline ? 'joined' : 'left'}`);
    },
    onTypingChanged: handleTypingChangeForTest,
  });

  // Utility function to add log entries
  const addToLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev.slice(-49), `[${timestamp}] ${message}`]); // Keep last 50 entries
  };

  // Monitor memory usage (rough estimate)
  const checkMemoryUsage = () => {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
    }
    return undefined;
  };

  // Start test
  const startTest = () => {
    setIsActive(true);
    startTimeRef.current = new Date();
    setTestStats({
      messagesReceived: 0,
      errorsEncountered: 0,
      reconnectionAttempts: 0,
      subscriptionCount: 0,
      lastActivity: null,
    });
    setTestLog([]);
    addToLog('🚀 Test started');

    // Monitor stats periodically
    intervalRef.current = setInterval(() => {
      const memoryUsage = checkMemoryUsage();
      setTestStats(prev => ({
        ...prev,
        errorsEncountered: stats.totalErrors,
        subscriptionCount: subscriptions.length,
        memoryUsage,
      }));

      if (memoryUsage) {
        addToLog(`💾 Memory usage: ${memoryUsage}MB`);
      }
    }, 5000);
  };

  // Stop test
  const stopTest = () => {
    setIsActive(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const duration = startTimeRef.current 
      ? Date.now() - startTimeRef.current.getTime() 
      : 0;

    addToLog(`🛑 Test stopped (duration: ${Math.round(duration / 1000)}s)`);
    addToLog('🧹 Cleanup should happen automatically...');

    // Wait a bit for cleanup, then check results
    setTimeout(() => {
      const finalStats = {
        ...testStats,
        errorsEncountered: stats.totalErrors,
        subscriptionCount: subscriptions.length,
        memoryUsage: checkMemoryUsage(),
      };

      addToLog(`📊 Final stats: ${JSON.stringify(finalStats, null, 2)}`);
      onTestComplete?.(finalStats);
      
      // Check for potential memory leaks
      if (subscriptions.length > 0) {
        addToLog(`⚠️ Warning: ${subscriptions.length} subscriptions still active after cleanup`);
      } else {
        addToLog('✅ All subscriptions cleaned up successfully');
      }
    }, 2000);
  };

  // Force error for testing error handling
  const simulateError = () => {
    addToLog('⚡ Simulating connection error...');
    try {
      // Try to cause a subscription error
      realtimeContext.joinRoom('invalid-room-id-' + Math.random());
    } catch (error) {
      addToLog(`❌ Error simulated: ${error}`);
    }
  };

  // Force reconnection
  const forceReconnect = async () => {
    addToLog('🔄 Forcing reconnection...');
    try {
      await realtimeContext.forceReconnect();
      addToLog('✅ Reconnection completed');
    } catch (error) {
      addToLog(`❌ Reconnection failed: ${error}`);
    }
  };

  // Simulate typing
  const simulateTyping = () => {
    if (isActive) {
      addToLog('⌨️ Simulating typing indicator...');
      presenceHook.startTyping();
      
      setTimeout(() => {
        presenceHook.stopTyping();
        addToLog('⌨️ Stopped typing');
      }, 3000);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      console.log('🧹 RealtimeTestComponent unmounting - cleanup should be automatic');
    };
  }, []);

  // Monitor error changes
  useEffect(() => {
    if (lastError) {
      addToLog(`❌ Error detected: ${lastError.message}`);
    }
  }, [lastError]);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Real-time System Test
          <div className="flex gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge variant={realtimeContext.isHealthy ? 'default' : 'destructive'}>
              {realtimeContext.isHealthy ? 'Healthy' : 'Unhealthy'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Control buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button onClick={startTest} disabled={isActive} variant="default">
            Start Test
          </Button>
          <Button onClick={stopTest} disabled={!isActive} variant="secondary">
            Stop Test
          </Button>
          <Button onClick={simulateError} disabled={!isActive} variant="destructive">
            Simulate Error
          </Button>
          <Button onClick={forceReconnect} disabled={!isActive} variant="outline">
            Force Reconnect
          </Button>
          <Button onClick={simulateTyping} disabled={!isActive} variant="outline">
            Simulate Typing
          </Button>
        </div>

        {/* Stats display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{testStats.messagesReceived}</div>
            <div className="text-sm text-muted-foreground">Messages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{testStats.errorsEncountered}</div>
            <div className="text-sm text-muted-foreground">Errors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{testStats.subscriptionCount}</div>
            <div className="text-sm text-muted-foreground">Subscriptions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {testStats.memoryUsage ? `${testStats.memoryUsage}MB` : 'N/A'}
            </div>
            <div className="text-sm text-muted-foreground">Memory</div>
          </div>
        </div>

        {/* Connection info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <strong>Connection State:</strong> {connectionState.state}
          </div>
          <div>
            <strong>Degradation:</strong> {connectionState.degradation}
          </div>
          <div>
            <strong>Quality:</strong> {stats.connectionQuality}
          </div>
        </div>

        {/* Real-time hook states */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <strong>Messaging Hook:</strong>
            <ul className="list-disc list-inside ml-2">
              <li>Connected: {messagingHook.isConnected ? '✅' : '❌'}</li>
              <li>Error: {messagingHook.connectionError ? '❌' : '✅'}</li>
              <li>Typing Users: {messagingHook.typingUsers.length}</li>
            </ul>
          </div>
          <div>
            <strong>Presence Hook:</strong>
            <ul className="list-disc list-inside ml-2">
              <li>Connected: {presenceHook.isConnected ? '✅' : '❌'}</li>
              <li>Online Users: {presenceHook.onlineUsers.length}</li>
              <li>Typing Count: {presenceHook.getTypingCount()}</li>
            </ul>
          </div>
        </div>

        {/* Test log */}
        <div>
          <strong>Test Log:</strong>
          <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-md h-64 overflow-y-auto font-mono text-xs">
            {testLog.length === 0 ? (
              <div className="text-muted-foreground">No log entries yet...</div>
            ) : (
              testLog.map((entry, index) => (
                <div key={index} className="mb-1">
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RealtimeTestComponent;
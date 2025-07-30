'use client';

/**
 * Real-time Status Indicator Component
 * 
 * Provides visual feedback to users about the real-time connection status,
 * error states, and recovery actions.
 */

import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  X,
  Activity,
  Clock
} from 'lucide-react';
import { useSupabaseRealtimeContext } from '@/context/SupabaseRealtimeContext';
import { ConnectionState, DegradationLevel } from '@/lib/realtime/connection-manager';
import { useRealtimeErrorHandling } from '@/lib/realtime/error-handling';

interface RealtimeStatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  showDetails = false,
  className = '',
  position = 'top-right',
  autoHide = true,
  autoHideDelay = 5000,
}) => {
  const {
    isConnected,
    connectionState,
    degradationLevel,
    isHealthy,
    connectionError,
    connectionMetrics,
    forceReconnect,
    clearErrors,
  } = useSupabaseRealtimeContext();

  const { lastError, stats } = useRealtimeErrorHandling();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Show indicator when there are issues or when explicitly requested
  useEffect(() => {
    const shouldShow = !isHealthy || 
                      connectionError !== null || 
                      lastError !== null ||
                      connectionState !== ConnectionState.CONNECTED ||
                      degradationLevel !== DegradationLevel.NONE ||
                      showDetails;

    setIsVisible(shouldShow);

    // Auto-hide after delay if enabled and connection is healthy
    if (shouldShow && autoHide && isHealthy && !connectionError && !lastError) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [isHealthy, connectionError, lastError, connectionState, degradationLevel, showDetails, autoHide, autoHideDelay]);

  // Handle reconnection
  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await forceReconnect();
      clearErrors();
    } catch (error) {
      console.error('Reconnection failed:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Get status information
  const getStatusInfo = () => {
    if (connectionState === ConnectionState.CONNECTED && degradationLevel === DegradationLevel.NONE && isHealthy) {
      return {
        icon: CheckCircle,
        color: 'green',
        title: 'Connected',
        description: 'Real-time updates active',
        variant: 'default' as const,
      };
    }

    if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING) {
      return {
        icon: RefreshCw,
        color: 'blue',
        title: 'Connecting',
        description: 'Establishing real-time connection...',
        variant: 'default' as const,
        spinning: true,
      };
    }

    if (connectionState === ConnectionState.DEGRADED || degradationLevel !== DegradationLevel.NONE) {
      return {
        icon: AlertTriangle,
        color: 'yellow',
        title: 'Limited Connection',
        description: getDegradationDescription(),
        variant: 'destructive' as const,
      };
    }

    if (connectionState === ConnectionState.FAILED || connectionError) {
      return {
        icon: WifiOff,
        color: 'red',
        title: 'Connection Failed',
        description: connectionError || lastError?.userMessage || 'Real-time updates unavailable',
        variant: 'destructive' as const,
      };
    }

    return {
      icon: Wifi,
      color: 'gray',
      title: 'Disconnected',
      description: 'Real-time updates not active',
      variant: 'secondary' as const,
    };
  };

  const getDegradationDescription = () => {
    switch (degradationLevel) {
      case DegradationLevel.PARTIAL:
        return 'Some features may be slower';
      case DegradationLevel.POLLING:
        return 'Using backup connection mode';
      case DegradationLevel.OFFLINE:
        return 'Working with cached data';
      default:
        return 'Connection quality reduced';
    }
  };

  const getPositionClasses = () => {
    if (position === 'inline') return '';
    
    const baseClasses = 'fixed z-50';
    const positionClasses = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
    };
    
    return `${baseClasses} ${positionClasses[position]}`;
  };

  if (!isVisible) return null;

  const statusInfo = getStatusInfo();
  const IconComponent = statusInfo.icon;

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      <Alert className={`max-w-md transition-all duration-200 ${isExpanded ? 'w-80' : 'w-auto'}`} variant={statusInfo.variant}>
        <div className="flex items-start gap-3">
          <IconComponent 
            className={`h-4 w-4 mt-0.5 ${statusInfo.spinning ? 'animate-spin' : ''}`} 
            style={{ color: statusInfo.color }}
          />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{statusInfo.title}</span>
              
              {/* Connection quality badge */}
              {stats.connectionQuality && (
                <Badge 
                  variant={stats.connectionQuality === 'excellent' ? 'default' : 
                           stats.connectionQuality === 'good' ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {stats.connectionQuality}
                </Badge>
              )}
            </div>
            
            <AlertDescription className="text-xs text-muted-foreground">
              {statusInfo.description}
            </AlertDescription>

            {/* Expanded details */}
            {isExpanded && (
              <div className="mt-3 space-y-2 text-xs">
                {/* Connection metrics */}
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    <span>Errors: {stats.totalErrors}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>Uptime: {Math.round(connectionMetrics.uptime / 1000)}s</span>
                  </div>
                </div>

                {/* Last error */}
                {lastError && (
                  <div className="text-red-600 dark:text-red-400 text-xs">
                    Last error: {lastError.message}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleReconnect}
                    disabled={isReconnecting}
                    className="h-7 text-xs"
                  >
                    {isReconnecting ? (
                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Reconnect
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearErrors}
                    className="h-7 text-xs"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Toggle expansion and close buttons */}
          <div className="flex gap-1">
            {!showDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0"
              >
                <Activity className="h-3 w-3" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};

/**
 * Compact status badge for minimal UI impact
 */
export const RealtimeStatusBadge: React.FC<{
  className?: string;
  showLabel?: boolean;
}> = ({ className = '', showLabel = false }) => {
  const { isConnected, isHealthy, connectionState } = useSupabaseRealtimeContext();

  const getStatusColor = () => {
    if (isConnected && isHealthy && connectionState === ConnectionState.CONNECTED) {
      return 'bg-green-500';
    }
    if (connectionState === ConnectionState.CONNECTING || connectionState === ConnectionState.RECONNECTING) {
      return 'bg-blue-500 animate-pulse';
    }
    if (connectionState === ConnectionState.DEGRADED) {
      return 'bg-yellow-500';
    }
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (isConnected && isHealthy) return 'Online';
    if (connectionState === ConnectionState.CONNECTING) return 'Connecting';
    if (connectionState === ConnectionState.RECONNECTING) return 'Reconnecting';
    if (connectionState === ConnectionState.DEGRADED) return 'Limited';
    return 'Offline';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default RealtimeStatusIndicator;
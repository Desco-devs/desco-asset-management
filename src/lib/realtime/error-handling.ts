'use client';

/**
 * Comprehensive Error Handling and Logging System for Real-time Layer
 * 
 * This module provides:
 * - Structured error logging with context
 * - Error recovery strategies
 * - User-friendly error messages
 * - Performance monitoring
 * - Connection quality tracking
 */

export enum RealtimeErrorType {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  SUBSCRIPTION_ERROR = 'SUBSCRIPTION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATA_VALIDATION_ERROR = 'DATA_VALIDATION_ERROR',
  MEMORY_LEAK_DETECTED = 'MEMORY_LEAK_DETECTED',
  CLEANUP_ERROR = 'CLEANUP_ERROR',
}

export enum RealtimeSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface RealtimeErrorContext {
  userId?: string;
  roomId?: string;
  subscriptionId?: string;
  channelName?: string;
  connectionState?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  additionalData?: Record<string, any>;
}

export interface RealtimeError {
  type: RealtimeErrorType;
  severity: RealtimeSeverity;
  message: string;
  originalError?: Error;
  context: RealtimeErrorContext;
  stack?: string;
  retryable: boolean;
  userMessage: string;
}

export interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<RealtimeErrorType, number>;
  lastError?: RealtimeError;
  connectionUptime: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

class RealtimeErrorHandler {
  private errors: RealtimeError[] = [];
  private maxErrorHistory = 100;
  private connectionStartTime: Date | null = null;
  private lastHeartbeat: Date | null = null;
  private errorCallbacks: Set<(error: RealtimeError) => void> = new Set();
  private statsCallbacks: Set<(stats: ErrorStats) => void> = new Set();

  constructor() {
    this.connectionStartTime = new Date();
  }

  /**
   * Log a real-time error with comprehensive context
   */
  logError(
    type: RealtimeErrorType,
    message: string,
    originalError?: Error,
    context: Partial<RealtimeErrorContext> = {},
    severity: RealtimeSeverity = RealtimeSeverity.MEDIUM
  ): RealtimeError {
    const error: RealtimeError = {
      type,
      severity,
      message,
      originalError,
      context: {
        timestamp: new Date(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        ...context,
      },
      stack: originalError?.stack || new Error().stack,
      retryable: this.isRetryable(type),
      userMessage: this.getUserMessage(type, severity),
    };

    // Add to error history
    this.errors.push(error);
    if (this.errors.length > this.maxErrorHistory) {
      this.errors.shift();
    }

    // Log to console with structured format
    const logLevel = this.getLogLevel(severity);
    console[logLevel]('🔴 Real-time Error:', {
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      originalError: originalError,
      retryable: error.retryable,
    });

    // Notify callbacks
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    // Update stats
    this.updateStats();

    return error;
  }

  /**
   * Log successful connection or recovery
   */
  logSuccess(message: string, context: Partial<RealtimeErrorContext> = {}): void {
    console.log('✅ Real-time Success:', {
      message,
      context: {
        timestamp: new Date(),
        ...context,
      },
    });

    this.lastHeartbeat = new Date();
    this.updateStats();
  }

  /**
   * Update connection heartbeat
   */
  updateHeartbeat(): void {
    this.lastHeartbeat = new Date();
    this.updateStats();
  }

  /**
   * Subscribe to error notifications
   */
  onError(callback: (error: RealtimeError) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  /**
   * Subscribe to stats updates
   */
  onStatsUpdate(callback: (stats: ErrorStats) => void): () => void {
    this.statsCallbacks.add(callback);
    return () => this.statsCallbacks.delete(callback);
  }

  /**
   * Get current error statistics
   */
  getStats(): ErrorStats {
    const now = new Date();
    const uptime = this.connectionStartTime 
      ? now.getTime() - this.connectionStartTime.getTime()
      : 0;

    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<RealtimeErrorType, number>);

    const connectionQuality = this.calculateConnectionQuality();

    return {
      totalErrors: this.errors.length,
      errorsByType,
      lastError: this.errors[this.errors.length - 1],
      connectionUptime: uptime,
      connectionQuality,
    };
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errors = [];
    this.updateStats();
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10): RealtimeError[] {
    return this.errors.slice(-count);
  }

  /**
   * Check if error type is retryable
   */
  private isRetryable(type: RealtimeErrorType): boolean {
    const retryableTypes = [
      RealtimeErrorType.CONNECTION_FAILED,
      RealtimeErrorType.TIMEOUT_ERROR,
      RealtimeErrorType.NETWORK_ERROR,
      RealtimeErrorType.SUBSCRIPTION_ERROR,
    ];
    return retryableTypes.includes(type);
  }

  /**
   * Get user-friendly error message
   */
  private getUserMessage(type: RealtimeErrorType, severity: RealtimeSeverity): string {
    const messages = {
      [RealtimeErrorType.CONNECTION_FAILED]: 'Connection to chat server failed. Trying to reconnect...',
      [RealtimeErrorType.SUBSCRIPTION_ERROR]: 'Real-time updates temporarily unavailable. Refreshing...',
      [RealtimeErrorType.AUTHENTICATION_ERROR]: 'Authentication error. Please refresh the page.',
      [RealtimeErrorType.TIMEOUT_ERROR]: 'Connection timed out. Reconnecting...',
      [RealtimeErrorType.NETWORK_ERROR]: 'Network error. Please check your connection.',
      [RealtimeErrorType.DATA_VALIDATION_ERROR]: 'Invalid data received. Please refresh.',
      [RealtimeErrorType.MEMORY_LEAK_DETECTED]: 'Memory issue detected. Page may need refresh.',
      [RealtimeErrorType.CLEANUP_ERROR]: 'Cleanup error occurred. Functionality may be affected.',
    };

    const baseMessage = messages[type] || 'An unexpected error occurred.';
    
    if (severity === RealtimeSeverity.CRITICAL) {
      return `${baseMessage} Please refresh the page if issues persist.`;
    }
    
    return baseMessage;
  }

  /**
   * Get appropriate console log level
   */
  private getLogLevel(severity: RealtimeSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case RealtimeSeverity.LOW:
        return 'log';
      case RealtimeSeverity.MEDIUM:
        return 'warn';
      case RealtimeSeverity.HIGH:
      case RealtimeSeverity.CRITICAL:
        return 'error';
      default:
        return 'warn';
    }
  }

  /**
   * Calculate connection quality based on recent errors and heartbeat
   */
  private calculateConnectionQuality(): 'excellent' | 'good' | 'poor' | 'disconnected' {
    const now = new Date();
    const recentErrors = this.errors.filter(
      error => now.getTime() - error.context.timestamp.getTime() < 60000 // Last minute
    );

    // Check if disconnected
    if (!this.lastHeartbeat || now.getTime() - this.lastHeartbeat.getTime() > 30000) {
      return 'disconnected';
    }

    // Check error rate
    if (recentErrors.length === 0) {
      return 'excellent';
    } else if (recentErrors.length <= 2) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  /**
   * Update stats and notify callbacks
   */
  private updateStats(): void {
    const stats = this.getStats();
    this.statsCallbacks.forEach(callback => {
      try {
        callback(stats);
      } catch (callbackError) {
        console.error('Error in stats callback:', callbackError);
      }
    });
  }

  /**
   * Reset connection tracking
   */
  resetConnection(): void {
    this.connectionStartTime = new Date();
    this.lastHeartbeat = new Date();
    this.updateStats();
  }
}

// Global error handler instance
export const realtimeErrorHandler = new RealtimeErrorHandler();

/**
 * Hook for using real-time error handling in React components
 */
import { useEffect, useState } from 'react';

export const useRealtimeErrorHandling = () => {
  const [stats, setStats] = useState<ErrorStats>(realtimeErrorHandler.getStats());
  const [lastError, setLastError] = useState<RealtimeError | null>(null);

  useEffect(() => {
    const unsubscribeError = realtimeErrorHandler.onError(setLastError);
    const unsubscribeStats = realtimeErrorHandler.onStatsUpdate(setStats);

    return () => {
      unsubscribeError();
      unsubscribeStats();
    };
  }, []);

  return {
    stats,
    lastError,
    logError: realtimeErrorHandler.logError.bind(realtimeErrorHandler),
    logSuccess: realtimeErrorHandler.logSuccess.bind(realtimeErrorHandler),
    clearHistory: realtimeErrorHandler.clearHistory.bind(realtimeErrorHandler),
    getRecentErrors: realtimeErrorHandler.getRecentErrors.bind(realtimeErrorHandler),
  };
};

/**
 * Utility functions for common error scenarios
 */
export const RealtimeErrorUtils = {
  /**
   * Handle Supabase subscription errors
   */
  handleSubscriptionError: (
    error: any,
    subscriptionId: string,
    channelName: string,
    userId?: string
  ) => {
    return realtimeErrorHandler.logError(
      RealtimeErrorType.SUBSCRIPTION_ERROR,
      `Subscription failed: ${error?.message || 'Unknown error'}`,
      error,
      { subscriptionId, channelName, userId },
      RealtimeSeverity.HIGH
    );
  },

  /**
   * Handle connection timeouts
   */
  handleTimeout: (operation: string, timeout: number, context: Partial<RealtimeErrorContext> = {}) => {
    return realtimeErrorHandler.logError(
      RealtimeErrorType.TIMEOUT_ERROR,
      `Operation "${operation}" timed out after ${timeout}ms`,
      undefined,
      context,
      RealtimeSeverity.MEDIUM
    );
  },

  /**
   * Handle memory leak detection
   */
  handleMemoryLeak: (
    source: string,
    details: string,
    context: Partial<RealtimeErrorContext> = {}
  ) => {
    return realtimeErrorHandler.logError(
      RealtimeErrorType.MEMORY_LEAK_DETECTED,
      `Memory leak detected in ${source}: ${details}`,
      undefined,
      context,
      RealtimeSeverity.HIGH
    );
  },

  /**
   * Handle cleanup errors
   */
  handleCleanupError: (
    component: string,
    error: Error,
    context: Partial<RealtimeErrorContext> = {}
  ) => {
    return realtimeErrorHandler.logError(
      RealtimeErrorType.CLEANUP_ERROR,
      `Cleanup failed in ${component}: ${error.message}`,
      error,
      context,
      RealtimeSeverity.MEDIUM
    );
  },
};
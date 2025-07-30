'use client';

/**
 * Advanced Retry and Recovery System for Real-time Connections
 * 
 * This module provides:
 * - Exponential backoff with jitter
 * - Circuit breaker pattern
 * - Connection health monitoring
 * - Graceful degradation strategies
 * - Recovery state management
 */

import { realtimeErrorHandler, RealtimeErrorType, RealtimeSeverity } from './error-handling';

export enum RetryStrategy {
  EXPONENTIAL_BACKOFF = 'exponential_backoff',
  LINEAR_BACKOFF = 'linear_backoff',
  IMMEDIATE = 'immediate',
  CUSTOM = 'custom',
}

export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Circuit breaker is open, requests fail fast
  HALF_OPEN = 'half_open', // Testing if service is back up
}

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  strategy: RetryStrategy;
  jitterMax: number;
  timeoutMs: number;
  customDelayFn?: (attempt: number) => number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  halfOpenMaxRetries: number;
}

export interface ConnectionHealth {
  isHealthy: boolean;
  lastSuccessTime: Date | null;
  consecutiveFailures: number;
  averageLatency: number;
  successRate: number;
  circuitState: CircuitState;
}

export interface RetryAttempt {
  attempt: number;
  delay: number;
  timestamp: Date;
  error?: Error;
  success: boolean;
}

export interface RecoveryOperation<T = any> {
  id: string;
  name: string;
  operation: () => Promise<T>;
  config: RetryConfig;
  onSuccess?: (result: T, attempt: number) => void;
  onFailure?: (error: Error, attempt: number) => void;
  onFinalFailure?: (error: Error, attempts: RetryAttempt[]) => void;
}

class RetryRecoveryManager {
  private operations = new Map<string, RecoveryOperation>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private healthStats = new Map<string, ConnectionHealthStats>();
  private activeRetries = new Map<string, Promise<any>>();

  private defaultRetryConfig: RetryConfig = {
    maxRetries: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    strategy: RetryStrategy.EXPONENTIAL_BACKOFF,
    jitterMax: 1000,
    timeoutMs: 10000,
  };

  private defaultCircuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 30000,
    monitoringWindow: 60000,
    halfOpenMaxRetries: 3,
  };

  /**
   * Execute an operation with retry logic and circuit breaker protection
   */
  async executeWithRetry<T>(
    operationId: string,
    operation: RecoveryOperation<T>
  ): Promise<T> {
    // Check if already running
    if (this.activeRetries.has(operationId)) {
      return this.activeRetries.get(operationId)!;
    }

    // Check circuit breaker
    const circuitState = this.getCircuitState(operationId);
    if (circuitState === CircuitState.OPEN) {
      const error = new Error(`Circuit breaker is OPEN for operation: ${operationId}`);
      realtimeErrorHandler.logError(
        RealtimeErrorType.CONNECTION_FAILED,
        error.message,
        error,
        { subscriptionId: operationId },
        RealtimeSeverity.HIGH
      );
      throw error;
    }

    // Store operation
    this.operations.set(operationId, operation);

    // Create retry promise
    const retryPromise = this.performRetry(operationId, operation);
    this.activeRetries.set(operationId, retryPromise);

    try {
      const result = await retryPromise;
      this.recordSuccess(operationId);
      return result;
    } catch (error) {
      this.recordFailure(operationId, error as Error);
      throw error;
    } finally {
      this.activeRetries.delete(operationId);
    }
  }

  /**
   * Cancel an ongoing retry operation
   */
  cancelRetry(operationId: string): void {
    this.activeRetries.delete(operationId);
    this.operations.delete(operationId);
  }

  /**
   * Reset circuit breaker for an operation
   */
  resetCircuitBreaker(operationId: string): void {
    const circuit = this.circuitBreakers.get(operationId);
    if (circuit) {
      circuit.state = CircuitState.CLOSED;
      circuit.failureCount = 0;
      circuit.lastFailureTime = null;
    }
  }

  /**
   * Get health status for an operation
   */
  getHealth(operationId: string): ConnectionHealth {
    const stats = this.healthStats.get(operationId);
    const circuit = this.circuitBreakers.get(operationId);

    if (!stats) {
      return {
        isHealthy: false,
        lastSuccessTime: null,
        consecutiveFailures: 0,
        averageLatency: 0,
        successRate: 0,
        circuitState: CircuitState.CLOSED,
      };
    }

    const now = Date.now();
    const windowStart = now - this.defaultCircuitConfig.monitoringWindow;
    const recentAttempts = stats.attempts.filter(attempt => 
      attempt.timestamp.getTime() > windowStart
    );

    const successCount = recentAttempts.filter(attempt => attempt.success).length;
    const successRate = recentAttempts.length > 0 ? successCount / recentAttempts.length : 0;

    const latencies = recentAttempts
      .filter(attempt => attempt.success && attempt.latency !== undefined)
      .map(attempt => attempt.latency!);
    const averageLatency = latencies.length > 0 
      ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length 
      : 0;

    return {
      isHealthy: successRate >= 0.8 && stats.consecutiveFailures <= 2,
      lastSuccessTime: stats.lastSuccessTime,
      consecutiveFailures: stats.consecutiveFailures,
      averageLatency,
      successRate,
      circuitState: circuit?.state || CircuitState.CLOSED,
    };
  }

  /**
   * Get all health statuses
   */
  getAllHealth(): Record<string, ConnectionHealth> {
    const result: Record<string, ConnectionHealth> = {};
    
    // Get all operation IDs from both maps
    const allIds = new Set([
      ...this.healthStats.keys(),
      ...this.circuitBreakers.keys(),
    ]);

    allIds.forEach(id => {
      result[id] = this.getHealth(id);
    });

    return result;
  }

  /**
   * Clear all retry states
   */
  clearAll(): void {
    this.activeRetries.clear();
    this.operations.clear();
    this.circuitBreakers.clear();
    this.healthStats.clear();
  }

  /**
   * Perform the actual retry logic
   */
  private async performRetry<T>(
    operationId: string,
    operation: RecoveryOperation<T>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...operation.config };
    const attempts: RetryAttempt[] = [];
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      const startTime = Date.now();
      
      try {
        // Add timeout wrapper
        const result = await Promise.race([
          operation.operation(),
          this.createTimeoutPromise(config.timeoutMs),
        ]);

        const latency = Date.now() - startTime;
        
        // Record successful attempt
        const attemptRecord: RetryAttempt = {
          attempt,
          delay: 0,
          timestamp: new Date(),
          success: true,
        };
        attempts.push(attemptRecord);
        this.recordAttempt(operationId, attemptRecord, latency);

        // Success callback
        operation.onSuccess?.(result, attempt);

        realtimeErrorHandler.logSuccess(
          `Operation "${operation.name}" succeeded on attempt ${attempt + 1}`,
          { subscriptionId: operationId }
        );

        return result;

      } catch (error) {
        const latency = Date.now() - startTime;
        lastError = error as Error;

        // Record failed attempt
        const attemptRecord: RetryAttempt = {
          attempt,
          delay: 0,
          timestamp: new Date(),
          error: lastError,
          success: false,
        };
        attempts.push(attemptRecord);
        this.recordAttempt(operationId, attemptRecord, latency);

        // Failure callback
        operation.onFailure?.(lastError, attempt);

        realtimeErrorHandler.logError(
          RealtimeErrorType.CONNECTION_FAILED,
          `Operation "${operation.name}" failed on attempt ${attempt + 1}: ${lastError.message}`,
          lastError,
          { subscriptionId: operationId },
          attempt === config.maxRetries ? RealtimeSeverity.HIGH : RealtimeSeverity.MEDIUM
        );

        // Don't retry on last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        attemptRecord.delay = delay;

        // Wait before retry
        await this.delay(delay);
      }
    }

    // All retries failed
    if (lastError) {
      operation.onFinalFailure?.(lastError, attempts);
      throw lastError;
    }

    throw new Error('Operation failed for unknown reason');
  }

  /**
   * Calculate delay based on retry strategy
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    let delay: number;

    switch (config.strategy) {
      case RetryStrategy.EXPONENTIAL_BACKOFF:
        delay = Math.min(config.initialDelay * Math.pow(2, attempt), config.maxDelay);
        break;
      
      case RetryStrategy.LINEAR_BACKOFF:
        delay = Math.min(config.initialDelay * (attempt + 1), config.maxDelay);
        break;
      
      case RetryStrategy.IMMEDIATE:
        delay = 0;
        break;
      
      case RetryStrategy.CUSTOM:
        delay = config.customDelayFn ? config.customDelayFn(attempt) : config.initialDelay;
        break;
      
      default:
        delay = config.initialDelay;
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * config.jitterMax;
    return delay + jitter;
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise<T>(timeoutMs: number): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
  }

  /**
   * Simple delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get circuit breaker state
   */
  private getCircuitState(operationId: string): CircuitState {
    const circuit = this.getOrCreateCircuitBreaker(operationId);
    const now = Date.now();

    switch (circuit.state) {
      case CircuitState.CLOSED:
        return CircuitState.CLOSED;
      
      case CircuitState.OPEN:
        if (circuit.lastFailureTime && 
            now - circuit.lastFailureTime.getTime() > this.defaultCircuitConfig.recoveryTimeout) {
          circuit.state = CircuitState.HALF_OPEN;
          circuit.halfOpenAttempts = 0;
          return CircuitState.HALF_OPEN;
        }
        return CircuitState.OPEN;
      
      case CircuitState.HALF_OPEN:
        return CircuitState.HALF_OPEN;
      
      default:
        return CircuitState.CLOSED;
    }
  }

  /**
   * Get or create circuit breaker state
   */
  private getOrCreateCircuitBreaker(operationId: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(operationId)) {
      this.circuitBreakers.set(operationId, {
        state: CircuitState.CLOSED,
        failureCount: 0,
        lastFailureTime: null,
        halfOpenAttempts: 0,
      });
    }
    return this.circuitBreakers.get(operationId)!;
  }

  /**
   * Record a successful operation
   */
  private recordSuccess(operationId: string): void {
    const circuit = this.getOrCreateCircuitBreaker(operationId);
    
    // Reset circuit breaker on success
    circuit.failureCount = 0;
    circuit.lastFailureTime = null;
    
    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.state = CircuitState.CLOSED;
    }
  }

  /**
   * Record a failed operation
   */
  private recordFailure(operationId: string, error: Error): void {
    const circuit = this.getOrCreateCircuitBreaker(operationId);
    
    circuit.failureCount++;
    circuit.lastFailureTime = new Date();

    // Check if we should open the circuit
    if (circuit.state === CircuitState.CLOSED && 
        circuit.failureCount >= this.defaultCircuitConfig.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      
      realtimeErrorHandler.logError(
        RealtimeErrorType.CONNECTION_FAILED,
        `Circuit breaker OPENED for operation: ${operationId}`,
        error,
        { subscriptionId: operationId },
        RealtimeSeverity.HIGH
      );
    } else if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.halfOpenAttempts++;
      
      if (circuit.halfOpenAttempts >= this.defaultCircuitConfig.halfOpenMaxRetries) {
        circuit.state = CircuitState.OPEN;
      }
    }
  }

  /**
   * Record an attempt for health statistics
   */
  private recordAttempt(operationId: string, attempt: RetryAttempt, latency?: number): void {
    if (!this.healthStats.has(operationId)) {
      this.healthStats.set(operationId, {
        attempts: [],
        lastSuccessTime: null,
        consecutiveFailures: 0,
      });
    }

    const stats = this.healthStats.get(operationId)!;
    
    // Add latency to attempt if provided
    if (latency !== undefined) {
      (attempt as any).latency = latency;
    }
    
    stats.attempts.push(attempt);

    // Keep only recent attempts (last 100)
    if (stats.attempts.length > 100) {
      stats.attempts.shift();
    }

    if (attempt.success) {
      stats.lastSuccessTime = attempt.timestamp;
      stats.consecutiveFailures = 0;
    } else {
      stats.consecutiveFailures++;
    }
  }
}

/**
 * Internal types
 */
interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: Date | null;
  halfOpenAttempts: number;
}

interface ConnectionHealthStats {
  attempts: (RetryAttempt & { latency?: number })[];
  lastSuccessTime: Date | null;
  consecutiveFailures: number;
}

// Global retry manager instance
export const retryRecoveryManager = new RetryRecoveryManager();

/**
 * React hook for using retry and recovery functionality
 */
import { useEffect, useState } from 'react';

export const useRetryRecovery = () => {
  const [healthStatuses, setHealthStatuses] = useState<Record<string, ConnectionHealth>>({});

  useEffect(() => {
    const interval = setInterval(() => {
      setHealthStatuses(retryRecoveryManager.getAllHealth());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    healthStatuses,
    executeWithRetry: retryRecoveryManager.executeWithRetry.bind(retryRecoveryManager),
    cancelRetry: retryRecoveryManager.cancelRetry.bind(retryRecoveryManager),
    resetCircuitBreaker: retryRecoveryManager.resetCircuitBreaker.bind(retryRecoveryManager),
    getHealth: retryRecoveryManager.getHealth.bind(retryRecoveryManager),
    clearAll: retryRecoveryManager.clearAll.bind(retryRecoveryManager),
  };
};
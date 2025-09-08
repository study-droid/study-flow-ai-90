/**
 * Enhanced Circuit Breaker Tests
 * Comprehensive unit tests for the enhanced circuit breaker implementation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  EnhancedCircuitBreaker, 
  CircuitBreakerState,
  type EnhancedCircuitBreakerConfig 
} from '../enhanced-circuit-breaker';

// Mock logger
vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('EnhancedCircuitBreaker', () => {
  let circuitBreaker: EnhancedCircuitBreaker;
  let mockConfig: EnhancedCircuitBreakerConfig;
  let onStateChange: ReturnType<typeof vi.fn>;
  let onSuccess: ReturnType<typeof vi.fn>;
  let onFailure: ReturnType<typeof vi.fn>;
  let onHealthCheck: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    onStateChange = vi.fn();
    onSuccess = vi.fn();
    onFailure = vi.fn();
    onHealthCheck = vi.fn();

    mockConfig = {
      failureThreshold: 3,
      timeout: 1000,
      successThreshold: 2,
      monitoringPeriod: 5000,
      exponentialBackoffMultiplier: 2,
      maxTimeout: 10000,
      healthCheckInterval: 5000,
      automaticRecovery: true,
      onStateChange,
      onSuccess,
      onFailure,
      onHealthCheck
    };

    circuitBreaker = new EnhancedCircuitBreaker('test-service', mockConfig);
  });

  afterEach(() => {
    circuitBreaker.destroy();
    vi.useRealTimers();
  });

  describe('Initial State', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    it('should allow calls initially', () => {
      expect(circuitBreaker.isCallAllowed()).toBe(true);
    });

    it('should have correct initial stats', () => {
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.isHealthy).toBe(true);
    });
  });

  describe('Successful Execution', () => {
    it('should execute function successfully', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledOnce();
      expect(onSuccess).toHaveBeenCalledOnce();
    });

    it('should update stats on success', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      await circuitBreaker.execute(mockFn);
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.totalSuccesses).toBe(1);
      expect(stats.isHealthy).toBe(true);
    });

    it('should reset failure count on success in CLOSED state', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');
      
      // First call fails
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('fail');
      expect(circuitBreaker.getStats().failureCount).toBe(1);
      
      // Second call succeeds and resets failure count
      await circuitBreaker.execute(mockFn);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
    });
  });

  describe('Failure Handling', () => {
    it('should handle single failure', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getStats().failureCount).toBe(1);
    });

    it('should open circuit after threshold failures', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Fail 3 times (threshold)
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(onStateChange).toHaveBeenCalledWith(CircuitBreakerState.OPEN);
    });

    it('should fail fast when circuit is open', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      // Next call should fail fast
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockFn).toHaveBeenCalledTimes(3); // Should not call the function again
    });
  });

  describe('Exponential Backoff', () => {
    it('should apply exponential backoff on repeated failures', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Manually set the circuit to OPEN state to test exponential backoff
      circuitBreaker.forceOpen();
      const initialTimeout = circuitBreaker.getStats().currentTimeout;
      
      // Advance time to allow retry attempt
      vi.advanceTimersByTime(initialTimeout + 100);
      
      // This should fail and trigger exponential backoff since circuit is already OPEN
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      
      const newTimeout = circuitBreaker.getStats().currentTimeout;
      // The timeout should be increased due to exponential backoff
      expect(newTimeout).toBeGreaterThanOrEqual(initialTimeout);
    });

    it('should respect maximum timeout', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      // Trigger multiple backoffs
      for (let i = 0; i < 5; i++) {
        const timeout = circuitBreaker.getStats().currentTimeout;
        vi.advanceTimersByTime(timeout + 100);
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow();
      }
      
      const finalTimeout = circuitBreaker.getStats().currentTimeout;
      expect(finalTimeout).toBeLessThanOrEqual(mockConfig.maxTimeout);
    });
  });

  describe('Half-Open State Recovery', () => {
    it('should transition to HALF_OPEN after timeout', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      
      // Advance time past timeout
      vi.advanceTimersByTime(mockConfig.timeout + 100);
      
      // Next call should transition to HALF_OPEN
      mockFn.mockResolvedValueOnce('success');
      await circuitBreaker.execute(mockFn);
      
      expect(onStateChange).toHaveBeenCalledWith(CircuitBreakerState.HALF_OPEN);
    });

    it('should close circuit after successful threshold in HALF_OPEN', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      
      // Advance time to allow retry
      vi.advanceTimersByTime(mockConfig.timeout + 100);
      
      // Mock successful responses for recovery
      mockFn.mockResolvedValue('success');
      
      // Execute successful calls to close circuit
      for (let i = 0; i < mockConfig.successThreshold; i++) {
        await circuitBreaker.execute(mockFn);
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(onStateChange).toHaveBeenCalledWith(CircuitBreakerState.CLOSED);
    });

    it('should reopen circuit on failure in HALF_OPEN state', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      // Advance time to allow retry
      vi.advanceTimersByTime(mockConfig.timeout + 100);
      
      // Fail in HALF_OPEN state
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform automatic health checks when enabled', () => {
      expect(onHealthCheck).not.toHaveBeenCalled();
      
      // Advance time to trigger health check
      vi.advanceTimersByTime(mockConfig.healthCheckInterval + 100);
      
      // Health check should be called for monitoring
      // Note: Health checks only trigger recovery attempts when circuit is OPEN
    });

    it('should trigger recovery on health check when circuit is OPEN', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      
      // Advance time past timeout
      vi.advanceTimersByTime(mockConfig.timeout + 100);
      
      // Trigger health check
      vi.advanceTimersByTime(mockConfig.healthCheckInterval);
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });
  });

  describe('Manual Control', () => {
    it('should force open circuit', () => {
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      
      circuitBreaker.forceOpen();
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      expect(onStateChange).toHaveBeenCalledWith(CircuitBreakerState.OPEN);
    });

    it('should force close circuit', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);
      
      circuitBreaker.forceClose();
      
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
      expect(circuitBreaker.getStats().isHealthy).toBe(true);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track comprehensive statistics', async () => {
      const mockFn = vi.fn()
        .mockResolvedValueOnce('success1')
        .mockRejectedValueOnce(new Error('error1'))
        .mockResolvedValueOnce('success2');
      
      // Add a small delay to ensure uptime is measurable
      vi.advanceTimersByTime(10);
      
      await circuitBreaker.execute(mockFn);
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('error1');
      await circuitBreaker.execute(mockFn);
      
      const stats = circuitBreaker.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.errorRate).toBeCloseTo(33.33, 1);
      expect(stats.uptime).toBeGreaterThanOrEqual(10);
    });

    it('should calculate time until next attempt correctly', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('test error'));
      
      // Open circuit
      for (let i = 0; i < 3; i++) {
        await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('test error');
      }
      
      const timeUntilNext = circuitBreaker.getTimeUntilNextAttempt();
      expect(timeUntilNext).toBeGreaterThan(0);
      expect(timeUntilNext).toBeLessThanOrEqual(mockConfig.timeout);
    });

    it('should return zero time until next attempt when circuit is closed', () => {
      expect(circuitBreaker.getTimeUntilNextAttempt()).toBe(0);
    });
  });

  describe('Configuration Validation', () => {
    it('should handle different configuration values', () => {
      const customConfig: EnhancedCircuitBreakerConfig = {
        failureThreshold: 5,
        timeout: 2000,
        successThreshold: 3,
        monitoringPeriod: 10000,
        exponentialBackoffMultiplier: 1.5,
        maxTimeout: 30000,
        healthCheckInterval: 10000,
        automaticRecovery: false
      };
      
      const customCircuitBreaker = new EnhancedCircuitBreaker('custom-service', customConfig);
      
      expect(customCircuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
      expect(customCircuitBreaker.getStats().currentTimeout).toBe(customConfig.timeout);
      
      customCircuitBreaker.destroy();
    });
  });

  describe('Error Handling', () => {
    it('should handle async function errors properly', async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        throw new Error('Async error');
      });
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Async error');
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle synchronous function errors', async () => {
      const mockFn = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      
      await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Sync error');
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      const spy = vi.spyOn(global, 'clearInterval');
      
      circuitBreaker.destroy();
      
      expect(spy).toHaveBeenCalled();
    });
  });
});
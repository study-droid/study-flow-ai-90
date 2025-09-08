/**
 * Error Handler Service Tests
 * Tests for comprehensive error classification and recovery
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ErrorHandlerService, ErrorCategory, ErrorSeverity } from '../error-handler.service';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';

// Mock dependencies
vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

vi.mock('@/services/reliability/circuit-breaker', () => ({
  circuitBreakerManager: {
    resetFailingCircuits: vi.fn(),
    resetAll: vi.fn(),
    getHealthSummary: vi.fn(() => ({
      total: 3,
      healthy: 2,
      degraded: 0,
      failed: 1,
      overallHealth: 'degraded'
    }))
  }
}));

describe('ErrorHandlerService', () => {
  let errorHandler: ErrorHandlerService;

  beforeEach(() => {
    errorHandler = ErrorHandlerService.getInstance();
    errorHandler.clearRecoveryAttempts();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Error Classification', () => {
    it('should classify network errors correctly', () => {
      const networkError = new Error('NetworkError: Failed to fetch');
      const classified = errorHandler.classifyError(networkError);

      expect(classified.category).toBe(ErrorCategory.NETWORK);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.retryable).toBe(true);
      expect(classified.fallbackAvailable).toBe(true);
      expect(classified.userMessage).toContain('Connection problem');
    });

    it('should classify authentication errors correctly', () => {
      const authError = new Error('401 Unauthorized access');
      const classified = errorHandler.classifyError(authError);

      expect(classified.category).toBe(ErrorCategory.AUTHENTICATION);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.retryable).toBe(false);
      expect(classified.fallbackAvailable).toBe(false);
      expect(classified.userMessage).toContain('Authentication required');
    });

    it('should classify API errors correctly', () => {
      const apiError = new Error('HTTP error: 500 Internal Server Error');
      const classified = errorHandler.classifyError(apiError);

      expect(classified.category).toBe(ErrorCategory.API);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.retryable).toBe(true);
      expect(classified.fallbackAvailable).toBe(true);
      expect(classified.userMessage).toContain('Service temporarily unavailable');
    });

    it('should classify rate limit errors correctly', () => {
      const rateLimitError = new Error('Rate limit exceeded: 429 Too Many Requests');
      const classified = errorHandler.classifyError(rateLimitError);

      expect(classified.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.retryable).toBe(true);
      expect(classified.fallbackAvailable).toBe(true);
      expect(classified.userMessage).toContain('Too many requests');
    });

    it('should classify circuit breaker errors correctly', () => {
      const circuitError = new Error('Circuit breaker is OPEN for service');
      const classified = errorHandler.classifyError(circuitError);

      expect(classified.category).toBe(ErrorCategory.CIRCUIT_BREAKER);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.retryable).toBe(true);
      expect(classified.fallbackAvailable).toBe(true);
      expect(classified.userMessage).toContain('Service protection activated');
    });

    it('should classify timeout errors correctly', () => {
      const timeoutError = new Error('Request timeout after 30 seconds');
      const classified = errorHandler.classifyError(timeoutError);

      expect(classified.category).toBe(ErrorCategory.TIMEOUT);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.retryable).toBe(true);
      expect(classified.fallbackAvailable).toBe(true);
      expect(classified.userMessage).toContain('Request timed out');
    });

    it('should classify validation errors correctly', () => {
      const validationError = new Error('Validation failed: required field missing');
      const classified = errorHandler.classifyError(validationError);

      expect(classified.category).toBe(ErrorCategory.VALIDATION);
      expect(classified.severity).toBe(ErrorSeverity.LOW);
      expect(classified.retryable).toBe(false);
      expect(classified.fallbackAvailable).toBe(false);
      expect(classified.userMessage).toContain('Invalid input detected');
    });

    it('should classify application errors correctly', () => {
      const appError = new Error('TypeError: Cannot read properties of undefined');
      const classified = errorHandler.classifyError(appError);

      expect(classified.category).toBe(ErrorCategory.APPLICATION);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.retryable).toBe(false);
      expect(classified.fallbackAvailable).toBe(false);
      expect(classified.userMessage).toContain('unexpected error occurred');
    });

    it('should classify unknown errors correctly', () => {
      const unknownError = new Error('Some completely random error message');
      const classified = errorHandler.classifyError(unknownError);

      expect(classified.category).toBe(ErrorCategory.UNKNOWN);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.retryable).toBe(true);
      expect(classified.fallbackAvailable).toBe(false);
      expect(classified.userMessage).toContain('Something unexpected happened');
    });

    it('should include context in classified error', () => {
      const error = new Error('Test error');
      const context = { userId: '123', action: 'sendMessage' };
      const classified = errorHandler.classifyError(error, context);

      expect(classified.context).toEqual(context);
      expect(classified.originalError).toBe(error);
    });
  });

  describe('Error Recovery', () => {
    it('should attempt automatic recovery for retryable errors', async () => {
      const error = new Error('Failed to fetch');
      const classified = errorHandler.classifyError(error);
      
      let operationCalled = false;
      const mockOperation = vi.fn(async () => {
        operationCalled = true;
        return 'success';
      });

      const result = await errorHandler.attemptRecovery(classified, mockOperation);

      expect(result.success).toBe(true);
      expect(result.action).toBe('retry');
      expect(operationCalled).toBe(true);
    });

    it('should handle recovery failure gracefully', async () => {
      const error = new Error('Failed to fetch');
      const classified = errorHandler.classifyError(error);
      
      const mockOperation = vi.fn(async () => {
        throw new Error('Still failing');
      });

      const result = await errorHandler.attemptRecovery(classified, mockOperation);

      expect(result.success).toBe(false);
      expect(result.action).toBe('none');
      expect(result.message).toContain('All automatic recovery attempts failed');
    });

    it('should reset circuit breakers for circuit breaker errors', async () => {
      const error = new Error('Circuit breaker is OPEN');
      const classified = errorHandler.classifyError(error);
      
      const mockOperation = vi.fn(async () => 'success');

      await errorHandler.attemptRecovery(classified, mockOperation);

      expect(circuitBreakerManager.resetFailingCircuits).toHaveBeenCalled();
    });

    it('should implement exponential backoff for retries', async () => {
      const error = new Error('Network error');
      const classified = errorHandler.classifyError(error);
      
      let attemptCount = 0;
      const mockOperation = vi.fn(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Still failing');
        }
        return 'success';
      });

      const startTime = Date.now();
      const result = await errorHandler.attemptRecovery(classified, mockOperation);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      // Should have some delay due to exponential backoff
      expect(endTime - startTime).toBeGreaterThan(1000); // At least 1 second delay
    });

    it('should limit retry attempts', async () => {
      const error = new Error('Network error');
      const classified = errorHandler.classifyError(error);
      
      let attemptCount = 0;
      const mockOperation = vi.fn(async () => {
        attemptCount++;
        throw new Error('Always failing');
      });

      // Attempt recovery multiple times to test limit
      await errorHandler.attemptRecovery(classified, mockOperation);
      await errorHandler.attemptRecovery(classified, mockOperation);
      await errorHandler.attemptRecovery(classified, mockOperation);
      await errorHandler.attemptRecovery(classified, mockOperation);

      // Should not exceed max retry attempts (3) per error key
      expect(attemptCount).toBeLessThanOrEqual(3);
    });
  });

  describe('User-Friendly Messages', () => {
    it('should provide user-friendly messages with guidance', () => {
      const error = new Error('NetworkError: Failed to fetch');
      const classified = errorHandler.classifyError(error);
      const userMessage = errorHandler.getUserFriendlyMessage(classified);

      expect(userMessage.title).toBe('Connection Problem');
      expect(userMessage.message).toContain('Connection problem detected');
      expect(userMessage.guidance).toHaveLength(4);
      expect(userMessage.guidance[0]).toContain('Check your internet connection');
      expect(userMessage.actions).toHaveLength(1);
      expect(userMessage.actions[0].label).toContain('Refresh page');
    });

    it('should provide different messages for different error categories', () => {
      const networkError = new Error('NetworkError: Failed to fetch');
      const authError = new Error('401 Unauthorized access');
      
      const networkClassified = errorHandler.classifyError(networkError);
      const authClassified = errorHandler.classifyError(authError);
      
      const networkMessage = errorHandler.getUserFriendlyMessage(networkClassified);
      const authMessage = errorHandler.getUserFriendlyMessage(authClassified);

      expect(networkMessage.title).toBe('Connection Problem');
      expect(authMessage.title).toBe('Authentication Required');
      expect(networkMessage.message).not.toBe(authMessage.message);
    });

    it('should include manual recovery actions', () => {
      const error = new Error('Circuit breaker is OPEN');
      const classified = errorHandler.classifyError(error);
      const userMessage = errorHandler.getUserFriendlyMessage(classified);

      expect(userMessage.actions).toHaveLength(1);
      expect(userMessage.actions[0].label).toContain('Manual reset');
      expect(userMessage.actions[0].primary).toBe(false);
    });
  });

  describe('Recovery Attempt Tracking', () => {
    it('should track recovery attempts per error type', async () => {
      const error1 = new Error('NetworkError: Failed to fetch');
      const error2 = new Error('HTTP error: 500 Internal Server Error');
      
      const classified1 = errorHandler.classifyError(error1);
      const classified2 = errorHandler.classifyError(error2);
      
      const mockOperation = vi.fn(async () => {
        throw new Error('Still failing');
      });

      await errorHandler.attemptRecovery(classified1, mockOperation);
      await errorHandler.attemptRecovery(classified2, mockOperation);

      const attempts = errorHandler.getRecoveryAttempts();
      expect(attempts.size).toBeGreaterThanOrEqual(1);
    });

    it('should clear recovery attempts', async () => {
      const error = new Error('NetworkError: Failed to fetch');
      const classified = errorHandler.classifyError(error);
      
      // Simulate some attempts
      await errorHandler.attemptRecovery(classified, async () => {
        throw new Error('Failing');
      });

      errorHandler.clearRecoveryAttempts();
      expect(errorHandler.getRecoveryAttempts().size).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ErrorHandlerService.getInstance();
      const instance2 = ErrorHandlerService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});
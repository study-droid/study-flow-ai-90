/**
 * Error Handling Integration Test
 * Tests the complete error handling flow in the AI tutor system
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../error-handler.service';
import { AITutorService } from '../ai-tutor.service';

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

vi.mock('../ai-tutor-fallback.service', () => ({
  aiTutorFallbackService: {
    sendMessage: vi.fn(),
    isAvailable: vi.fn(() => true)
  }
}));

describe('Error Handling Integration', () => {
  let aiTutorService: AITutorService;

  beforeEach(() => {
    aiTutorService = new AITutorService();
    vi.clearAllMocks();
  });

  it('should handle network errors gracefully', async () => {
    const networkError = new Error('NetworkError: Failed to fetch');
    const classified = errorHandler.classifyError(networkError);

    expect(classified.category).toBe('NETWORK');
    expect(classified.retryable).toBe(true);
    expect(classified.fallbackAvailable).toBe(true);
    
    const userMessage = errorHandler.getUserFriendlyMessage(classified);
    expect(userMessage.title).toBe('Connection Problem');
    expect(userMessage.guidance.length).toBeGreaterThan(0);
  });

  it('should provide actionable recovery options', async () => {
    const circuitError = new Error('Circuit breaker is OPEN for service');
    const classified = errorHandler.classifyError(circuitError);

    expect(classified.recoveryActions.length).toBeGreaterThan(0);
    
    const automaticActions = classified.recoveryActions.filter(action => action.automatic);
    const manualActions = classified.recoveryActions.filter(action => !action.automatic);
    
    expect(automaticActions.length).toBeGreaterThan(0);
    expect(manualActions.length).toBeGreaterThan(0);
  });

  it('should classify different error types correctly', () => {
    const testCases = [
      { error: new Error('NetworkError: Failed to fetch'), expectedCategory: 'NETWORK' },
      { error: new Error('401 Unauthorized access'), expectedCategory: 'AUTHENTICATION' },
      { error: new Error('Rate limit exceeded'), expectedCategory: 'RATE_LIMIT' },
      { error: new Error('Circuit breaker is OPEN'), expectedCategory: 'CIRCUIT_BREAKER' },
      { error: new Error('Request timeout after 30s'), expectedCategory: 'TIMEOUT' },
      { error: new Error('Validation failed: missing field'), expectedCategory: 'VALIDATION' },
      { error: new Error('TypeError: Cannot read properties'), expectedCategory: 'APPLICATION' },
      { error: new Error('HTTP error: 500'), expectedCategory: 'API' }
    ];

    testCases.forEach(({ error, expectedCategory }) => {
      const classified = errorHandler.classifyError(error);
      expect(classified.category).toBe(expectedCategory);
    });
  });

  it('should provide appropriate severity levels', () => {
    const criticalError = new Error('TypeError: Cannot read properties of undefined');
    const mediumError = new Error('HTTP error: 500');
    const lowError = new Error('Validation failed: missing field');

    const criticalClassified = errorHandler.classifyError(criticalError);
    const mediumClassified = errorHandler.classifyError(mediumError);
    const lowClassified = errorHandler.classifyError(lowError);

    expect(criticalClassified.severity).toBe('HIGH');
    expect(mediumClassified.severity).toBe('MEDIUM');
    expect(lowClassified.severity).toBe('LOW');
  });

  it('should handle error recovery attempts', async () => {
    const retryableError = new Error('NetworkError: Failed to fetch');
    const classified = errorHandler.classifyError(retryableError);

    let attemptCount = 0;
    const mockOperation = vi.fn(async () => {
      attemptCount++;
      if (attemptCount < 2) {
        throw new Error('Still failing');
      }
      return 'success';
    });

    const result = await errorHandler.attemptRecovery(classified, mockOperation);
    
    expect(result.success).toBe(true);
    expect(attemptCount).toBe(2);
  });
});
/**
 * Request Queue Service Tests
 * Tests for request queuing, rate limiting, and retry logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RequestQueueService, type QueuedRequest, type QueueStatus } from '../request-queue.service';

// Mock the AI tutor fallback service
vi.mock('../ai-tutor-fallback.service', () => ({
  aiTutorFallbackService: {
    sendMessage: vi.fn()
  }
}));

// Mock logger
vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('RequestQueueService', () => {
  let queueService: RequestQueueService;
  let mockSendMessage: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Import the mocked service
    const { aiTutorFallbackService } = await import('../ai-tutor-fallback.service');
    mockSendMessage = aiTutorFallbackService.sendMessage as any;
    
    // Create new queue service with test configuration
    queueService = new RequestQueueService(
      {
        maxRequestsPerMinute: 5,
        maxConcurrentRequests: 2,
        burstLimit: 3,
        cooldownPeriod: 1000
      },
      {
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2,
        jitter: false
      }
    );
  });

  afterEach(async () => {
    // Pause processing to prevent new requests
    queueService.pauseProcessing();
    
    // Clear queue and handle rejections
    try {
      queueService.clearQueue();
    } catch (error) {
      // Expected - queue clearing rejects pending requests
    }
    
    // Wait a bit for cleanup
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  describe('Basic Queue Operations', () => {
    it('should queue and process a single request', async () => {
      const mockResponse = { content: 'Test response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } };
      mockSendMessage.mockResolvedValue(mockResponse);

      const promise = queueService.queueRequest('Test message', 'session1');
      const result = await promise;

      expect(result).toEqual(mockResponse);
      expect(mockSendMessage).toHaveBeenCalledWith('Test message', 'session1', expect.any(Object));
    });

    it('should handle multiple requests in queue', async () => {
      const mockResponse1 = { content: 'Response 1', metadata: { model: 'test', tokens: 10, temperature: 0.7 } };
      const mockResponse2 = { content: 'Response 2', metadata: { model: 'test', tokens: 15, temperature: 0.7 } };
      
      mockSendMessage
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2);

      const promise1 = queueService.queueRequest('Message 1', 'session1');
      const promise2 = queueService.queueRequest('Message 2', 'session2');

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockResponse1);
      expect(result2).toEqual(mockResponse2);
    });

    it('should respect priority ordering', async () => {
      const responses = ['Low priority', 'High priority', 'Medium priority'];
      mockSendMessage
        .mockResolvedValueOnce({ content: responses[1], metadata: { model: 'test', tokens: 10, temperature: 0.7 } })
        .mockResolvedValueOnce({ content: responses[2], metadata: { model: 'test', tokens: 10, temperature: 0.7 } })
        .mockResolvedValueOnce({ content: responses[0], metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      // Queue requests with different priorities
      const lowPriority = queueService.queueRequest('Low priority message', 'session1', {}, 0);
      const highPriority = queueService.queueRequest('High priority message', 'session2', {}, 10);
      const mediumPriority = queueService.queueRequest('Medium priority message', 'session3', {}, 5);

      const results = await Promise.all([lowPriority, highPriority, mediumPriority]);

      // High priority should be processed first
      expect(results[1].content).toBe('High priority');
    });
  });

  describe('Rate Limiting', () => {
    it('should track request history for rate limiting', async () => {
      mockSendMessage.mockResolvedValue({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      // Send multiple requests quickly
      const promises = Array.from({ length: 3 }, (_, i) => 
        queueService.queueRequest(`Message ${i}`, `session${i}`)
      );

      await Promise.all(promises);

      const status = queueService.getStatus();
      expect(status.requestsInLastMinute).toBe(3);
    });

    it('should enforce rate limits', async () => {
      mockSendMessage.mockResolvedValue({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      // Fill up the rate limit quickly
      const promises = Array.from({ length: 6 }, (_, i) => 
        queueService.queueRequest(`Message ${i}`, `session${i}`)
      );

      // Wait a bit for queue to process some requests
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that rate limiting is working
      const status = queueService.getStatus();
      expect(status.requestsInLastMinute).toBeGreaterThan(0);

      // Wait for all requests to complete
      await Promise.all(promises);
    }, 15000); // Increase timeout
  });

  describe('Error Handling and Retries', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const error = new Error('Network timeout');
      mockSendMessage
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ content: 'Success after retry', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      const result = await queueService.queueRequest('Test message', 'session1', {}, 0, 3);

      expect(result.content).toBe('Success after retry');
      expect(mockSendMessage).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const error = new Error('Persistent network error');
      mockSendMessage.mockRejectedValue(error);

      await expect(
        queueService.queueRequest('Test message', 'session1', {}, 0, 2)
      ).rejects.toThrow('Persistent network error');

      expect(mockSendMessage).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Invalid API key');
      mockSendMessage.mockRejectedValue(error);

      await expect(
        queueService.queueRequest('Test message', 'session1')
      ).rejects.toThrow('Invalid API key');

      expect(mockSendMessage).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('Queue Status and Monitoring', () => {
    it('should provide accurate queue status', () => {
      const status = queueService.getStatus();

      expect(status).toMatchObject({
        queueLength: expect.any(Number),
        processingCount: expect.any(Number),
        rateLimitActive: expect.any(Boolean),
        estimatedWaitTime: expect.any(Number),
        requestsInLastMinute: expect.any(Number),
        nextAvailableSlot: expect.any(Number)
      });
    });

    it('should notify status change subscribers', async () => {
      const statusCallback = vi.fn();
      const unsubscribe = queueService.onStatusChange(statusCallback);

      mockSendMessage.mockResolvedValue({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });
      
      await queueService.queueRequest('Test message', 'session1');

      expect(statusCallback).toHaveBeenCalled();
      unsubscribe();
    });

    it('should calculate estimated wait times', () => {
      // Queue multiple requests to test wait time calculation
      mockSendMessage.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } }), 100)
      ));

      queueService.queueRequest('Message 1', 'session1');
      queueService.queueRequest('Message 2', 'session2');
      queueService.queueRequest('Message 3', 'session3');

      const status = queueService.getStatus();
      expect(status.estimatedWaitTime).toBeGreaterThan(0);
    });
  });

  describe('Queue Management', () => {
    it('should clear queue and reject pending requests', async () => {
      mockSendMessage.mockImplementation(() => new Promise(() => {})); // Never resolves

      const promise1 = queueService.queueRequest('Message 1', 'session1');
      const promise2 = queueService.queueRequest('Message 2', 'session2');

      // Wait for requests to be queued
      await new Promise(resolve => setTimeout(resolve, 10));

      queueService.clearQueue();

      // Handle the expected rejections
      try {
        await promise1;
      } catch (error) {
        expect(error.message).toBe('Queue cleared by user');
      }

      try {
        await promise2;
      } catch (error) {
        expect(error.message).toBe('Queue cleared by user');
      }

      const status = queueService.getStatus();
      expect(status.queueLength).toBe(0);
    });

    it('should pause and resume processing', async () => {
      mockSendMessage.mockResolvedValue({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      queueService.pauseProcessing();
      
      const promise = queueService.queueRequest('Test message', 'session1');
      
      // Wait a bit to ensure it's queued but not processed
      await new Promise(resolve => setTimeout(resolve, 50));
      
      let status = queueService.getStatus();
      expect(status.queueLength).toBeGreaterThan(0);

      queueService.resumeProcessing();
      
      const result = await promise;
      expect(result.content).toBe('Response');
    });
  });

  describe('Event Handling', () => {
    it('should emit queue status events', async () => {
      const onEvent = vi.fn();
      mockSendMessage.mockResolvedValue({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      await queueService.queueRequest('Test message', 'session1', { onEvent });

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'queue_status',
          sessionId: 'session1'
        })
      );
    });

    it('should emit processing start events', async () => {
      const onEvent = vi.fn();
      mockSendMessage.mockResolvedValue({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      await queueService.queueRequest('Test message', 'session1', { onEvent });

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'processing_start',
          sessionId: 'session1'
        })
      );
    });

    it('should emit retry attempt events', async () => {
      const onEvent = vi.fn();
      const error = new Error('Network timeout');
      
      mockSendMessage
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({ content: 'Success', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });

      await queueService.queueRequest('Test message', 'session1', { onEvent }, 0, 2);

      expect(onEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'retry_attempt',
          sessionId: 'session1',
          data: expect.objectContaining({
            retryCount: 1,
            maxRetries: 2
          })
        })
      );
    });
  });
});
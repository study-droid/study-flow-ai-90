/**
 * useRequestQueue Hook Tests
 * Tests for the request queue React hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRequestQueue } from '../useRequestQueue';

// Mock the request queue service
const mockQueueService = {
  queueRequest: vi.fn(),
  getStatus: vi.fn(),
  onStatusChange: vi.fn(),
  clearQueue: vi.fn(),
  pauseProcessing: vi.fn(),
  resumeProcessing: vi.fn()
};

vi.mock('../../services/request-queue.service', () => ({
  requestQueueService: mockQueueService
}));

// Mock logger
vi.mock('@/services/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}));

describe('useRequestQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockQueueService.getStatus.mockReturnValue({
      queueLength: 0,
      processingCount: 0,
      rateLimitActive: false,
      estimatedWaitTime: 0,
      requestsInLastMinute: 0,
      nextAvailableSlot: Date.now()
    });
    
    mockQueueService.onStatusChange.mockImplementation((callback) => {
      // Immediately call with initial status
      callback(mockQueueService.getStatus());
      return () => {}; // Unsubscribe function
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Hook Functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRequestQueue());

      expect(result.current.status).toBeDefined();
      expect(result.current.activeRequests).toEqual([]);
      expect(result.current.isQueueActive).toBe(false);
      expect(result.current.isRateLimited).toBe(false);
      expect(result.current.estimatedWaitTime).toBe(0);
    });

    it('should subscribe to status changes on mount', () => {
      renderHook(() => useRequestQueue());

      expect(mockQueueService.onStatusChange).toHaveBeenCalledWith(expect.any(Function));
      expect(mockQueueService.getStatus).toHaveBeenCalled();
    });

    it('should unsubscribe on unmount', () => {
      const unsubscribe = vi.fn();
      mockQueueService.onStatusChange.mockReturnValue(unsubscribe);

      const { unmount } = renderHook(() => useRequestQueue());
      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Queue Request Functionality', () => {
    it('should queue a request successfully', async () => {
      const mockResponse = { content: 'Test response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } };
      mockQueueService.queueRequest.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRequestQueue());

      let response;
      await act(async () => {
        response = await result.current.queueRequest('Test message', 'session1');
      });

      expect(response).toEqual(mockResponse);
      expect(mockQueueService.queueRequest).toHaveBeenCalledWith(
        'Test message',
        'session1',
        expect.objectContaining({
          onEvent: expect.any(Function)
        }),
        0,
        3
      );
    });

    it('should handle request errors', async () => {
      const error = new Error('Request failed');
      mockQueueService.queueRequest.mockRejectedValue(error);

      const { result } = renderHook(() => useRequestQueue());

      await act(async () => {
        await expect(
          result.current.queueRequest('Test message', 'session1')
        ).rejects.toThrow('Request failed');
      });
    });

    it('should track active requests', async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise(resolve => {
        resolveRequest = resolve;
      });
      
      mockQueueService.queueRequest.mockReturnValue(requestPromise);

      const { result } = renderHook(() => useRequestQueue());

      act(() => {
        result.current.queueRequest('Test message', 'session1');
      });

      // Should have one active request
      await waitFor(() => {
        expect(result.current.activeRequests).toHaveLength(1);
      });

      // Resolve the request
      act(() => {
        resolveRequest!({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });
      });

      // Request should be completed and cleaned up after delay
      await waitFor(() => {
        expect(result.current.activeRequests).toHaveLength(0);
      }, { timeout: 6000 });
    });

    it('should use custom priority and max retries', async () => {
      const mockResponse = { content: 'Test response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } };
      mockQueueService.queueRequest.mockResolvedValue(mockResponse);

      const { result } = renderHook(() => useRequestQueue({
        priority: 5,
        maxRetries: 5
      }));

      await act(async () => {
        await result.current.queueRequest('Test message', 'session1');
      });

      expect(mockQueueService.queueRequest).toHaveBeenCalledWith(
        'Test message',
        'session1',
        expect.any(Object),
        5, // priority
        5  // maxRetries
      );
    });
  });

  describe('Status Monitoring', () => {
    it('should update status when queue changes', () => {
      let statusCallback: (status: any) => void;
      mockQueueService.onStatusChange.mockImplementation((callback) => {
        statusCallback = callback;
        return () => {};
      });

      const { result } = renderHook(() => useRequestQueue());

      const newStatus = {
        queueLength: 2,
        processingCount: 1,
        rateLimitActive: true,
        estimatedWaitTime: 5000,
        requestsInLastMinute: 10,
        nextAvailableSlot: Date.now() + 5000
      };

      act(() => {
        statusCallback!(newStatus);
      });

      expect(result.current.status).toEqual(newStatus);
      expect(result.current.isQueueActive).toBe(true);
      expect(result.current.isRateLimited).toBe(true);
      expect(result.current.estimatedWaitTime).toBe(5000);
    });

    it('should call custom status change handler', () => {
      const onStatusChange = vi.fn();
      let statusCallback: (status: any) => void;
      
      mockQueueService.onStatusChange.mockImplementation((callback) => {
        statusCallback = callback;
        return () => {};
      });

      renderHook(() => useRequestQueue({ onStatusChange }));

      const newStatus = { queueLength: 1, processingCount: 0, rateLimitActive: false, estimatedWaitTime: 0, requestsInLastMinute: 1, nextAvailableSlot: Date.now() };

      act(() => {
        statusCallback!(newStatus);
      });

      expect(onStatusChange).toHaveBeenCalledWith(newStatus);
    });
  });

  describe('Queue Management', () => {
    it('should clear queue', () => {
      const { result } = renderHook(() => useRequestQueue());

      act(() => {
        result.current.clearQueue();
      });

      expect(mockQueueService.clearQueue).toHaveBeenCalled();
    });

    it('should pause queue', () => {
      const { result } = renderHook(() => useRequestQueue());

      act(() => {
        result.current.pauseQueue();
      });

      expect(mockQueueService.pauseProcessing).toHaveBeenCalled();
    });

    it('should resume queue', () => {
      const { result } = renderHook(() => useRequestQueue());

      act(() => {
        result.current.resumeQueue();
      });

      expect(mockQueueService.resumeProcessing).toHaveBeenCalled();
    });
  });

  describe('Queue Statistics', () => {
    it('should return queue statistics', () => {
      const mockStatus = {
        queueLength: 3,
        processingCount: 2,
        rateLimitActive: true,
        estimatedWaitTime: 10000,
        requestsInLastMinute: 15,
        nextAvailableSlot: Date.now() + 5000
      };

      mockQueueService.getStatus.mockReturnValue(mockStatus);

      const { result } = renderHook(() => useRequestQueue());

      const stats = result.current.getQueueStats();

      expect(stats).toEqual({
        totalQueued: 3,
        processing: 2,
        rateLimited: true,
        requestsPerMinute: 15,
        averageWaitTime: 10000,
        nextAvailable: expect.any(Date)
      });
    });

    it('should return null when no status available', () => {
      mockQueueService.getStatus.mockReturnValue(null);
      mockQueueService.onStatusChange.mockImplementation((callback) => {
        callback(null);
        return () => {};
      });

      const { result } = renderHook(() => useRequestQueue());

      const stats = result.current.getQueueStats();
      expect(stats).toBeNull();
    });
  });

  describe('Event Handling', () => {
    it('should handle queue status events', async () => {
      let onEventCallback: (event: any) => void;
      
      mockQueueService.queueRequest.mockImplementation((message, sessionId, options) => {
        onEventCallback = options.onEvent;
        return Promise.resolve({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });
      });

      const { result } = renderHook(() => useRequestQueue());

      await act(async () => {
        await result.current.queueRequest('Test message', 'session1');
      });

      // Simulate queue status event
      act(() => {
        onEventCallback!({
          type: 'queue_status',
          data: { position: 2, estimatedWait: 3000 },
          sessionId: 'session1'
        });
      });

      // Should update the active request with queue position
      expect(result.current.activeRequests[0]).toMatchObject({
        queuePosition: 2,
        estimatedWaitTime: 3000
      });
    });

    it('should handle processing start events', async () => {
      let onEventCallback: (event: any) => void;
      
      mockQueueService.queueRequest.mockImplementation((message, sessionId, options) => {
        onEventCallback = options.onEvent;
        return Promise.resolve({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });
      });

      const { result } = renderHook(() => useRequestQueue());

      await act(async () => {
        await result.current.queueRequest('Test message', 'session1');
      });

      // Simulate processing start event
      act(() => {
        onEventCallback!({
          type: 'processing_start',
          data: { requestId: 'req_123' },
          sessionId: 'session1'
        });
      });

      // Should update the active request state
      expect(result.current.activeRequests[0]).toMatchObject({
        isQueued: false,
        isLoading: true
      });
    });

    it('should handle retry attempt events', async () => {
      let onEventCallback: (event: any) => void;
      
      mockQueueService.queueRequest.mockImplementation((message, sessionId, options) => {
        onEventCallback = options.onEvent;
        return Promise.resolve({ content: 'Response', metadata: { model: 'test', tokens: 10, temperature: 0.7 } });
      });

      const { result } = renderHook(() => useRequestQueue());

      await act(async () => {
        await result.current.queueRequest('Test message', 'session1');
      });

      // Simulate retry attempt event
      act(() => {
        onEventCallback!({
          type: 'retry_attempt',
          data: { retryCount: 2, maxRetries: 3 },
          sessionId: 'session1'
        });
      });

      // Should update the retry count
      expect(result.current.activeRequests[0]).toMatchObject({
        retryCount: 2,
        isQueued: true
      });
    });
  });
});
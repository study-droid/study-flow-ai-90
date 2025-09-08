/**
 * Request Queue Hook
 * Provides interface for interacting with the request queue system
 */

import { useEffect, useState, useCallback } from 'react';
import { requestQueueService, type QueueStatus } from '../services/request-queue.service';
import { logger } from '@/services/logging/logger';

export interface UseRequestQueueOptions {
  priority?: number;
  maxRetries?: number;
  onStatusChange?: (status: QueueStatus) => void;
}

export interface QueuedRequestResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isQueued: boolean;
  queuePosition: number;
  estimatedWaitTime: number;
  retryCount: number;
}

export const useRequestQueue = (options: UseRequestQueueOptions = {}) => {
  const [status, setStatus] = useState<QueueStatus | null>(null);
  const [activeRequests, setActiveRequests] = useState<Map<string, any>>(new Map());

  const {
    priority = 0,
    maxRetries = 3,
    onStatusChange
  } = options;

  useEffect(() => {
    // Subscribe to queue status changes
    const unsubscribe = requestQueueService.onStatusChange((newStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    });

    // Get initial status
    setStatus(requestQueueService.getStatus());

    return unsubscribe;
  }, [onStatusChange]);

  /**
   * Queue a request for processing
   */
  const queueRequest = useCallback(async <T>(
    message: string,
    sessionId: string,
    requestOptions: any = {},
    requestPriority: number = priority
  ): Promise<T> => {
    const requestId = `${sessionId}_${Date.now()}`;
    
    try {
      logger.info('Queueing AI request', 'useRequestQueue', {
        requestId,
        sessionId,
        priority: requestPriority,
        messageLength: message.length
      });

      // Track request state
      setActiveRequests(prev => new Map(prev.set(requestId, {
        id: requestId,
        sessionId,
        isLoading: true,
        isQueued: true,
        queuePosition: 0,
        estimatedWaitTime: 0,
        retryCount: 0,
        error: null,
        data: null
      })));

      // Enhanced onEvent handler to track request progress
      const enhancedOptions = {
        ...requestOptions,
        onEvent: (event: any) => {
          // Update request state based on events
          setActiveRequests(prev => {
            const current = prev.get(requestId);
            if (!current) return prev;

            const updated = new Map(prev);
            
            switch (event.type) {
              case 'queue_status':
                updated.set(requestId, {
                  ...current,
                  queuePosition: event.data.position || 0,
                  estimatedWaitTime: event.data.estimatedWait || 0
                });
                break;
                
              case 'processing_start':
                updated.set(requestId, {
                  ...current,
                  isQueued: false,
                  isLoading: true
                });
                break;
                
              case 'retry_attempt':
                updated.set(requestId, {
                  ...current,
                  retryCount: event.data.retryCount || 0,
                  isQueued: true
                });
                break;
            }
            
            return updated;
          });

          // Forward event to original handler
          requestOptions.onEvent?.(event);
        }
      };

      // Queue the request
      const result = await requestQueueService.queueRequest<T>(
        message,
        sessionId,
        enhancedOptions,
        requestPriority,
        maxRetries
      );

      // Update final state
      setActiveRequests(prev => {
        const updated = new Map(prev);
        updated.set(requestId, {
          ...prev.get(requestId),
          isLoading: false,
          isQueued: false,
          data: result,
          error: null
        });
        return updated;
      });

      logger.info('AI request completed successfully', 'useRequestQueue', {
        requestId,
        sessionId
      });

      return result;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      logger.error('AI request failed', 'useRequestQueue', {
        requestId,
        sessionId,
        error: errorObj.message
      });

      // Update error state
      setActiveRequests(prev => {
        const updated = new Map(prev);
        updated.set(requestId, {
          ...prev.get(requestId),
          isLoading: false,
          isQueued: false,
          error: errorObj,
          data: null
        });
        return updated;
      });

      throw errorObj;
    } finally {
      // Clean up request state after a delay
      setTimeout(() => {
        setActiveRequests(prev => {
          const updated = new Map(prev);
          updated.delete(requestId);
          return updated;
        });
      }, 5000);
    }
  }, [priority, maxRetries]);

  /**
   * Get status for a specific request
   */
  const getRequestStatus = useCallback((requestId: string) => {
    return activeRequests.get(requestId) || null;
  }, [activeRequests]);

  /**
   * Clear the entire queue
   */
  const clearQueue = useCallback(() => {
    requestQueueService.clearQueue();
    setActiveRequests(new Map());
    
    logger.info('Request queue cleared by user', 'useRequestQueue');
  }, []);

  /**
   * Pause/resume queue processing
   */
  const pauseQueue = useCallback(() => {
    requestQueueService.pauseProcessing();
    logger.info('Request queue paused by user', 'useRequestQueue');
  }, []);

  const resumeQueue = useCallback(() => {
    requestQueueService.resumeProcessing();
    logger.info('Request queue resumed by user', 'useRequestQueue');
  }, []);

  /**
   * Get queue statistics
   */
  const getQueueStats = useCallback(() => {
    if (!status) return null;

    return {
      totalQueued: status.queueLength,
      processing: status.processingCount,
      rateLimited: status.rateLimitActive,
      requestsPerMinute: status.requestsInLastMinute,
      averageWaitTime: status.estimatedWaitTime,
      nextAvailable: new Date(status.nextAvailableSlot)
    };
  }, [status]);

  return {
    // Queue operations
    queueRequest,
    clearQueue,
    pauseQueue,
    resumeQueue,
    
    // Status and monitoring
    status,
    getRequestStatus,
    getQueueStats,
    activeRequests: Array.from(activeRequests.values()),
    
    // Computed states
    isQueueActive: status ? status.queueLength > 0 || status.processingCount > 0 : false,
    isRateLimited: status?.rateLimitActive || false,
    estimatedWaitTime: status?.estimatedWaitTime || 0
  };
};

export default useRequestQueue;
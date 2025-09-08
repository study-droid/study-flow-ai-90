/**
 * Request Queue Service for AI Tutor
 * Handles request queuing, rate limiting, and intelligent retry logic
 */

import { logger } from '@/services/logging/logger';

export interface QueuedRequest {
  id: string;
  message: string;
  sessionId: string;
  options: any;
  priority: number;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  onEvent?: (event: any) => void;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxConcurrentRequests: number;
  burstLimit: number;
  cooldownPeriod: number; // ms
}

export interface QueueStatus {
  queueLength: number;
  processingCount: number;
  rateLimitActive: boolean;
  estimatedWaitTime: number; // ms
  requestsInLastMinute: number;
  nextAvailableSlot: number; // timestamp
}

export interface RetryConfig {
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
  jitter: boolean;
}

export class RequestQueueService {
  private queue: QueuedRequest[] = [];
  private processing: Map<string, QueuedRequest> = new Map();
  private requestHistory: number[] = []; // timestamps of recent requests
  private isProcessing = false;
  private rateLimitConfig: RateLimitConfig;
  private retryConfig: RetryConfig;
  private statusCallbacks: Set<(status: QueueStatus) => void> = new Set();

  constructor(
    rateLimitConfig: Partial<RateLimitConfig> = {},
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.rateLimitConfig = {
      maxRequestsPerMinute: 30,
      maxConcurrentRequests: 3,
      burstLimit: 5,
      cooldownPeriod: 2000,
      ...rateLimitConfig
    };

    this.retryConfig = {
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      jitter: true,
      ...retryConfig
    };

    // Start processing queue
    this.startProcessing();
    
    // Clean up old request history every minute
    setInterval(() => this.cleanupRequestHistory(), 60000);
  }

  /**
   * Add a request to the queue
   */
  async queueRequest<T>(
    message: string,
    sessionId: string,
    options: any = {},
    priority: number = 0,
    maxRetries: number = 3
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: this.generateRequestId(),
        message,
        sessionId,
        options,
        priority,
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries,
        onEvent: options.onEvent,
        resolve,
        reject
      };

      // Insert request in priority order (higher priority first)
      const insertIndex = this.queue.findIndex(r => r.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      logger.info('Request queued', 'RequestQueueService', {
        requestId: request.id,
        queueLength: this.queue.length,
        priority,
        sessionId
      });

      // Notify status change
      this.notifyStatusChange();

      // Emit queue status to user
      if (request.onEvent) {
        request.onEvent({
          type: 'queue_status',
          data: {
            position: this.getRequestPosition(request.id),
            estimatedWait: this.getEstimatedWaitTime()
          },
          sessionId
        });
      }
    });
  }

  /**
   * Get current queue status
   */
  getStatus(): QueueStatus {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(
      timestamp => now - timestamp < 60000
    );

    return {
      queueLength: this.queue.length,
      processingCount: this.processing.size,
      rateLimitActive: this.isRateLimited(),
      estimatedWaitTime: this.getEstimatedWaitTime(),
      requestsInLastMinute: recentRequests.length,
      nextAvailableSlot: this.getNextAvailableSlot()
    };
  }

  /**
   * Subscribe to status changes
   */
  onStatusChange(callback: (status: QueueStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Clear the queue (emergency stop)
   */
  clearQueue(): void {
    const clearedRequests = [...this.queue];
    this.queue = [];
    
    // Reject all cleared requests
    clearedRequests.forEach(request => {
      request.reject(new Error('Queue cleared by user'));
    });

    logger.info('Queue cleared', 'RequestQueueService', {
      clearedCount: clearedRequests.length
    });

    this.notifyStatusChange();
  }

  /**
   * Pause/resume queue processing
   */
  pauseProcessing(): void {
    this.isProcessing = false;
    logger.info('Queue processing paused', 'RequestQueueService');
  }

  resumeProcessing(): void {
    this.isProcessing = true;
    this.processQueue();
    logger.info('Queue processing resumed', 'RequestQueueService');
  }

  private async startProcessing(): Promise<void> {
    this.isProcessing = true;
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (!this.isProcessing) return;

    try {
      // Check if we can process more requests
      if (this.processing.size >= this.rateLimitConfig.maxConcurrentRequests) {
        setTimeout(() => this.processQueue(), 100);
        return;
      }

      // Check rate limiting
      if (this.isRateLimited()) {
        const waitTime = this.getNextAvailableSlot() - Date.now();
        setTimeout(() => this.processQueue(), Math.max(waitTime, 100));
        return;
      }

      // Get next request from queue
      const request = this.queue.shift();
      if (!request) {
        setTimeout(() => this.processQueue(), 100);
        return;
      }

      // Start processing the request
      this.processing.set(request.id, request);
      this.notifyStatusChange();

      try {
        await this.processRequest(request);
      } catch (error) {
        await this.handleRequestError(request, error);
      }

      // Continue processing
      setTimeout(() => this.processQueue(), 10);
    } catch (error) {
      logger.error('Error in queue processing', 'RequestQueueService', {
        error: error instanceof Error ? error.message : String(error)
      });
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  private async processRequest(request: QueuedRequest): Promise<void> {
    const { aiTutorFallbackService } = await import('./ai-tutor-fallback.service');
    
    logger.info('Processing request', 'RequestQueueService', {
      requestId: request.id,
      retryCount: request.retryCount,
      sessionId: request.sessionId
    });

    // Record request timestamp for rate limiting
    this.requestHistory.push(Date.now());

    try {
      // Emit processing start event
      if (request.onEvent) {
        request.onEvent({
          type: 'processing_start',
          data: { requestId: request.id },
          sessionId: request.sessionId
        });
      }

      // Process the request using the fallback service
      const result = await aiTutorFallbackService.sendMessage(
        request.message,
        request.sessionId,
        request.options
      );

      // Request successful
      this.processing.delete(request.id);
      request.resolve(result);

      logger.info('Request processed successfully', 'RequestQueueService', {
        requestId: request.id,
        processingTime: Date.now() - request.timestamp
      });

    } catch (error) {
      throw error; // Let handleRequestError deal with it
    }
  }

  private async handleRequestError(request: QueuedRequest, error: any): Promise<void> {
    this.processing.delete(request.id);

    const shouldRetry = request.retryCount < request.maxRetries && this.isRetryableError(error);

    if (shouldRetry) {
      request.retryCount++;
      const delay = this.calculateRetryDelay(request.retryCount);

      logger.info('Retrying request', 'RequestQueueService', {
        requestId: request.id,
        retryCount: request.retryCount,
        delay,
        error: error instanceof Error ? error.message : String(error)
      });

      // Emit retry event
      if (request.onEvent) {
        request.onEvent({
          type: 'retry_attempt',
          data: {
            requestId: request.id,
            retryCount: request.retryCount,
            delay,
            maxRetries: request.maxRetries
          },
          sessionId: request.sessionId
        });
      }

      // Schedule retry
      setTimeout(() => {
        this.queue.unshift(request); // Add to front of queue for retry
        this.notifyStatusChange();
      }, delay);

    } else {
      // Max retries reached or non-retryable error
      logger.error('Request failed permanently', 'RequestQueueService', {
        requestId: request.id,
        retryCount: request.retryCount,
        error: error instanceof Error ? error.message : String(error)
      });

      request.reject(error);
    }
  }

  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message || String(error);
    const retryablePatterns = [
      /network/i,
      /timeout/i,
      /rate limit/i,
      /429/,
      /502/,
      /503/,
      /504/,
      /connection/i,
      /temporary/i
    ];

    return retryablePatterns.some(pattern => pattern.test(message));
  }

  private calculateRetryDelay(retryCount: number): number {
    let delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, retryCount - 1);
    delay = Math.min(delay, this.retryConfig.maxDelay);

    // Add jitter to prevent thundering herd
    if (this.retryConfig.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private isRateLimited(): boolean {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(
      timestamp => now - timestamp < 60000
    );

    // Check requests per minute limit
    if (recentRequests.length >= this.rateLimitConfig.maxRequestsPerMinute) {
      return true;
    }

    // Check burst limit (requests in last few seconds)
    const burstRequests = this.requestHistory.filter(
      timestamp => now - timestamp < 10000
    );
    if (burstRequests.length >= this.rateLimitConfig.burstLimit) {
      return true;
    }

    return false;
  }

  private getNextAvailableSlot(): number {
    const now = Date.now();
    const recentRequests = this.requestHistory.filter(
      timestamp => now - timestamp < 60000
    );

    if (recentRequests.length < this.rateLimitConfig.maxRequestsPerMinute) {
      return now;
    }

    // Find the oldest request that will expire
    const oldestRequest = Math.min(...recentRequests);
    return oldestRequest + 60000;
  }

  private getEstimatedWaitTime(): number {
    const queuePosition = this.queue.length;
    const processingCount = this.processing.size;
    const avgProcessingTime = 5000; // Estimate 5 seconds per request

    // Base wait time from queue position
    let waitTime = (queuePosition / this.rateLimitConfig.maxConcurrentRequests) * avgProcessingTime;

    // Add rate limit delay if applicable
    if (this.isRateLimited()) {
      const rateLimitDelay = this.getNextAvailableSlot() - Date.now();
      waitTime += rateLimitDelay;
    }

    return Math.max(waitTime, 0);
  }

  private getRequestPosition(requestId: string): number {
    return this.queue.findIndex(r => r.id === requestId) + 1;
  }

  private cleanupRequestHistory(): void {
    const now = Date.now();
    this.requestHistory = this.requestHistory.filter(
      timestamp => now - timestamp < 60000
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        logger.error('Error in status callback', 'RequestQueueService', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }
}

// Singleton instance
export const requestQueueService = new RequestQueueService();
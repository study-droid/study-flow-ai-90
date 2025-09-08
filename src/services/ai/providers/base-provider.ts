/**
 * Base AI Provider Interface
 * Common interface for all AI providers
 */

import type { 
  AIMessage, 
  AIModelConfig, 
  AIStreamChunk,
  TokenUsage 
} from '../../../types/ai-tutor';

export interface BaseAIRequest {
  messages: AIMessage[];
  modelConfig: AIModelConfig;
  requestId: string;
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export interface BaseAIResponse {
  id: string;
  content: string;
  usage?: TokenUsage;
  model: string;
  processingTime: number;
  requestId: string;
  metadata?: Record<string, any>;
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalTokensUsed: number;
  lastResetTime: Date;
}

export abstract class BaseAIProvider {
  protected providerId: string;
  protected metrics: ProviderMetrics;

  constructor(providerId: string) {
    this.providerId = providerId;
    this.resetMetrics();
  }

  /**
   * Send a completion request to the AI provider
   */
  abstract complete(request: BaseAIRequest): Promise<BaseAIResponse>;

  /**
   * Send a streaming request to the AI provider
   */
  abstract stream(request: BaseAIRequest): AsyncGenerator<AIStreamChunk, void, unknown>;

  /**
   * Check if the provider is available and healthy
   */
  abstract healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }>;

  /**
   * Get provider-specific configuration
   */
  abstract getConfig(): Record<string, any>;

  /**
   * Update provider configuration
   */
  abstract updateConfig(config: Record<string, any>): void;

  /**
   * Get provider metrics
   */
  getMetrics(): ProviderMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset provider metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalTokensUsed: 0,
      lastResetTime: new Date()
    };
  }

  /**
   * Update metrics after a request
   */
  protected updateMetrics(success: boolean, latency: number, tokensUsed?: number): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
      this.metrics.averageLatency = this.calculateAverageLatency(latency);
      
      if (tokensUsed) {
        this.metrics.totalTokensUsed += tokensUsed;
      }
    } else {
      this.metrics.failedRequests++;
    }
  }

  /**
   * Calculate running average latency
   */
  private calculateAverageLatency(newLatency: number): number {
    const totalSuccessful = this.metrics.successfulRequests;
    if (totalSuccessful === 1) {
      return newLatency;
    }
    
    const currentAverage = this.metrics.averageLatency;
    return ((currentAverage * (totalSuccessful - 1)) + newLatency) / totalSuccessful;
  }

  /**
   * Get provider ID
   */
  getProviderId(): string {
    return this.providerId;
  }

  /**
   * Create error response
   */
  protected createErrorResponse(error: string, requestId: string): BaseAIResponse {
    return {
      id: `error_${Date.now()}`,
      content: `I apologize, but I encountered an error: ${error}. Please try again.`,
      processingTime: 0,
      requestId,
      model: 'error',
      metadata: {
        error: true,
        errorMessage: error
      }
    };
  }

  /**
   * Validate request before processing
   */
  protected validateRequest(request: BaseAIRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request must contain at least one message');
    }

    if (!request.requestId) {
      throw new Error('Request must have a requestId');
    }

    if (!request.modelConfig) {
      throw new Error('Request must have modelConfig');
    }
  }

  /**
   * Get model name for the provider
   */
  protected abstract getModelName(modelType: string): string;

  /**
   * Get authentication headers
   */
  protected abstract getAuthHeaders(): Record<string, string>;

  /**
   * Handle provider-specific errors
   */
  protected handleProviderError(error: any): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    return new Error('Unknown provider error occurred');
  }
}
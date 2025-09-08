/**
 * DeepSeek AI Provider Implementation
 * Integrates with the existing UnifiedDeepSeekHandler
 */

import { BaseAIProvider, type BaseAIRequest, type BaseAIResponse } from './base-provider';
import { UnifiedDeepSeekHandler, type DeepSeekRequest, type DeepSeekResponse } from '../../../lib/unified-deepseek-handler';
import type { AIStreamChunk } from '../../../types/ai-tutor';

export class DeepSeekProvider extends BaseAIProvider {
  private handler: UnifiedDeepSeekHandler;

  constructor() {
    super('deepseek');
    this.handler = new UnifiedDeepSeekHandler({
      enableRateLimit: true,
      enableCircuitBreaker: true,
      enableCaching: true,
      enableMarkdownProcessing: true,
      enableValidation: true
    });
  }

  async complete(request: BaseAIRequest): Promise<BaseAIResponse> {
    const startTime = performance.now();
    
    try {
      this.validateRequest(request);

      const deepSeekRequest: DeepSeekRequest = {
        messages: request.messages,
        modelConfig: request.modelConfig,
        requestId: request.requestId,
        stream: false,
        abortSignal: request.abortSignal
      };

      const response = await this.handler.complete(deepSeekRequest);
      const processingTime = performance.now() - startTime;

      // Update metrics
      this.updateMetrics(true, processingTime, response.usage?.totalTokens);

      return this.convertDeepSeekResponse(response, processingTime);

    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.updateMetrics(false, processingTime);
      
      const handledError = this.handleProviderError(error);
      return this.createErrorResponse(handledError.message, request.requestId);
    }
  }

  async *stream(request: BaseAIRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    try {
      this.validateRequest(request);

      const deepSeekRequest: DeepSeekRequest = {
        messages: request.messages,
        modelConfig: request.modelConfig,
        requestId: request.requestId,
        stream: true,
        abortSignal: request.abortSignal
      };

      const startTime = performance.now();
      let totalTokens = 0;

      for await (const chunk of this.handler.stream(deepSeekRequest)) {
        if (chunk.type === 'done' && chunk.usage) {
          totalTokens = chunk.usage.totalTokens;
          const processingTime = performance.now() - startTime;
          this.updateMetrics(true, processingTime, totalTokens);
        }
        
        yield chunk;
      }

    } catch (error) {
      this.updateMetrics(false, 0);
      const handledError = this.handleProviderError(error);
      yield { 
        type: 'error', 
        error: handledError.message 
      };
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    try {
      const healthResult = await this.handler.healthCheck();
      
      return {
        status: healthResult.status,
        details: {
          ...healthResult.details,
          providerId: this.providerId,
          metrics: this.getMetrics()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          providerId: this.providerId,
          error: error instanceof Error ? error.message : 'Unknown error',
          metrics: this.getMetrics()
        }
      };
    }
  }

  getConfig(): Record<string, any> {
    return this.handler.getConfig();
  }

  updateConfig(config: Record<string, any>): void {
    this.handler.updateConfig(config);
  }

  /**
   * Convert DeepSeek response to base response format
   */
  private convertDeepSeekResponse(response: DeepSeekResponse, processingTime: number): BaseAIResponse {
    return {
      id: response.id,
      content: response.content,
      usage: response.usage,
      model: response.model,
      processingTime,
      requestId: response.requestId,
      metadata: {
        cached: response.cached,
        markdownProcessed: response.markdownProcessed,
        validatedStructure: response.validatedStructure,
        validationResult: response.validationResult,
        processedContent: response.processedContent
      }
    };
  }

  protected getModelName(modelType: string): string {
    const modelMapping = {
      'chat': 'deepseek-chat',
      'reasoning': 'deepseek-reasoner',
      'code': 'deepseek-coder',
      'creative': 'deepseek-chat'
    };

    return modelMapping[modelType] || 'deepseek-chat';
  }

  protected getAuthHeaders(): Record<string, string> {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Get DeepSeek-specific metrics
   */
  getDeepSeekMetrics() {
    return this.handler.getMetrics();
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return this.handler.getCircuitBreakerStatus();
  }

  /**
   * Get rate limit status
   */
  async getRateLimitStatus(requestId: string) {
    return this.handler.getRateLimitStatus(requestId);
  }

  /**
   * Reset DeepSeek handler metrics
   */
  resetDeepSeekMetrics(): void {
    this.handler.resetMetrics();
    this.resetMetrics();
  }
}
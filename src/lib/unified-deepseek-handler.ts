/**
 * Unified DeepSeek Handler
 * Production-ready DeepSeek API handler with comprehensive resilience patterns
 */

import { rateLimiter, isRateLimited } from './rateLimiter';
import { retry, RetryConfigs } from './retry';
import { CircuitBreaker } from '../services/reliability/circuit-breaker';
import { globalAICache } from './simple-cache';
import { tryParseJSON } from './markdown';
import type { 
  AIMessage, 
  AIModelConfig, 
  TokenUsage,
  AIStreamChunk
} from '../types/ai-tutor';

export interface DeepSeekConfig {
  apiKey?: string;
  baseURL?: string;
  timeout?: number;
  maxRetries?: number;
  enableRateLimit?: boolean;
  enableCircuitBreaker?: boolean;
  enableCaching?: boolean;
  defaultModel?: string;
}

export interface DeepSeekRequest {
  messages: AIMessage[];
  modelConfig: AIModelConfig;
  requestId: string;
  priority?: 'low' | 'normal' | 'high';
  cacheKey?: string;
  stream?: boolean;
  abortSignal?: AbortSignal;
}

export interface DeepSeekResponse {
  id: string;
  content: string;
  usage?: TokenUsage;
  model: string;
  cached: boolean;
  processingTime: number;
  requestId: string;
}

export interface DeepSeekStreamResponse {
  chunks: AsyncGenerator<AIStreamChunk, void, unknown>;
  requestId: string;
}

export interface DeepSeekMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  averageLatency: number;
  totalTokensUsed: number;
  circuitBreakerTrips: number;
  rateLimitHits: number;
  lastResetTime: Date;
}

class DeepSeekCircuitBreaker extends CircuitBreaker {
  constructor() {
    super(5, 30000); // 5 failures, 30 second reset
  }
}

export class UnifiedDeepSeekHandler {
  private config: Required<DeepSeekConfig>;
  private circuitBreaker: DeepSeekCircuitBreaker;
  private metrics: DeepSeekMetrics;

  constructor(config: DeepSeekConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '',
      baseURL: config.baseURL || 'https://api.deepseek.com',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      enableRateLimit: config.enableRateLimit ?? true,
      enableCircuitBreaker: config.enableCircuitBreaker ?? true,
      enableCaching: config.enableCaching ?? true,
      defaultModel: config.defaultModel || 'deepseek-chat'
    };

    this.circuitBreaker = new DeepSeekCircuitBreaker();
    this.resetMetrics();
  }

  async complete(request: DeepSeekRequest): Promise<DeepSeekResponse> {
    const startTime = performance.now();
    this.metrics.totalRequests++;

    try {
      // 1. Check circuit breaker
      if (this.config.enableCircuitBreaker && !this.circuitBreaker.canProceed()) {
        this.metrics.circuitBreakerTrips++;
        throw new Error('DeepSeek service unavailable - circuit breaker open');
      }

      // 2. Rate limiting
      if (this.config.enableRateLimit) {
        const rateLimitKey = this.getRateLimitKey(request);
        const priority = request.priority || 'normal';
        
        const rateLimitResult = await isRateLimited(rateLimitKey, 'deepseek-api');
        if (!rateLimitResult.allowed) {
          this.metrics.rateLimitHits++;
          throw new Error(`Rate limit exceeded - please try again after ${rateLimitResult.result.retryAfter || 60}s`);
        }
      }

      // 3. Cache check
      if (this.config.enableCaching && request.cacheKey) {
        const cachedResult = globalAICache.get(request.cacheKey);
        if (cachedResult.hit && cachedResult.value) {
          this.metrics.cachedRequests++;
          const processingTime = performance.now() - startTime;
          
          return {
            id: `cached_${Date.now()}`,
            content: cachedResult.value.formattedResponse.content,
            cached: true,
            processingTime,
            requestId: request.requestId,
            model: this.getModelName(request.modelConfig.model)
          };
        }
      }

      // 4. Make API request with retry logic
      const response = await this.makeAPIRequest(request);
      
      // 5. Process and validate response
      const processedResponse = await this.processResponse(response, request, startTime);
      
      // 6. Update metrics and circuit breaker
      this.metrics.successfulRequests++;
      this.metrics.averageLatency = this.updateAverageLatency(processedResponse.processingTime);
      if (processedResponse.usage) {
        this.metrics.totalTokensUsed += processedResponse.usage.totalTokens;
      }
      
      if (this.config.enableCircuitBreaker) {
        this.circuitBreaker.recordSuccess();
      }

      return processedResponse;

    } catch (error) {
      this.metrics.failedRequests++;
      
      if (this.config.enableCircuitBreaker) {
        this.circuitBreaker.recordFailure();
      }

      const processingTime = performance.now() - startTime;
      
      // Return error response with fallback content
      return {
        id: `error_${Date.now()}`,
        content: this.createErrorResponse(error.message),
        cached: false,
        processingTime,
        requestId: request.requestId,
        model: this.getModelName(request.modelConfig.model)
      };
    }
  }

  async *stream(request: DeepSeekRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    this.metrics.totalRequests++;

    try {
      // Similar resilience checks as complete()
      if (this.config.enableCircuitBreaker && !this.circuitBreaker.canProceed()) {
        this.metrics.circuitBreakerTrips++;
        yield { type: 'error', error: 'DeepSeek service unavailable - circuit breaker open' };
        return;
      }

      if (this.config.enableRateLimit) {
        const rateLimitKey = this.getRateLimitKey(request);
        const priority = request.priority || 'normal';
        
        const rateLimitResult = await isRateLimited(rateLimitKey, 'deepseek-streaming');
        if (!rateLimitResult.allowed) {
          this.metrics.rateLimitHits++;
          yield { type: 'error', error: `Rate limit exceeded - please try again after ${rateLimitResult.result.retryAfter || 60}s` };
          return;
        }
      }

      // Stream from API
      yield* this.streamFromAPI(request);
      
      this.metrics.successfulRequests++;
      if (this.config.enableCircuitBreaker) {
        this.circuitBreaker.recordSuccess();
      }

    } catch (error) {
      this.metrics.failedRequests++;
      
      if (this.config.enableCircuitBreaker) {
        this.circuitBreaker.recordFailure();
      }

      yield { 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown streaming error' 
      };
    }
  }

  private async makeAPIRequest(request: DeepSeekRequest): Promise<any> {
    const apiRequest = {
      model: this.getModelName(request.modelConfig.model),
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.modelConfig.temperature,
      max_tokens: request.modelConfig.maxTokens,
      top_p: request.modelConfig.topP,
      stream: false,
      ...(request.modelConfig.jsonMode && {
        response_format: { type: 'json_object' }
      })
    };

    return retry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
          const response = await fetch(`${this.config.baseURL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.config.apiKey}`
            },
            body: JSON.stringify(apiRequest),
            signal: request.abortSignal || controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          
          if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid response format from DeepSeek API');
          }

          return data;

        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      },
      RetryConfigs.NETWORK_AGGRESSIVE.maxAttempts,
      RetryConfigs.NETWORK_AGGRESSIVE.baseDelay
    );
  }

  private async *streamFromAPI(request: DeepSeekRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
    const apiRequest = {
      model: this.getModelName(request.modelConfig.model),
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      temperature: request.modelConfig.temperature,
      max_tokens: request.modelConfig.maxTokens,
      top_p: request.modelConfig.topP,
      stream: true,
      ...(request.modelConfig.jsonMode && {
        response_format: { type: 'json_object' }
      })
    };

    const response = await fetch(`${this.config.baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(apiRequest),
      signal: request.abortSignal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error ${response.status}: ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body available for streaming');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                yield { type: 'content', content: delta.content };
              }

              if (parsed.usage) {
                yield { 
                  type: 'done', 
                  usage: {
                    promptTokens: parsed.usage.prompt_tokens,
                    completionTokens: parsed.usage.completion_tokens,
                    totalTokens: parsed.usage.total_tokens
                  }
                };
              }
            } catch (parseError) {
              // Skip malformed JSON chunks
              continue;
            }
          }
        }
      }

      yield { type: 'done' };
    } finally {
      reader.releaseLock();
    }
  }

  private async processResponse(apiResponse: any, request: DeepSeekRequest, startTime: number): Promise<DeepSeekResponse> {
    const processingTime = performance.now() - startTime;
    
    // Extract content and usage
    const content = apiResponse.choices[0].message.content;
    const usage = apiResponse.usage ? {
      promptTokens: apiResponse.usage.prompt_tokens,
      completionTokens: apiResponse.usage.completion_tokens,
      totalTokens: apiResponse.usage.total_tokens
    } : undefined;

    // Validate JSON if JSON mode was requested
    if (request.modelConfig.jsonMode) {
      const parsedJSON = tryParseJSON(content);
      if (!parsedJSON) {
        throw new Error('Invalid JSON response received when JSON mode was requested');
      }
    }

    return {
      id: apiResponse.id || `response_${Date.now()}`,
      content,
      usage,
      model: apiResponse.model || this.getModelName(request.modelConfig.model),
      cached: false,
      processingTime,
      requestId: request.requestId
    };
  }

  private getModelName(modelType: string): string {
    const modelMapping = {
      'chat': 'deepseek-chat',
      'reasoning': 'deepseek-reasoner',
      'code': 'deepseek-coder',
      'creative': 'deepseek-chat'
    };

    return modelMapping[modelType] || this.config.defaultModel;
  }

  private getRateLimitKey(request: DeepSeekRequest): string {
    // Create rate limit key based on request characteristics
    return `deepseek_${request.requestId.split('_')[0]}_${request.modelConfig.model}`;
  }

  private createErrorResponse(errorMessage: string): string {
    return `I apologize, but I encountered an error while processing your request: ${errorMessage}. Please try again or rephrase your question.`;
  }

  private updateAverageLatency(newLatency: number): number {
    const totalRequests = this.metrics.successfulRequests;
    if (totalRequests === 1) {
      return newLatency;
    }
    
    const currentAverage = this.metrics.averageLatency;
    return ((currentAverage * (totalRequests - 1)) + newLatency) / totalRequests;
  }

  // Public management methods
  getMetrics(): DeepSeekMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cachedRequests: 0,
      averageLatency: 0,
      totalTokensUsed: 0,
      circuitBreakerTrips: 0,
      rateLimitHits: 0,
      lastResetTime: new Date()
    };
  }

  getCircuitBreakerStatus(): { state: string; failureCount: number; lastFailureTime: number } {
    return this.circuitBreaker.getState();
  }

  async getRateLimitStatus(requestId: string): Promise<{ tokens: number; capacity: number; priority: string } | null> {
    try {
      const stats = await rateLimiter.getStats();
      return {
        tokens: Math.max(0, 1000 - stats.totalRequests),
        capacity: 1000,
        priority: 'normal'
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return null;
    }
  }

  updateConfig(newConfig: Partial<DeepSeekConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): DeepSeekConfig {
    return { ...this.config };
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: any;
  }> {
    const circuitBreakerStatus = this.getCircuitBreakerStatus();
    const metrics = this.getMetrics();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    const details: any = {
      apiKey: !!this.config.apiKey,
      baseURL: this.config.baseURL,
      circuitBreaker: circuitBreakerStatus,
      metrics,
      lastCheck: new Date()
    };

    // Determine health status
    if (circuitBreakerStatus.state === 'open') {
      status = 'unhealthy';
      details.reason = 'Circuit breaker is open';
    } else if (metrics.totalRequests > 0) {
      const successRate = metrics.successfulRequests / metrics.totalRequests;
      if (successRate < 0.5) {
        status = 'unhealthy';
        details.reason = `Low success rate: ${Math.round(successRate * 100)}%`;
      } else if (successRate < 0.8) {
        status = 'degraded';
        details.reason = `Reduced success rate: ${Math.round(successRate * 100)}%`;
      }
    }

    // Check API connectivity (simple ping)
    try {
      const testResponse = await fetch(`${this.config.baseURL}/v1/models`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` },
        signal: AbortSignal.timeout(5000)
      });
      
      details.apiConnectivity = testResponse.ok;
      if (!testResponse.ok && status === 'healthy') {
        status = 'degraded';
        details.reason = 'API connectivity issues';
      }
    } catch (error) {
      details.apiConnectivity = false;
      if (status === 'healthy') {
        status = 'degraded';
        details.reason = 'Cannot reach API endpoint';
      }
    }

    return { status, details };
  }
}

// Singleton instance
export const deepSeekHandler = new UnifiedDeepSeekHandler();
export const unifiedDeepSeekHandler = deepSeekHandler;

// Convenience functions
export async function callDeepSeek(request: DeepSeekRequest): Promise<DeepSeekResponse> {
  return deepSeekHandler.complete(request);
}

export function streamDeepSeek(request: DeepSeekRequest): AsyncGenerator<AIStreamChunk, void, unknown> {
  return deepSeekHandler.stream(request);
}

export function getDeepSeekMetrics(): DeepSeekMetrics {
  return deepSeekHandler.getMetrics();
}

export async function performDeepSeekHealthCheck() {
  return deepSeekHandler.healthCheck();
}

export default deepSeekHandler;
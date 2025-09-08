/**
 * Edge Function AI Provider Implementation
 * Handles requests to Supabase Edge Functions for AI services
 */

import { BaseAIProvider, type BaseAIRequest, type BaseAIResponse } from './base-provider';
import { supabase } from '../../../integrations/supabase/client';
import type { AIStreamChunk } from '../../../types/ai-tutor';

export interface EdgeFunctionConfig {
  functionName: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class EdgeFunctionProvider extends BaseAIProvider {
  private config: EdgeFunctionConfig;

  constructor(config: EdgeFunctionConfig) {
    super(`edge-function-${config.functionName}`);
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...config
    };
  }

  async complete(request: BaseAIRequest): Promise<BaseAIResponse> {
    const startTime = performance.now();
    
    try {
      this.validateRequest(request);

      const response = await this.callEdgeFunction(request, false);
      const processingTime = performance.now() - startTime;

      // Update metrics
      this.updateMetrics(true, processingTime, response.usage?.totalTokens);

      return {
        id: response.id || `edge_${Date.now()}`,
        content: response.content || response.message || '',
        usage: response.usage,
        model: response.model || 'edge-function',
        processingTime,
        requestId: request.requestId,
        metadata: {
          functionName: this.config.functionName,
          ...response.metadata
        }
      };

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

      const startTime = performance.now();
      let totalTokens = 0;

      // Edge functions don't support streaming yet, so we'll simulate it
      const response = await this.callEdgeFunction(request, true);
      
      if (response.content) {
        // Simulate streaming by chunking the response
        const words = response.content.split(' ');
        
        for (let i = 0; i < words.length; i++) {
          const chunk = words.slice(0, i + 1).join(' ');
          yield {
            type: 'content',
            content: i === 0 ? words[i] : ' ' + words[i]
          };
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      if (response.usage) {
        totalTokens = response.usage.totalTokens;
        yield {
          type: 'done',
          usage: response.usage
        };
      } else {
        yield { type: 'done' };
      }

      const processingTime = performance.now() - startTime;
      this.updateMetrics(true, processingTime, totalTokens);

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
      // Simple health check by calling the function with a minimal request
      const testRequest: BaseAIRequest = {
        messages: [{ role: 'user', content: 'health check' }],
        modelConfig: {
          model: 'chat',
          temperature: 0.1,
          maxTokens: 10
        },
        requestId: `health_check_${Date.now()}`
      };

      const startTime = performance.now();
      await this.callEdgeFunction(testRequest, false);
      const responseTime = performance.now() - startTime;

      return {
        status: responseTime < 5000 ? 'healthy' : 'degraded',
        details: {
          providerId: this.providerId,
          functionName: this.config.functionName,
          responseTime,
          metrics: this.getMetrics(),
          lastCheck: new Date()
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          providerId: this.providerId,
          functionName: this.config.functionName,
          error: error instanceof Error ? error.message : 'Unknown error',
          metrics: this.getMetrics(),
          lastCheck: new Date()
        }
      };
    }
  }

  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  updateConfig(config: Record<string, any>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Call the Supabase Edge Function
   */
  private async callEdgeFunction(request: BaseAIRequest, streaming: boolean): Promise<any> {
    const payload = {
      messages: request.messages,
      model: this.getModelName(request.modelConfig.model),
      temperature: request.modelConfig.temperature,
      max_tokens: request.modelConfig.maxTokens,
      top_p: request.modelConfig.topP,
      stream: streaming,
      request_id: request.requestId
    };

    const { data, error } = await supabase.functions.invoke(this.config.functionName, {
      body: payload,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (error) {
      throw new Error(`Edge function error: ${error.message}`);
    }

    if (!data) {
      throw new Error('No response data from edge function');
    }

    if (data.error) {
      throw new Error(`Edge function returned error: ${data.error}`);
    }

    return data;
  }

  protected getModelName(modelType: string): string {
    // Edge functions handle model selection internally
    return modelType;
  }

  protected getAuthHeaders(): Record<string, string> {
    // Supabase client handles authentication automatically
    return {};
  }

  /**
   * Set function timeout
   */
  setTimeout(timeout: number): void {
    this.config.timeout = timeout;
  }

  /**
   * Set retry configuration
   */
  setRetryConfig(attempts: number, delay: number): void {
    this.config.retryAttempts = attempts;
    this.config.retryDelay = delay;
  }

  /**
   * Get function name
   */
  getFunctionName(): string {
    return this.config.functionName;
  }
}
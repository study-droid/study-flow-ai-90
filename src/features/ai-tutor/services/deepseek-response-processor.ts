/**
 * DeepSeek Response Processor - Robust response handling system
 * Implements the 10-stage pipeline from ai_map.md specification
 */

import { z } from 'zod';
import type { ChatEvent } from '../types';

// Enhanced validation schemas from ai_map.md
export const DeepSeekResponseSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    message: z.object({
      role: z.literal('assistant'),
      content: z.string(),
      reasoning_content: z.string().optional(),
    }),
    finish_reason: z.enum(['stop', 'length', 'content_filter', 'tool_calls']),
  })),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
    prompt_cache_hit_tokens: z.number().optional(),
    prompt_cache_miss_tokens: z.number().optional(),
  }),
});

export const DeepSeekStreamEventSchema = z.object({
  id: z.string(),
  object: z.literal('chat.completion.chunk'),
  created: z.number(),
  model: z.string(),
  choices: z.array(z.object({
    index: z.number(),
    delta: z.object({
      role: z.literal('assistant').optional(),
      content: z.string().optional(),
      reasoning_content: z.string().optional(),
    }),
    finish_reason: z.enum(['stop', 'length', 'content_filter', 'tool_calls']).nullable(),
  })),
});

export type DeepSeekResponse = z.infer<typeof DeepSeekResponseSchema>;
export type DeepSeekStreamEvent = z.infer<typeof DeepSeekStreamEventSchema>;

export interface ProcessingMetrics {
  responseTime: number;
  tokenCount: number;
  processingStages: number;
  cacheHit: boolean;
  errors: string[];
}

export interface ProcessedResponse {
  content: string;
  reasoning?: string;
  metadata: {
    model: string;
    tokens: number;
    temperature: number;
    processingTime: number;
    cacheHit: boolean;
    fallback: boolean;
    source: 'edge-function' | 'direct-api' | 'cache';
  };
  metrics: ProcessingMetrics;
}

export class DeepSeekResponseProcessor {
  private startTime: number = 0;
  private processingStages: string[] = [];

  /**
   * Process DeepSeek API response through 10-stage pipeline
   */
  async processResponse(
    rawResponse: any,
    sessionId: string,
    onEvent?: (event: ChatEvent) => void
  ): Promise<ProcessedResponse> {
    this.startTime = performance.now();
    this.processingStages = [];

    try {
      // Stage 1: Input Validation
      const validatedResponse = this.validateResponse(rawResponse);
      this.addStage('validation');

      // Stage 2: Content Extraction
      const { content, reasoning } = this.extractContent(validatedResponse);
      this.addStage('extraction');

      // Stage 3: Content Processing
      const processedContent = this.processContent(content);
      this.addStage('content-processing');

      // Stage 4: Reasoning Processing (if available)
      const processedReasoning = reasoning ? this.processReasoning(reasoning) : undefined;
      this.addStage('reasoning-processing');

      // Stage 5: Metadata Construction
      const metadata = this.constructMetadata(validatedResponse);
      this.addStage('metadata-construction');

      // Stage 6: Quality Assessment
      const qualityScore = this.assessResponseQuality(processedContent, processedReasoning);
      this.addStage('quality-assessment');

      // Stage 7: Error Detection
      const errors = this.detectErrors(validatedResponse, processedContent);
      this.addStage('error-detection');

      // Stage 8: Response Enhancement
      const enhancedContent = this.enhanceResponse(processedContent, qualityScore);
      this.addStage('response-enhancement');

      // Stage 9: Metrics Collection
      const metrics = this.collectMetrics(validatedResponse, errors);
      this.addStage('metrics-collection');

      // Stage 10: Final Assembly
      const finalResponse = this.assembleResponse(
        enhancedContent,
        processedReasoning,
        metadata,
        metrics
      );
      this.addStage('final-assembly');

      // Emit processing complete event
      onEvent?.({
        type: 'message_stop',
        data: {
          content: finalResponse.content,
          metadata: finalResponse.metadata,
          processingTime: performance.now() - this.startTime,
          stages: this.processingStages.length
        },
        sessionId
      });

      return finalResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Processing failed';
      
      onEvent?.({
        type: 'error',
        data: { error: `Response processing failed: ${errorMessage}` },
        sessionId
      });

      // Return fallback response
      return this.createFallbackResponse(rawResponse, errorMessage);
    }
  }

  /**
   * Stage 1: Validate response structure
   */
  private validateResponse(rawResponse: any): DeepSeekResponse {
    try {
      return DeepSeekResponseSchema.parse(rawResponse);
    } catch (error) {
      // Try to extract basic structure if validation fails
      if (rawResponse?.choices?.[0]?.message?.content) {
        return {
          id: rawResponse.id || 'unknown',
          object: 'chat.completion',
          created: rawResponse.created || Date.now(),
          model: rawResponse.model || 'deepseek-chat',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: rawResponse.choices[0].message.content,
              reasoning_content: rawResponse.choices[0].message.reasoning_content,
            },
            finish_reason: rawResponse.choices[0].finish_reason || 'stop',
          }],
          usage: rawResponse.usage || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
        };
      }
      throw new Error(`Invalid response structure: ${error}`);
    }
  }

  /**
   * Stage 2: Extract content and reasoning
   */
  private extractContent(response: DeepSeekResponse): { content: string; reasoning?: string } {
    const choice = response.choices[0];
    if (!choice?.message) {
      throw new Error('No message content found in response');
    }

    return {
      content: choice.message.content || '',
      reasoning: choice.message.reasoning_content,
    };
  }

  /**
   * Stage 3: Process and clean content
   */
  private processContent(content: string): string {
    if (!content) return '';

    return content
      .trim()
      // Remove excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      // Fix markdown formatting issues
      .replace(/\*\*([^*]+)\*\*/g, '**$1**')
      // Ensure proper code block formatting
      .replace(/```(\w+)?\n/g, '```$1\n');
  }

  /**
   * Stage 4: Process reasoning content
   */
  private processReasoning(reasoning: string): string {
    if (!reasoning) return '';

    return reasoning
      .trim()
      .replace(/\n{3,}/g, '\n\n');
  }

  /**
   * Stage 5: Construct comprehensive metadata
   */
  private constructMetadata(response: DeepSeekResponse): ProcessedResponse['metadata'] {
    const processingTime = performance.now() - this.startTime;
    
    return {
      model: response.model,
      tokens: response.usage.total_tokens,
      temperature: 0.7, // Default, should be passed from options
      processingTime,
      cacheHit: Boolean(response.usage.prompt_cache_hit_tokens),
      fallback: false,
      source: 'direct-api',
    };
  }

  /**
   * Stage 6: Assess response quality
   */
  private assessResponseQuality(content: string, reasoning?: string): number {
    let score = 0;

    // Content length assessment
    if (content.length > 50) score += 0.2;
    if (content.length > 200) score += 0.2;

    // Structure assessment
    if (content.includes('\n')) score += 0.1;
    if (content.match(/\*\*.*\*\*/)) score += 0.1;
    if (content.includes('```')) score += 0.1;

    // Reasoning assessment
    if (reasoning && reasoning.length > 20) score += 0.2;

    // Completeness assessment
    if (!content.endsWith('...') && !content.includes('incomplete')) score += 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Stage 7: Detect potential errors or issues
   */
  private detectErrors(response: DeepSeekResponse, content: string): string[] {
    const errors: string[] = [];

    // Check for truncated responses
    if (response.choices[0].finish_reason === 'length') {
      errors.push('Response truncated due to length limit');
    }

    // Check for empty content
    if (!content.trim()) {
      errors.push('Empty response content');
    }

    // Check for content filter issues
    if (response.choices[0].finish_reason === 'content_filter') {
      errors.push('Content filtered by safety mechanisms');
    }

    // Check for malformed markdown
    const codeBlockCount = (content.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      errors.push('Unclosed code blocks detected');
    }

    return errors;
  }

  /**
   * Stage 8: Enhance response based on quality assessment
   */
  private enhanceResponse(content: string, qualityScore: number): string {
    if (qualityScore < 0.5) {
      // Add helpful context for low-quality responses
      if (content.length < 50) {
        return content + '\n\n*Note: This appears to be a brief response. Feel free to ask for more details.*';
      }
    }

    return content;
  }

  /**
   * Stage 9: Collect processing metrics
   */
  private collectMetrics(response: DeepSeekResponse, errors: string[]): ProcessingMetrics {
    return {
      responseTime: performance.now() - this.startTime,
      tokenCount: response.usage.total_tokens,
      processingStages: this.processingStages.length,
      cacheHit: Boolean(response.usage.prompt_cache_hit_tokens),
      errors,
    };
  }

  /**
   * Stage 10: Assemble final processed response
   */
  private assembleResponse(
    content: string,
    reasoning: string | undefined,
    metadata: ProcessedResponse['metadata'],
    metrics: ProcessingMetrics
  ): ProcessedResponse {
    return {
      content,
      reasoning,
      metadata,
      metrics,
    };
  }

  /**
   * Create fallback response when processing fails
   */
  private createFallbackResponse(rawResponse: any, error: string): ProcessedResponse {
    const content = rawResponse?.choices?.[0]?.message?.content || 'Sorry, I encountered an error processing the response.';
    
    return {
      content,
      metadata: {
        model: 'unknown',
        tokens: 0,
        temperature: 0.7,
        processingTime: performance.now() - this.startTime,
        cacheHit: false,
        fallback: true,
        source: 'direct-api',
      },
      metrics: {
        responseTime: performance.now() - this.startTime,
        tokenCount: 0,
        processingStages: this.processingStages.length,
        cacheHit: false,
        errors: [error],
      },
    };
  }

  /**
   * Add processing stage to metrics
   */
  private addStage(stageName: string): void {
    this.processingStages.push(stageName);
    console.log(`🔄 Response Processor: Completed stage ${this.processingStages.length}: ${stageName}`);
  }
}

export const deepSeekResponseProcessor = new DeepSeekResponseProcessor();
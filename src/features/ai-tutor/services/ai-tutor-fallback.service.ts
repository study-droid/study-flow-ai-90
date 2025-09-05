/**
 * Fallback AI Tutor service that calls DeepSeek API directly
 * Used when edge functions are unavailable
 */

import type { 
  ChatSession, 
  ChatMessage, 
  DeepSeekResponse,
  ChatEvent
} from '../types';
import { generateId } from '@/shared/utils';
import { deepSeekResponseProcessor, type ProcessedResponse } from './deepseek-response-processor';
import { responseCacheService } from './response-cache.service';

export class AITutorFallbackService {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com/v1';

  constructor() {
    this.apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    if (!this.apiKey) {
      console.warn('VITE_DEEPSEEK_API_KEY not found. Fallback service will not work.');
    }
  }

  /**
   * Check if fallback service is available
   */
  isAvailable(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Create a new chat session
   */
  createSession(title?: string): ChatSession {
    const now = new Date();
    return {
      id: generateId(),
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      messages: [],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Create a new chat message
   */
  createMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    sessionId: string,
    type: 'text' | 'thinking' | 'error' = 'text'
  ): ChatMessage {
    const now = new Date();
    return {
      id: generateId(),
      role,
      content,
      type,
      sessionId,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Send message directly to DeepSeek API (fallback)
   */
  async sendMessage(
    message: string,
    sessionId: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      history?: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: number;
      }>;
      mode?: 'chat' | 'structured';
      onEvent?: (event: ChatEvent) => void;
    } = {}
  ): Promise<DeepSeekResponse> {
    if (!this.isAvailable()) {
      throw new Error('Fallback service not available: Missing API key');
    }

    try {
      const { onEvent } = options;

      // Check cache first for improved performance
      const cachedResponse = responseCacheService.getCachedResponse(message, {
        model: options.model,
        temperature: options.temperature,
        mode: options.mode
      });
      
      if (cachedResponse) {
        console.log('⚡ Fallback Service: Using cached response', {
          messageLength: message.length,
          contentLength: cachedResponse.content.length,
          sessionId
        });
        
        // Emit cached response through event pipeline for consistency
        onEvent?.({ type: 'thinking_start', data: { reasoning: 'Retrieving cached response...' }, sessionId });
        
        await new Promise(resolve => setTimeout(resolve, 200)); // Brief delay for UX
        
        onEvent?.({ type: 'thinking_stop', data: {}, sessionId });
        
        // Simulate streaming even for cached responses
        const words = cachedResponse.content.split(' ');
        const chunkSize = Math.max(5, Math.floor(words.length / 8));
        
        for (let i = 0; i < words.length; i += chunkSize) {
          const chunk = words.slice(0, i + chunkSize).join(' ');
          onEvent?.({ 
            type: 'message_delta', 
            data: { 
              fullContent: chunk,
              isComplete: i + chunkSize >= words.length 
            }, 
            sessionId 
          });
          
          if (i + chunkSize < words.length) {
            await new Promise(resolve => setTimeout(resolve, 30));
          }
        }
        
        onEvent?.({ 
          type: 'message_stop', 
          data: { 
            content: cachedResponse.content,
            metadata: cachedResponse.metadata,
            reasoning: cachedResponse.reasoning,
            metrics: cachedResponse.metrics
          }, 
          sessionId 
        });
        
        return {
          content: cachedResponse.content,
          reasoning: cachedResponse.reasoning,
          metadata: cachedResponse.metadata
        };
      }

      // Enhanced thinking progression with realistic timing and content analysis
      const analyzeMessage = (msg: string) => {
        const length = msg.length;
        const hasQuestionMarks = (msg.match(/\?/g) || []).length;
        const hasMathTerms = /\b(calculate|solve|equation|formula|math|algebra|geometry|calculus)\b/i.test(msg);
        const hasCodeTerms = /\b(code|program|function|algorithm|debug|error)\b/i.test(msg);
        const hasExplainTerms = /\b(explain|what|how|why|define|describe)\b/i.test(msg);
        
        return {
          isComplex: length > 50 || hasQuestionMarks > 1,
          isMath: hasMathTerms,
          isCode: hasCodeTerms,
          needsExplanation: hasExplainTerms || hasQuestionMarks > 0,
          estimatedComplexity: Math.min(5, Math.max(1, Math.floor(length / 20) + hasQuestionMarks))
        };
      };

      const analysis = analyzeMessage(message);
      const baseDelay = analysis.isComplex ? 200 : 100;

      const emitThinkingStage = async (stage: 'analyzing' | 'reasoning' | 'responding', content: string, delay: number = 0) => {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        onEvent?.({ 
          type: 'thinking_delta', 
          data: { 
            reasoning: content, 
            stage,
            timestamp: Date.now() 
          }, 
          sessionId 
        });
      };

      // Emit events for UI feedback
      onEvent?.({ type: 'message_start', data: { message }, sessionId });
      
      // Start progressive thinking stages with intelligent content
      onEvent?.({ 
        type: 'thinking_start', 
        data: { 
          reasoning: 'Initializing educational analysis...', 
          stage: 'analyzing' 
        }, 
        sessionId 
      });

      // Stage 1: Analyzing (with content-aware messaging)
      const analyzingMessage = analysis.isMath 
        ? 'Parsing mathematical concepts and identifying problem-solving approach...'
        : analysis.isCode 
        ? 'Analyzing code structure and identifying programming concepts...'
        : analysis.needsExplanation
        ? 'Breaking down the question to identify key learning objectives...'
        : 'Understanding the context and educational goals...';
      
      await emitThinkingStage('analyzing', analyzingMessage, baseDelay);
      
      // Stage 2: Reasoning (with complexity-aware timing)
      const reasoningDelay = analysis.isComplex ? 1000 : 600;
      const reasoningMessage = analysis.isMath
        ? 'Applying mathematical principles and working through solution steps...'
        : analysis.isCode
        ? 'Reviewing best practices and constructing clear explanations...'
        : analysis.needsExplanation
        ? 'Structuring comprehensive explanation with examples and context...'
        : 'Processing information and connecting relevant educational concepts...';
      
      await emitThinkingStage('reasoning', reasoningMessage, reasoningDelay);
      
      // Stage 3: Responding (final preparation)
      const respondingMessage = 'Organizing response for optimal learning and comprehension...';
      await emitThinkingStage('responding', respondingMessage, 400);

      // Build messages array from history
      const messages = [
        {
          role: 'system' as const,
          content: 'You are a helpful AI tutor. Provide clear, educational responses that help students learn. Be encouraging and break down complex concepts into understandable parts.'
        },
        ...(options.history || []).map(h => ({
          role: h.role as 'user' | 'assistant',
          content: h.content
        })),
        {
          role: 'user' as const,
          content: message
        }
      ];

      // Use direct fetch to bypass global circuit breaker interceptor
      const originalFetch = (globalThis as any).__originalFetch || globalThis.fetch;
      console.log('🔄 Fallback Service: Using DeepSeek v3.1 API call', {
        model: 'deepseek-chat', // v3.1 non-thinking mode
        messageLength: message.length,
        hasHistory: !!(options.history && options.history.length > 0),
        sessionId
      });
      
      const response = await originalFetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat', // DeepSeek v3.1 non-thinking mode
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4000,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      
      console.log('✅ Fallback Service: Received response from DeepSeek v3.1 API', {
        hasChoices: !!(data.choices && data.choices.length > 0),
        contentLength: data.choices?.[0]?.message?.content?.length || 0,
        usage: data.usage,
        model: data.model
      });

      // Keep thinking indicator active during initial processing

      // Process response through robust 10-stage pipeline
      console.log('🔄 Fallback Service: Processing response through DeepSeek pipeline...');
      const processedResponse = await deepSeekResponseProcessor.processResponse(
        data, 
        sessionId, 
        (event) => {
          // Forward processing events but modify streaming events
          if (event.type === 'message_delta') {
            // Convert to our expected format
            onEvent?.({ 
              type: 'message_delta', 
              data: { 
                fullContent: event.data.fullContent || event.data.content || '',
                isComplete: event.data.isComplete || false
              }, 
              sessionId 
            });
          } else {
            onEvent?.(event);
          }
        }
      );

      // Simulate streaming for better UX with processed content
      const content = processedResponse.content;
      const words = content.split(' ');
      const chunkSize = Math.max(3, Math.floor(words.length / 10)); // Adaptive chunk size
      
      let hasStoppedThinking = false;
      
      for (let i = 0; i < words.length; i += chunkSize) {
        const chunk = words.slice(0, i + chunkSize).join(' ');
        
        // Stop thinking indicator after first substantial chunk (around 20% progress)
        if (!hasStoppedThinking && i > 0 && chunk.length > 20) {
          onEvent?.({ type: 'thinking_stop', data: {}, sessionId });
          hasStoppedThinking = true;
        }
        
        onEvent?.({ 
          type: 'message_delta', 
          data: { 
            fullContent: chunk,
            isComplete: i + chunkSize >= words.length 
          }, 
          sessionId 
        });
        
        // Small delay between chunks for realistic streaming effect
        if (i + chunkSize < words.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Ensure thinking is stopped if not already done
      if (!hasStoppedThinking) {
        onEvent?.({ type: 'thinking_stop', data: {}, sessionId });
      }

      console.log('📤 Fallback Service: Emitting processed message_stop event', {
        contentLength: processedResponse.content.length,
        contentPreview: processedResponse.content.substring(0, 100) + (processedResponse.content.length > 100 ? '...' : ''),
        metadata: processedResponse.metadata,
        processingTime: processedResponse.metadata.processingTime,
        stages: processedResponse.metrics.processingStages,
        sessionId
      });

      onEvent?.({ 
        type: 'message_stop', 
        data: { 
          content: processedResponse.content,
          metadata: processedResponse.metadata,
          reasoning: processedResponse.reasoning,
          metrics: processedResponse.metrics
        }, 
        sessionId 
      });

      // Cache the processed response for future use
      responseCacheService.cacheResponse(message, processedResponse, {
        model: options.model,
        temperature: options.temperature,
        mode: options.mode
      });

      return { 
        content: processedResponse.content, 
        reasoning: processedResponse.reasoning,
        metadata: processedResponse.metadata 
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      options.onEvent?.({
        type: 'error',
        data: { error: `Fallback service error: ${errorMessage}` },
        sessionId,
      });

      throw new Error(`Fallback service failed: ${errorMessage}`);
    }
  }

  /**
   * Generate session title from first message
   */
  generateSessionTitle(firstMessage: string): string {
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;
    
    return title.replace(/\n/g, ' ');
  }
}

export const aiTutorFallbackService = new AITutorFallbackService();
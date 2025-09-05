/**
 * AI Tutor service for handling chat interactions
 */

import type { 
  ChatSession, 
  ChatMessage, 
  DeepSeekResponse,
  ChatEvent
} from '../types';
import { generateId } from '@/shared/utils';
import { aiTutorFallbackService } from './ai-tutor-fallback.service';
import { circuitBreakerManager } from '@/services/reliability/circuit-breaker';

export class AITutorService {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = baseUrl || import.meta.env.VITE_SUPABASE_URL + '/functions/v1';
    this.apiKey = apiKey || import.meta.env.VITE_SUPABASE_ANON_KEY;
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
   * Send message to AI tutor (non-streaming JSON response).
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
    try {
      const { onEvent } = options;

      // Emit message start and thinking events for UI feedback
      onEvent?.({ type: 'message_start', data: { message }, sessionId });
      onEvent?.({ type: 'thinking_start', data: { reasoning: '' }, sessionId });

      console.log('🔄 AI Tutor Service: Using fallback service directly to avoid circuit breaker issues', {
        messageLength: message.length,
        hasHistory: !!(options.history && options.history.length > 0),
        sessionId
      });

      // Enhanced thinking progression before calling fallback service
      const enhancedOnEvent = (event: ChatEvent) => {
        // Add enhanced thinking stages for better UX
        if (event.type === 'thinking_start') {
          onEvent?.({ 
            ...event, 
            data: { 
              ...event.data,
              stage: 'analyzing',
              reasoning: event.data.reasoning || 'Initializing AI tutor analysis...'
            }
          });
        } else {
          onEvent?.(event);
        }
      };

      // Use fallback service directly to avoid circuit breaker and edge function issues
      const result = await aiTutorFallbackService.sendMessage(message, sessionId, {
        ...options,
        onEvent: enhancedOnEvent,
      });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log('🔍 AI Tutor Service: Caught error, checking for fallback conditions', {
        errorMessage: errorMessage.substring(0, 200),
        hasCircuitBreaker: errorMessage.includes('Circuit breaker'),
        hasOpenCircuit: errorMessage.includes('OPEN'),
        hasFetch: errorMessage.includes('fetch'),
        hasHTTP: errorMessage.includes('HTTP'),
        fallbackAvailable: aiTutorFallbackService.isAvailable()
      });
      
      // Try fallback service if edge function fails and fallback is available
      // Enhanced conditions to catch more circuit breaker scenarios
      if (aiTutorFallbackService.isAvailable() && 
          (errorMessage.includes('Circuit breaker') || 
           errorMessage.includes('OPEN') ||
           errorMessage.includes('fetch') || 
           errorMessage.includes('HTTP error') ||
           errorMessage.includes('NetworkError') ||
           errorMessage.includes('Failed to fetch'))) {
        
        try {
          console.log('🔄 AI Tutor Service: Edge function failed, attempting fallback to direct DeepSeek API...', {
            originalError: errorMessage.substring(0, 100),
            fallbackReason: 'Circuit breaker protection or network error'
          });
          
          // Reset the circuit breaker to prevent future blocks during fallback
          const resetSuccess = circuitBreakerManager.resetCircuitBreaker('edge-function-professional');
          console.log('🔧 AI Tutor Service: Circuit breaker reset attempt', { success: resetSuccess });
          
          // Emit fallback notification
          options.onEvent?.({
            type: 'message_start',
            data: { message: '⚠️ Using backup service...' },
            sessionId,
          });

          const fallbackResponse = await aiTutorFallbackService.sendMessage(message, sessionId, options);
          
          // Mark response as using fallback
          return {
            ...fallbackResponse,
            metadata: {
              ...fallbackResponse.metadata,
              fallback: true,
              originalError: errorMessage
            }
          };
        } catch (fallbackError) {
          const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
          
          options.onEvent?.({
            type: 'error',
            data: { error: `Both main service and fallback failed: ${errorMessage}. Fallback error: ${fallbackErrorMessage}` },
            sessionId,
          });

          throw new Error(`Service unavailable: ${errorMessage}`);
        }
      }

      // If no fallback or fallback not applicable, throw original error
      options.onEvent?.({
        type: 'error',
        data: { error: errorMessage },
        sessionId,
      });

      throw new Error(`Failed to send message: ${errorMessage}`);
    }
  }

  /**
   * Generate session title from first message
   */
  generateSessionTitle(firstMessage: string): string {
    // Take first 50 characters and add ellipsis if longer
    const title = firstMessage.length > 50 
      ? firstMessage.substring(0, 50) + '...'
      : firstMessage;
    
    return title.replace(/\n/g, ' ');
  }

  /**
   * Export chat session to various formats
   */
  exportSession(session: ChatSession, format: 'json' | 'txt' | 'md' = 'json'): string {
    switch (format) {
      case 'txt':
        return this.exportAsText(session);
      case 'md':
        return this.exportAsMarkdown(session);
      case 'json':
      default:
        return JSON.stringify(session, null, 2);
    }
  }

  private exportAsText(session: ChatSession): string {
    const header = `Chat Session: ${session.title}\nCreated: ${session.createdAt}\n${'='.repeat(50)}\n\n`;
    const messages = session.messages
      .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content}\n`)
      .join('\n');
    
    return header + messages;
  }

  private exportAsMarkdown(session: ChatSession): string {
    const header = `# ${session.title}\n\n*Created: ${session.createdAt}*\n\n---\n\n`;
    const messages = session.messages
      .map(msg => {
        const role = msg.role === 'user' ? '**You**' : '**AI Tutor**';
        return `## ${role}\n\n${msg.content}\n\n`;
      })
      .join('');
    
    return header + messages;
  }

  /**
   * Search through chat sessions
   */
  searchSessions(sessions: ChatSession[], query: string): ChatSession[] {
    const lowerQuery = query.toLowerCase();
    
    return sessions.filter(session => {
      // Search in title
      if (session.title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      
      // Search in messages
      return session.messages.some(message => 
        message.content.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats(session: ChatSession) {
    const messageCount = session.messages.length;
    const userMessages = session.messages.filter(m => m.role === 'user').length;
    const assistantMessages = session.messages.filter(m => m.role === 'assistant').length;
    const totalTokens = session.messages.reduce((sum, msg) => {
      return sum + (msg.metadata?.tokens || 0);
    }, 0);
    
    const created = new Date((session.createdAt as unknown) as string | Date);
    const updated = new Date((session.updatedAt as unknown) as string | Date);
    return {
      messageCount,
      userMessages,
      assistantMessages,
      totalTokens,
      duration: updated.getTime() - created.getTime(),
    };
  }
}

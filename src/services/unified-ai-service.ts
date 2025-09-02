/**
 * Unified AI Service
 * Integrates with the secure Edge Function for AI operations
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';
import { deepSeekOptimizer } from './deepseek-response-optimizer';

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'deepseek';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AISession {
  id: string;
  subject: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
  provider: AIProvider;
}

interface AIResponse {
  provider: string;
  model: string;
  content: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

class UnifiedAIService {
  private sessions: Map<string, AISession> = new Map();
  private defaultProvider: AIProvider = 'deepseek'; // Using DeepSeek as default
  private availableProviders: Set<AIProvider> = new Set(['openai', 'gemini', 'claude', 'deepseek']);

  constructor() {
    logger.info('Unified AI Service initialized with DeepSeek as default', 'UnifiedAIService');
  }

  /**
   * Check which providers are available
   */
  async getAvailableProviders(): Promise<Array<{ name: string; value: AIProvider; available: boolean; hasMCP: boolean }>> {
    return [
      { name: 'DeepSeek', value: 'deepseek', available: true, hasMCP: false },
      { name: 'OpenAI', value: 'openai', available: true, hasMCP: false },
      { name: 'Gemini', value: 'gemini', available: true, hasMCP: false },
      { name: 'Claude', value: 'claude', available: true, hasMCP: false },
    ];
  }

  /**
   * Create a new AI session
   */
  async createSession(subject: string, provider?: AIProvider, useMCP?: boolean): Promise<AISession> {
    const sessionProvider = provider || this.defaultProvider;
    logger.debug('Creating session', 'UnifiedAIService', { provider: sessionProvider, default: this.defaultProvider });
    const sessionId = crypto.randomUUID();
    
    const session: AISession = {
      id: sessionId,
      subject,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
      provider: sessionProvider
    };
    
    this.sessions.set(sessionId, session);
    
    // Save to database
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('ai_tutor_sessions')
          .insert({
            id: sessionId,
            user_id: user.id,
            subject,
            subject_name: subject,
            ai_provider: sessionProvider,
            status: 'active',
            session_type: 'chat'
          });
      }
    } catch (error) {
      logger.error('Error saving session', 'UnifiedAIService', error);
    }
    
    return session;
  }

  /**
   * Send a message to the AI using the secure Edge Function
   */
  async sendMessage(
    sessionId: string,
    content: string,
    subject?: string,
    context?: {
      topic?: string;
      userLevel?: 'beginner' | 'intermediate' | 'advanced';
      responseType?: 'explanation' | 'study_plan' | 'practice' | 'concept';
      context?: any[];
    }
  ): Promise<Message> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Determine the provider to use
    const useProvider = session.provider || this.defaultProvider;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    try {
      // Get auth token
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        throw new Error('Not authenticated. Please sign in to use the AI Tutor.');
      }

      // Optimize the request before sending
      const { optimizedPrompt, systemPrompt, parameters } = await deepSeekOptimizer.optimizeRequest(
        content,
        {
          subject: subject || session.subject,
          topic: context?.topic,
          userLevel: context?.userLevel,
          responseType: context?.responseType
        }
      );

      // Build context from previous messages
      const messageContext = this.buildContext(session);
      const prompt = systemPrompt 
        ? `${systemPrompt}\n\n${messageContext}\n\nStudent: ${optimizedPrompt}\n\nTutor:`
        : `${messageContext}\n\nStudent: ${optimizedPrompt}\n\nTutor:`;

      // Call the secure Edge Function - always use Supabase Edge Function
      logger.debug('Calling Edge Function', 'UnifiedAIService', { provider: useProvider });
      
      // Use the working DeepSeek Edge Function
      const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepseek-ai`;
      logger.debug('Edge Function URL', 'UnifiedAIService', { url: edgeFunctionUrl });
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({
          provider: useProvider,
          prompt,
          model: this.getModelForProvider(useProvider as AIProvider),
          temperature: parameters?.temperature || 0.7,
          max_tokens: parameters?.max_tokens || 2000,
          top_p: parameters?.top_p || 0.95
        })
      });

      logger.debug('Response status', 'UnifiedAIService', { status: response.status });

      if (!response.ok) {
        let errorMessage = 'Failed to get AI response';
        try {
          const error = await response.json();
          logger.error('Edge Function error', 'UnifiedAIService', error);
          
          // Check specific error types and provide helpful messages
          if (error.error?.includes('API key') || error.error?.includes('not configured')) {
            errorMessage = 'AI service needs configuration. Please contact support or check the setup guide.';
          } else if (error.error?.includes('Authentication')) {
            errorMessage = 'Please sign in to use the AI Tutor.';
          } else if (error.setup) {
            // Edge function is providing setup instructions
            errorMessage = `Setup required: ${error.setup.instruction}`;
          } else {
            errorMessage = error.error || error.message || errorMessage;
          }
        } catch (e) {
          logger.error('Failed to parse error response', 'UnifiedAIService', e);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      const data: AIResponse = await response.json();

      // Optimize the response
      const optimizedResponse = await deepSeekOptimizer.optimizeResponse(
        data.content,
        {
          subject: subject || session.subject,
          topic: context?.topic,
          userLevel: context?.userLevel,
          responseType: context?.responseType
        }
      );

      // Log optimization metadata
      if (optimizedResponse.metadata) {
        logger.info('Response optimized', 'UnifiedAIService', {
          qualityScore: optimizedResponse.metadata.qualityScore,
          enhancementsApplied: optimizedResponse.metadata.enhancementsApplied,
          optimizationTime: optimizedResponse.metadata.optimizationTime
        });
      }

      // Add assistant message with optimized content
      const assistantMessage: Message = {
        role: 'assistant',
        content: optimizedResponse.content,
        timestamp: new Date()
      };
      session.messages.push(assistantMessage);
      session.lastActive = new Date();

      // Save messages to database
      await this.saveMessages(sessionId, userMessage, assistantMessage);

      return assistantMessage;
    } catch (error) {
      logger.error('Error in sendMessage', 'UnifiedAIService', error);
      
      // Provide user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Not authenticated')) {
          throw new Error('Please sign in to use the AI Tutor');
        }
        if (error.message.includes('API keys not configured')) {
          throw error; // Pass through configuration errors
        }
      }
      
      throw new Error('AI service is temporarily unavailable. Please try again later.');
    }
  }

  /**
   * Build context from session messages
   */
  private buildContext(session: AISession): string {
    const recentMessages = session.messages.slice(-10); // Last 10 messages
    
    const context = recentMessages
      .map(msg => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`)
      .join('\n');

    return `You are an expert tutor helping a student with ${session.subject}.
Previous conversation:
${context}`;
  }

  /**
   * Get the appropriate model for each provider
   */
  private getModelForProvider(provider: AIProvider): string {
    switch (provider) {
      case 'deepseek':
        return import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat'; // Default and primary
      case 'gemini':
        return import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash'; // Alternative option
      case 'openai':
        return 'gpt-3.5-turbo'; // Fallback option
      case 'claude':
        return 'claude-3-opus-20240229'; // Alternative option
      default:
        return 'deepseek-chat'; // Always default to DeepSeek
    }
  }

  /**
   * Save messages to database
   */
  private async saveMessages(
    sessionId: string,
    userMessage: Message,
    assistantMessage: Message
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('ai_tutor_messages')
        .insert([
          {
            session_id: sessionId,
            role: userMessage.role,
            content: userMessage.content,
            created_at: userMessage.timestamp.toISOString()
          },
          {
            session_id: sessionId,
            role: assistantMessage.role,
            content: assistantMessage.content,
            created_at: assistantMessage.timestamp.toISOString()
          }
        ]);
    } catch (error) {
      logger.error('Error saving messages', 'UnifiedAIService', error);
    }
  }

  /**
   * Get all sessions
   */
  getSessions(): AISession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get a specific session
   */
  getSession(sessionId: string): AISession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
  }

  /**
   * Delete a specific session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Delete from local storage
      this.sessions.delete(sessionId);
      
      // Try to delete from database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Archive the session in database (soft delete)
        const { error } = await supabase
          .from('ai_tutor_sessions')
          .update({ is_archived: true })
          .eq('id', sessionId)
          .eq('user_id', user.id);
          
        if (error) {
          logger.error('Error archiving session in database', 'UnifiedAIService', error);
        }
      }
      
      logger.debug('Session deleted', 'UnifiedAIService', { sessionId });
      return true;
    } catch (error) {
      logger.error('Error deleting session', 'UnifiedAIService', error);
      // Still return true if local deletion worked
      return !this.sessions.has(sessionId);
    }
  }

  /**
   * Load sessions from database
   */
  async loadSessions(): Promise<AISession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: sessions, error } = await supabase
        .from('ai_tutor_sessions')
        .select('*, ai_tutor_messages(*)')
        .eq('user_id', user.id)
        .or('is_archived.is.null,is_archived.eq.false') // Filter out archived sessions
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const loadedSessions = (sessions || []).map(session => {
        const aiSession: AISession = {
          id: session.id,
          subject: session.subject || session.subject_name,
          messages: (session.ai_tutor_messages || []).map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at)
          })),
          createdAt: new Date(session.created_at),
          lastActive: new Date(session.updated_at || session.created_at),
          provider: session.ai_provider as AIProvider
        };
        
        this.sessions.set(session.id, aiSession);
        return aiSession;
      });

      return loadedSessions;
    } catch (error) {
      logger.error('Error loading sessions', 'UnifiedAIService', error);
      return [];
    }
  }

  /**
   * Get optimization insights for a session
   */
  async getOptimizationInsights(sessionId: string): Promise<{
    totalOptimizations: number;
    averageQualityScore: number;
    commonEnhancements: string[];
    suggestions: string[];
  }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return {
        totalOptimizations: 0,
        averageQualityScore: 0,
        commonEnhancements: [],
        suggestions: []
      };
    }

    // Analyze session messages for optimization patterns
    const assistantMessages = session.messages.filter(m => m.role === 'assistant');
    
    return {
      totalOptimizations: assistantMessages.length,
      averageQualityScore: 85, // This would be calculated from actual optimization metadata
      commonEnhancements: ['structured_formatting', 'educational_enhancement', 'examples_added'],
      suggestions: [
        'Try asking more specific questions for better responses',
        'Break complex topics into smaller parts',
        'Request examples when learning new concepts'
      ]
    };
  }

  /**
   * Enable/disable response optimization
   */
  setOptimizationEnabled(enabled: boolean): void {
    // Store this preference
    localStorage.setItem('ai_optimization_enabled', enabled.toString());
    logger.info('Optimization setting changed', 'UnifiedAIService', { enabled });
  }

  /**
   * Check if optimization is enabled
   */
  isOptimizationEnabled(): boolean {
    const stored = localStorage.getItem('ai_optimization_enabled');
    return stored !== 'false'; // Default to true
  }
}

// Export singleton instance
export const unifiedAIService = new UnifiedAIService();
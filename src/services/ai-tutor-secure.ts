/**
 * Secure AI Tutor Service
 * Uses Supabase Edge Functions to securely access API keys
 * No API keys are exposed in the frontend
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TutorSession {
  id: string;
  subject: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
  aiProvider: 'openai' | 'gemini' | 'claude';
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

class SecureAITutorService {
  private sessions: Map<string, TutorSession> = new Map();
  private defaultProvider: 'openai' | 'gemini' | 'claude' = 'openai'; // OpenAI as default
  private lastApiCallSuccess: boolean = true;

  constructor() {
    logger.debug('Secure AI Tutor Service initialized with OpenAI as default provider', 'AiTutorSecure');
  }

  /**
   * Create a new tutoring session
   */
  async createSession(
    subject: string,
    provider?: 'openai' | 'gemini' | 'claude'
  ): Promise<TutorSession> {
    const aiProvider = provider || this.defaultProvider;
    const sessionId = crypto.randomUUID();
    
    const session: TutorSession = {
      id: sessionId,
      subject,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
      aiProvider
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
            ai_provider: aiProvider,
            status: 'active'
          });
      }
    } catch (error) {
      logger.error('Error saving session to database:', error, 'AiTutorSecure');
    }
    
    return session;
  }

  /**
   * Send a message to the AI tutor using secure Edge Function
   */
  async sendMessage(
    sessionId: string,
    message: string,
    provider?: 'openai' | 'gemini' | 'claude'
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to session
    const userMessage: Message = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    // Prepare the prompt with context
    const prompt = this.buildPrompt(session, message);
    
    try {
      // Get auth token
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        throw new Error('Not authenticated');
      }

      // Call the secure Edge Function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy-secure`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`
          },
          body: JSON.stringify({
            provider: provider || session.aiProvider,
            prompt,
            model: this.getModelForProvider(provider || session.aiProvider),
            temperature: 0.7,
            max_tokens: 2000
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        
        // Check if it's an API key configuration issue
        if (error.setup_instructions) {
          throw new Error(
            `API key not configured. ${error.setup_instructions}\n\n` +
            `To set up your API key:\n` +
            `1. Run: node scripts/store-api-key-secure.js\n` +
            `2. Or use the Supabase SQL Editor with the migration script`
          );
        }
        
        throw new Error(error.error || 'Failed to get AI response');
      }

      const data: AIResponse = await response.json();
      
      // Add assistant message to session
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date()
      };
      session.messages.push(assistantMessage);
      session.lastActive = new Date();

      // Save message to database
      await this.saveMessageToDatabase(sessionId, userMessage, assistantMessage);

      return data.content;
    } catch (error) {
      logger.error('Error sending message:', error, 'AiTutorSecure');
      throw error;
    }
  }

  /**
   * Build a prompt with session context
   */
  private buildPrompt(session: TutorSession, currentMessage: string): string {
    const context = session.messages
      .slice(-10) // Last 10 messages for context
      .map(msg => `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.content}`)
      .join('\n');

    return `You are an expert tutor helping a student with ${session.subject}.
Previous conversation:
${context}

Student: ${currentMessage}

Please provide a helpful, educational response that:
1. Directly answers the student's question
2. Explains concepts clearly
3. Provides examples when appropriate
4. Encourages further learning

Tutor:`;
  }

  /**
   * Get the appropriate model for each provider
   */
  private getModelForProvider(provider: 'openai' | 'gemini' | 'claude'): string {
    switch (provider) {
      case 'openai':
        return 'gpt-4-turbo-preview';
      case 'gemini':
        return 'gemini-pro';
      case 'claude':
        return 'claude-3-opus-20240229';
      default:
        return 'gpt-4-turbo-preview';
    }
  }

  /**
   * Save messages to database
   */
  private async saveMessageToDatabase(
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
      logger.error('Error saving messages to database:', error, 'AiTutorSecure');
    }
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): TutorSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Load sessions from database
   */
  async loadSessions(): Promise<TutorSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: sessions, error } = await supabase
        .from('ai_tutor_sessions')
        .select('*, ai_tutor_messages(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return sessions.map(session => {
        const tutorSession: TutorSession = {
          id: session.id,
          subject: session.subject,
          messages: session.ai_tutor_messages?.map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at)
          })) || [],
          createdAt: new Date(session.created_at),
          lastActive: new Date(session.updated_at),
          aiProvider: session.ai_provider
        };
        
        this.sessions.set(session.id, tutorSession);
        return tutorSession;
      });
    } catch (error) {
      logger.error('Error loading sessions:', error, 'AiTutorSecure');
      return [];
    }
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
  }

  /**
   * Set default AI provider
   */
  setDefaultProvider(provider: 'openai' | 'gemini' | 'claude'): void {
    this.defaultProvider = provider;
  }
}

// Export singleton instance
export const secureAITutor = new SecureAITutorService();
export default secureAITutor;
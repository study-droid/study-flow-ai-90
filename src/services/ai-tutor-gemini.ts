import { aiProxyClient } from './ai-proxy-client';
import { log } from '@/lib/config';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TutorSession {
  id: string;
  subject: string;
  subject_name: string;
  subject_id?: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
  aiProvider: 'gemini' | 'claude';
  status?: string;
  session_type?: string;
  metadata?: any;
}

class AITutorService {
  private sessions: Map<string, TutorSession> = new Map();

  constructor() {
    // All AI calls go through secure Supabase proxy
    log.info('AI Tutor Service initialized with secure Supabase proxy');
  }

  async createSession(subject: string, provider?: 'gemini' | 'claude'): Promise<TutorSession> {
    const aiProvider = provider || 'gemini';
    
    try {
      // Save session to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('ai_tutor_sessions')
        .insert({
          user_id: user.id,
          subject: subject,
          subject_name: subject,
          ai_provider: aiProvider,
          session_type: 'chat',
          status: 'active'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      const session: TutorSession = {
        id: data.id,
        subject: data.subject || data.subject_name,
        subject_name: data.subject_name,
        subject_id: data.subject_id,
        messages: [],
        createdAt: new Date(data.created_at),
        lastActive: new Date(data.last_active_at || data.updated_at),
        aiProvider: data.ai_provider as 'gemini' | 'claude',
        status: data.status,
        session_type: data.session_type,
        metadata: data.metadata
      };
      
      this.sessions.set(data.id, session);
      return session;
    } catch (error) {
      log.error('Error creating session:', error);
      // Fallback to local session if database fails
      const sessionId = crypto.randomUUID();
      const session: TutorSession = {
        id: sessionId,
        subject,
        subject_name: subject,
        messages: [],
        createdAt: new Date(),
        lastActive: new Date(),
        aiProvider,
        status: 'active',
        session_type: 'chat'
      };
      
      this.sessions.set(sessionId, session);
      return session;
    }
  }

  private formatMessagesForGemini(messages: Message[]): Array<{role: string, parts: Array<{text: string}>}> {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{text: msg.content}]
    }));
  }

  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        
        // Check if error is retryable
        const isRetryable = 
          error.status === 503 || 
          error.status === 429 || 
          error.message?.includes('overloaded') ||
          error.message?.includes('rate limit') ||
          error.message?.includes('temporarily unavailable');
        
        if (!isRetryable || i === maxRetries - 1) {
          throw error;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = initialDelay * Math.pow(2, i) + Math.random() * 1000;
        log.info(`Retrying Gemini API call (attempt ${i + 2}/${maxRetries}) after ${Math.round(delay)}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  async sendMessageWithGemini(session: TutorSession, message: string): Promise<string> {
    const systemPrompt = `You are an expert AI tutor specializing in ${session.subject}. 
      Your role is to:
      - Explain concepts clearly and concisely
      - Use examples and analogies to make complex topics understandable
      - Ask guiding questions to help students think critically
      - Provide step-by-step solutions when appropriate
      - Encourage active learning and problem-solving
      - Adapt your teaching style to the student's needs
      - Be patient, supportive, and encouraging
      
      Keep your responses focused and educational. If asked about non-academic topics, 
      politely redirect the conversation back to learning.`;

    const executeGeminiCall = async () => {
      // For Gemini, we need to include the system prompt as part of the first user message
      // since Gemini doesn't support system messages directly
      const messagesForGemini = [];
      
      // Add context as first message if this is the start of conversation
      if (session.messages.length === 0) {
        messagesForGemini.push({
          role: 'user',
          content: `${systemPrompt}\n\nStudent's question: ${message}`
        });
      } else {
        // Include previous conversation
        messagesForGemini.push(...session.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })));
        messagesForGemini.push({ role: 'user', content: message });
      }

      const response = await aiProxyClient.sendGeminiMessage(messagesForGemini);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Extract text from Gemini response
      const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!responseText) {
        throw new Error('Invalid response from AI service');
      }
      
      return responseText;
    };

    try {
      // Use retry logic with exponential backoff
      return await this.retryWithExponentialBackoff(executeGeminiCall);
    } catch (error: unknown) {
      log.error('Error calling Gemini API after retries:', error);
      
      // Provide more specific error messages based on the error
      if (error.message?.includes('AI service is temporarily unavailable')) {
        throw new Error('AI service is temporarily unavailable. Please try again later.');
      } else if (error.message?.includes('not configured')) {
        throw new Error('AI service is not properly configured. Please contact support.');
      } else if (error.status === 503 || error.message?.includes('overloaded')) {
        throw new Error('The AI service is currently overloaded. Please try again in a few moments.');
      } else if (error.status === 429 || error.message?.includes('quota')) {
        throw new Error('API quota exceeded. Please wait a moment before trying again.');
      }
      
      // Generic error message
      throw new Error(`Failed to get response from AI tutor: ${error.message || 'AI service is temporarily unavailable. Please try again later.'}`);
    }
  }

  async sendMessageWithClaude(session: TutorSession, message: string): Promise<string> {
    const systemPrompt = `You are an expert AI tutor specializing in ${session.subject}. 
      Your role is to:
      - Explain concepts clearly and concisely
      - Use examples and analogies to make complex topics understandable
      - Ask guiding questions to help students think critically
      - Provide step-by-step solutions when appropriate
      - Encourage active learning and problem-solving
      - Adapt your teaching style to the student's needs
      - Be patient, supportive, and encouraging
      
      Keep your responses focused and educational. If asked about non-academic topics, 
      politely redirect the conversation back to learning.`;

    try {
      // Use the secure AI proxy for Claude
      const messages = [
        { role: 'system', content: systemPrompt },
        ...session.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const response = await aiProxyClient.sendClaudeMessage(messages);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      return response.data?.content?.[0]?.text || 
        'I apologize, but I could not generate a response.';
    } catch (error: unknown) {
      log.error('Error calling Claude via proxy:', error.message);
      throw new Error('Failed to get response from Claude AI. Please try again.');
    }
  }

  async sendMessage(sessionId: string, message: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    let assistantMessage: string;

    try {
      // Use the session's AI provider via Supabase proxy
      if (session.aiProvider === 'claude') {
        assistantMessage = await this.sendMessageWithClaude(session, message);
      } else {
        // Default to Gemini
        assistantMessage = await this.sendMessageWithGemini(session, message);
      }

      // Add assistant response to session
      session.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      });

      session.lastActive = new Date();
      
      // Update session last_active_at in database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Update session last active time
          await supabase
            .from('ai_tutor_sessions')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', sessionId);
            
          // Save both user and assistant messages
          await supabase
            .from('ai_tutor_messages')
            .insert([
              {
                session_id: sessionId,
                role: 'user',
                content: message
              },
              {
                session_id: sessionId,
                role: 'assistant',
                content: assistantMessage
              }
            ]);
        }
      } catch (dbError) {
        log.error('Error saving messages to database:', dbError);
        // Continue even if database save fails
      }
      
      return assistantMessage;
    } catch (error) {
      // Remove the user message if there was an error
      session.messages.pop();
      throw error;
    }
  }

  getSession(sessionId: string): TutorSession | undefined {
    return this.sessions.get(sessionId);
  }

  async getAllSessions(): Promise<TutorSession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return Array.from(this.sessions.values());
      
      // Load sessions from database
      const { data: dbSessions, error } = await supabase
        .from('ai_tutor_sessions')
        .select('*, ai_tutor_messages(*)')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('last_active_at', { ascending: false });
      
      if (error) throw error;
      
      // Convert database sessions to TutorSession format
      const sessions: TutorSession[] = dbSessions?.map(dbSession => {
        const messages: Message[] = dbSession.ai_tutor_messages?.map((msg: unknown) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          timestamp: new Date(msg.timestamp)
        })) || [];
        
        const session: TutorSession = {
          id: dbSession.id,
          subject: dbSession.subject || dbSession.subject_name,
          subject_name: dbSession.subject_name,
          subject_id: dbSession.subject_id,
          messages,
          createdAt: new Date(dbSession.created_at),
          lastActive: new Date(dbSession.last_active_at || dbSession.updated_at),
          aiProvider: dbSession.ai_provider as 'gemini' | 'claude',
          status: dbSession.status,
          session_type: dbSession.session_type,
          metadata: dbSession.metadata
        };
        
        // Cache the session locally
        this.sessions.set(dbSession.id, session);
        
        return session;
      }) || [];
      
      return sessions;
    } catch (error) {
      log.error('Error loading sessions from database:', error);
      return Array.from(this.sessions.values());
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Archive session in database (soft delete)
        await supabase
          .from('ai_tutor_sessions')
          .update({ is_archived: true })
          .eq('id', sessionId)
          .eq('user_id', user.id);
      }
    } catch (error) {
      log.error('Error archiving session in database:', error);
    }
    
    return this.sessions.delete(sessionId);
  }

  async generateStudyPlan(subject: string, topics: string[], duration: number): Promise<string> {
    const prompt = `Create a detailed study plan for ${subject} covering these topics: ${topics.join(', ')}. 
      The student has ${duration} hours available. 
      Include specific goals, time allocations, and study techniques for each topic.
      Format the response in a clear, structured way with sections and bullet points.`;

    try {
      const executeCall = async () => {
        const response = await aiProxyClient.sendGeminiMessage([
          { role: 'user', content: prompt }
        ]);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 
          'Unable to generate study plan';
      };
      
      return await this.retryWithExponentialBackoff(executeCall);
    } catch (error: unknown) {
      log.error('Error generating study plan:', error);
      if (error.status === 503 || error.message?.includes('overloaded')) {
        throw new Error('AI service is currently overloaded. Please try again in a few moments.');
      }
      throw new Error('Failed to generate study plan. Please try again.');
    }
  }

  async explainConcept(subject: string, concept: string, level: 'beginner' | 'intermediate' | 'advanced'): Promise<string> {
    const prompt = `Explain the concept of "${concept}" in ${subject} for a ${level} student. 
      Include practical examples and real-world applications.
      Make the explanation clear, engaging, and appropriate for the student's level.`;

    try {
      const executeCall = async () => {
        const response = await aiProxyClient.sendGeminiMessage([
          { role: 'user', content: prompt }
        ]);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        return response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 
          'Unable to explain concept';
      };
      
      return await this.retryWithExponentialBackoff(executeCall);
    } catch (error: unknown) {
      log.error('Error explaining concept:', error);
      if (error.status === 503 || error.message?.includes('overloaded')) {
        throw new Error('AI service is currently overloaded. Please try again in a few moments.');
      }
      throw new Error('Failed to explain concept. Please try again.');
    }
  }

  async generatePracticeQuestions(subject: string, topic: string, difficulty: string, count: number): Promise<string[]> {
    const prompt = `Generate ${count} ${difficulty} practice questions for ${topic} in ${subject}. 
      Make the questions thought-provoking and test understanding.
      Format each question on a new line with a number prefix (1., 2., etc.).`;

    try {
      const executeCall = async () => {
        const response = await aiProxyClient.sendGeminiMessage([
          { role: 'user', content: prompt }
        ]);
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return content.split('\n').filter(line => line.trim().match(/^\d+\./));
      };
      
      return await this.retryWithExponentialBackoff(executeCall);
    } catch (error: unknown) {
      log.error('Error generating questions:', error);
      if (error.status === 503 || error.message?.includes('overloaded')) {
        throw new Error('AI service is currently overloaded. Please try again in a few moments.');
      }
      throw new Error('Failed to generate practice questions. Please try again.');
    }
  }

  isConfigured(): boolean {
    // Always configured when using Supabase edge function
    return true;
  }

  getAvailableProviders(): Array<{name: string, value: 'gemini' | 'claude', available: boolean}> {
    return [
      { name: 'Gemini AI (via Supabase)', value: 'gemini', available: true },
      { name: 'Claude AI (via Supabase)', value: 'claude', available: true }
    ];
  }
}

export const aiTutorService = new AITutorService();
export type { Message, TutorSession };
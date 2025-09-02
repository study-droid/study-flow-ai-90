import { aiProxyClient } from './ai-proxy-client';
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
}

class AITutorService {
  private sessions: Map<string, TutorSession> = new Map();

  constructor() {
    // No need for API keys - handled securely on the server
  }

  async createSession(subject: string): Promise<TutorSession> {
    const sessionId = crypto.randomUUID();
    const session: TutorSession = {
      id: sessionId,
      subject,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date()
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async sendMessage(sessionId: string, message: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    try {
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

      // Prepare messages with system prompt
      const messagesWithSystem = [
        { role: 'system', content: systemPrompt },
        ...session.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];

      // Use secure proxy instead of direct API call
      const response = await aiProxyClient.sendClaudeMessage(
        messagesWithSystem,
        'claude-3-haiku-20240307'
      );

      if (response.error) {
        throw new Error(response.error);
      }

      const assistantMessage = response.data?.content?.[0]?.text || 
        'I apologize, but I could not generate a response.';

      session.messages.push({
        role: 'assistant',
        content: assistantMessage,
        timestamp: new Date()
      });

      session.lastActive = new Date();
      return assistantMessage;
    } catch (error: any) {
      // Only log sanitized errors in development
      if (import.meta.env.DEV) {
        console.error('AI service error:', {
          message: error.message || 'Unknown error'
        });
      }
      throw new Error(error.message || 'Failed to get response from AI tutor. Please try again.');
    }
  }

  getSession(sessionId: string): TutorSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): TutorSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  async generateStudyPlan(subject: string, topics: string[], duration: number): Promise<string> {
    if (!this.anthropic) {
      throw new Error('AI Tutor service is not configured');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: 'You are an expert educational planner. Create detailed, actionable study plans.',
        messages: [{
          role: 'user',
          content: `Create a study plan for ${subject} covering these topics: ${topics.join(', ')}. 
            The student has ${duration} hours available. 
            Include specific goals, time allocations, and study techniques for each topic.`
        }]
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Unable to generate study plan';
    } catch (error) {
      logger.error('Error generating study plan:', error, 'AiTutor');
      throw new Error('Failed to generate study plan');
    }
  }

  async explainConcept(subject: string, concept: string, level: 'beginner' | 'intermediate' | 'advanced'): Promise<string> {
    if (!this.anthropic) {
      throw new Error('AI Tutor service is not configured');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: `You are an expert tutor. Explain concepts at a ${level} level with clarity and examples.`,
        messages: [{
          role: 'user',
          content: `Explain the concept of "${concept}" in ${subject} for a ${level} student. 
            Include practical examples and applications.`
        }]
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'Unable to explain concept';
    } catch (error) {
      logger.error('Error explaining concept:', error, 'AiTutor');
      throw new Error('Failed to explain concept');
    }
  }

  async generatePracticeQuestions(subject: string, topic: string, difficulty: string, count: number): Promise<string[]> {
    if (!this.anthropic) {
      throw new Error('AI Tutor service is not configured');
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: 'You are an expert educator. Generate practice questions that test understanding and application.',
        messages: [{
          role: 'user',
          content: `Generate ${count} ${difficulty} practice questions for ${topic} in ${subject}. 
            Format each question on a new line with a number prefix.`
        }]
      });

      const content = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      return content.split('\n').filter(line => line.trim().match(/^\d+\./));
    } catch (error) {
      logger.error('Error generating practice questions:', error, 'AiTutor');
      throw new Error('Failed to generate practice questions');
    }
  }
}

export const aiTutorService = new AITutorService();
export type { Message, TutorSession };
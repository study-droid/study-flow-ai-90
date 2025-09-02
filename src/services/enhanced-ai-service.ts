import { getLLM, ChatMessage, StreamChunk, ToolDef, ToolCall } from '@/lib/llm';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/services/logging/logger';

export type AIProvider = 'openai' | 'gemini' | 'claude' | 'auto';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface AISession {
  id: string;
  subject: string;
  messages: Message[];
  createdAt: Date;
  lastActive: Date;
  provider: AIProvider;
}

export interface StreamingOptions {
  onChunk?: (chunk: StreamChunk) => void;
  onToolCall?: (tool: ToolCall) => void;
  onComplete?: (fullMessage: string) => void;
  onError?: (error: string) => void;
}

// Tool definitions for the AI tutor
const TUTOR_TOOLS: ToolDef[] = [
  {
    name: 'create_tasks',
    description: 'Create study tasks for a subject',
    parameters: {
      type: 'object',
      properties: {
        subjectId: { type: 'string', description: 'Subject ID' },
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              estMins: { type: 'number' },
              dueAt: { type: 'string', format: 'date-time' },
              priority: { type: 'number', minimum: 1, maximum: 5 }
            },
            required: ['title', 'estMins']
          }
        }
      },
      required: ['subjectId', 'tasks']
    }
  },
  {
    name: 'plan_week',
    description: 'Plan a study schedule for the week',
    parameters: {
      type: 'object',
      properties: {
        subjectId: { type: 'string' },
        hoursPerWeek: { type: 'number' },
        constraints: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['subjectId', 'hoursPerWeek']
    }
  },
  {
    name: 'make_quiz',
    description: 'Generate a quiz for a topic',
    parameters: {
      type: 'object',
      properties: {
        subjectId: { type: 'string' },
        topic: { type: 'string' },
        numQuestions: { type: 'number', default: 5 },
        questionType: { 
          type: 'string', 
          enum: ['mcq', 'short', 'mixed'],
          default: 'mixed'
        }
      },
      required: ['subjectId', 'topic']
    }
  },
  {
    name: 'grade_answer',
    description: 'Grade a student answer and provide feedback',
    parameters: {
      type: 'object',
      properties: {
        questionId: { type: 'string' },
        userAnswer: { type: 'string' },
        correctAnswer: { type: 'string' }
      },
      required: ['questionId', 'userAnswer']
    }
  },
  {
    name: 'summarize_notes',
    description: 'Summarize notes on a topic',
    parameters: {
      type: 'object',
      properties: {
        subjectId: { type: 'string' },
        topic: { type: 'string' }
      },
      required: ['subjectId', 'topic']
    }
  },
  {
    name: 'schedule_session',
    description: 'Schedule a study session',
    parameters: {
      type: 'object',
      properties: {
        subjectId: { type: 'string' },
        startAtISO: { type: 'string', format: 'date-time' },
        durationMins: { type: 'number' }
      },
      required: ['subjectId', 'startAtISO', 'durationMins']
    }
  }
];

class EnhancedAIService {
  private sessions: Map<string, AISession> = new Map();
  private defaultProvider: AIProvider = 'gemini'; // Using Gemini as default

  constructor() {
    logger.info('Enhanced AI Service initialized with Gemini as default', 'EnhancedAIService');
  }

  async createSession(subject: string, provider?: AIProvider): Promise<AISession> {
    const sessionProvider = provider || this.defaultProvider;
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
            ai_provider: sessionProvider === 'auto' ? 'openai' : sessionProvider,
            status: 'active',
            session_type: 'chat'
          });
      }
    } catch (error) {
      logger.error('Error saving session', 'EnhancedAIService', error);
    }
    
    return session;
  }

  async *sendMessageStream(
    sessionId: string,
    content: string,
    options?: {
      provider?: AIProvider;
      includeTools?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<StreamChunk> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      yield { type: 'error', error: 'Session not found' };
      return;
    }

    // Determine provider
    const useProvider = options?.provider === 'auto' ? undefined : 
      (options?.provider || (session.provider !== 'auto' ? session.provider : undefined));
    
    const llm = getLLM(useProvider);

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    // Build chat messages
    const chatMessages: ChatMessage[] = session.messages.map(msg => ({
      role: msg.role as any,
      content: msg.content,
      tool_calls: msg.tool_calls,
      tool_call_id: msg.tool_call_id
    }));

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(session.subject);

    try {
      // Stream from LLM
      let fullContent = '';
      const toolCalls: ToolCall[] = [];

      for await (const chunk of llm.chatStream({
        messages: chatMessages,
        system: systemPrompt,
        tools: options?.includeTools ? TUTOR_TOOLS : undefined,
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens ?? 2000
      })) {
        yield chunk;

        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content;
        } else if (chunk.type === 'tool_call' && chunk.tool) {
          toolCalls.push(chunk.tool);
        }
      }

      // Save assistant message
      const assistantMessage: Message = {
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
      };
      session.messages.push(assistantMessage);
      session.lastActive = new Date();

      // Save to database
      await this.saveMessages(sessionId, userMessage, assistantMessage);

    } catch (error) {
      logger.error('Error in streaming message', 'EnhancedAIService', error);
      yield { 
        type: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendMessage(
    sessionId: string,
    content: string,
    options?: {
      provider?: AIProvider;
      includeTools?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<Message> {
    let fullContent = '';
    const toolCalls: ToolCall[] = [];

    for await (const chunk of this.sendMessageStream(sessionId, content, options)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content;
      } else if (chunk.type === 'tool_call' && chunk.tool) {
        toolCalls.push(chunk.tool);
      }
    }

    return {
      role: 'assistant',
      content: fullContent,
      timestamp: new Date(),
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined
    };
  }

  async executeToolCall(tool: ToolCall): Promise<any> {
    logger.info(`Executing tool: ${tool.name}`, 'EnhancedAIService', tool.args);
    
    // Here you would implement the actual tool execution
    // For now, returning mock responses
    switch (tool.name) {
      case 'create_tasks':
        return { success: true, tasks: tool.args.tasks };
      
      case 'plan_week':
        return { 
          success: true, 
          schedule: [
            { day: 'Monday', time: '14:00-16:00', subject: 'Math' },
            { day: 'Wednesday', time: '14:00-16:00', subject: 'Math' },
            { day: 'Friday', time: '14:00-16:00', subject: 'Math' }
          ]
        };
      
      case 'make_quiz':
        return {
          success: true,
          quiz: {
            id: crypto.randomUUID(),
            questions: Array(tool.args.numQuestions || 5).fill(null).map((_, i) => ({
              id: crypto.randomUUID(),
              question: `Question ${i + 1} about ${tool.args.topic}`,
              type: tool.args.questionType || 'mixed',
              choices: tool.args.questionType === 'mcq' ? ['A', 'B', 'C', 'D'] : undefined
            }))
          }
        };
      
      case 'grade_answer':
        return {
          success: true,
          grade: {
            correct: Math.random() > 0.3,
            feedback: 'Good attempt! Here\'s how to improve...',
            score: Math.floor(Math.random() * 100)
          }
        };
      
      case 'summarize_notes':
        return {
          success: true,
          summary: `Summary of ${tool.args.topic}: Key concepts include...`
        };
      
      case 'schedule_session':
        return {
          success: true,
          session: {
            id: crypto.randomUUID(),
            ...tool.args
          }
        };
      
      default:
        return { success: false, error: 'Unknown tool' };
    }
  }

  private buildSystemPrompt(subject: string): string {
    return `You are an expert tutor helping a student with ${subject}.
You are focused, helpful, and adaptive. Your constraints:
- Keep steps concrete and time-boxed
- Prefer spaced repetition; schedule short sessions
- If the user is overwhelmed, shrink scope and propose a 25-min focus block
- Keep answers structured, add 1 actionable next step
- Never write full essays for graded assignments; coach instead
- Use bullets over walls of text
- Include estimated minutes for tasks
- End with "Next move:" and a specific action

When using tools:
- Use create_tasks to break down study goals into manageable tasks
- Use plan_week to create structured study schedules
- Use make_quiz to test understanding
- Use grade_answer to provide feedback on quiz responses
- Use summarize_notes to review key concepts
- Use schedule_session to book study time`;
  }

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
            tool_calls: assistantMessage.tool_calls ? JSON.stringify(assistantMessage.tool_calls) : null,
            created_at: assistantMessage.timestamp.toISOString()
          }
        ]);
    } catch (error) {
      logger.error('Error saving messages', 'EnhancedAIService', error);
    }
  }

  getSession(sessionId: string): AISession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessions(): AISession[] {
    return Array.from(this.sessions.values());
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      this.sessions.delete(sessionId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('ai_tutor_sessions')
          .update({ is_archived: true })
          .eq('id', sessionId)
          .eq('user_id', user.id);
      }
      
      return true;
    } catch (error) {
      logger.error('Error deleting session', 'EnhancedAIService', error);
      return !this.sessions.has(sessionId);
    }
  }

  async loadSessions(): Promise<AISession[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: sessions } = await supabase
        .from('ai_tutor_sessions')
        .select('*, ai_tutor_messages(*)')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
        .limit(10);

      const loadedSessions = (sessions || []).map(session => {
        const aiSession: AISession = {
          id: session.id,
          subject: session.subject || session.subject_name,
          messages: (session.ai_tutor_messages || []).map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
            tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls) : undefined
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
      logger.error('Error loading sessions', 'EnhancedAIService', error);
      return [];
    }
  }
}

export const enhancedAIService = new EnhancedAIService();
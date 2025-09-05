/**
 * DeepSeek Service - Direct API Handler
 * Unified service for all DeepSeek AI interactions with streaming, error handling, and essential features
 */

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekStreamChunk {
  type: 'reasoning' | 'content' | 'done' | 'error';
  content?: string;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepSeekQuote {
  quote: string;
  author?: string;
}

export interface DeepSeekStreamOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  abortSignal?: AbortSignal;
  stream?: boolean;
  mode?: 'reasoning' | 'chat' | 'structured';
  priority?: 'low' | 'normal' | 'high';
}

export interface DeepSeekResponse {
  id: string;
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
  timestamp: Date;
}

export interface AISession {
  id: string;
  subject: string;
  messages: DeepSeekMessage[];
  createdAt: Date;
  lastActive: Date;
  provider: 'deepseek';
}

export interface DeepSeekServiceConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: string;
  timeout?: number;
  maxRetries?: number;
}

export class DeepSeekClient {
  private baseURL = 'https://api.deepseek.com/v1';
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config?: DeepSeekServiceConfig) {
    this.apiKey = config?.apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    this.baseURL = config?.baseURL || 'https://api.deepseek.com/v1';
    this.timeout = config?.timeout || 30000;
    this.maxRetries = config?.maxRetries || 3;
    
    if (!this.apiKey) {
      console.warn('DeepSeek API key not configured');
    }
  }

  async complete(prompt: string, options: DeepSeekStreamOptions = {}): Promise<DeepSeekResponse> {
    const messages: DeepSeekMessage[] = [{ role: 'user', content: prompt }];
    return this.sendMessage(messages, options);
  }

  async sendMessage(messages: DeepSeekMessage[], options: DeepSeekStreamOptions = {}): Promise<DeepSeekResponse> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(messages, options);
        const data = await response.json();
        
        return {
          id: data.id || `msg_${Date.now()}`,
          content: data.choices[0]?.message?.content || 'No response generated',
          usage: data.usage,
          model: data.model || options.model || 'deepseek-chat',
          timestamp: new Date()
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.maxRetries) {
          console.error(`DeepSeek request failed after ${this.maxRetries} attempts:`, lastError);
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Failed to generate response');
  }

  private async makeRequest(messages: DeepSeekMessage[], options: DeepSeekStreamOptions): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);
    
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || 'deepseek-chat',
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: false
        }),
        signal: options.abortSignal || controller.signal
      });

      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

class DeepSeekService {
  private baseURL = 'https://api.deepseek.com/v1';
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private sessions: Map<string, AISession> = new Map();

  constructor(config?: DeepSeekServiceConfig) {
    this.apiKey = config?.apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    this.baseURL = config?.baseURL || 'https://api.deepseek.com/v1';
    this.timeout = config?.timeout || 30000;
    this.maxRetries = config?.maxRetries || 3;
    
    if (!this.apiKey) {
      console.warn('DeepSeek API key not configured');
    }
  }

  async *streamChatCompletion(
    messages: DeepSeekMessage[],
    options: DeepSeekStreamOptions = {}
  ): AsyncGenerator<DeepSeekStreamChunk, void, unknown> {
    if (!this.apiKey) {
      yield { type: 'error', error: 'DeepSeek API key not configured' };
      return;
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: options.model || 'deepseek-chat',
          messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: true
        }),
        signal: options.abortSignal
      });

      if (!response.ok) {
        yield { type: 'error', error: `DeepSeek API error: ${response.status}` };
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        yield { type: 'error', error: 'No response body' };
        return;
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
                  yield { type: 'done', usage: parsed.usage };
                }
              } catch (parseError) {
                // Skip malformed JSON
                continue;
              }
            }
          }
        }

        yield { type: 'done' };
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Request was cancelled
      }
      yield { type: 'error', error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Session Management
  createSession(subject: string = 'General'): AISession {
    const session: AISession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      subject,
      messages: [],
      createdAt: new Date(),
      lastActive: new Date(),
      provider: 'deepseek'
    };
    
    this.sessions.set(session.id, session);
    return session;
  }

  getSession(sessionId: string): AISession | null {
    return this.sessions.get(sessionId) || null;
  }

  getSessions(): AISession[] {
    return Array.from(this.sessions.values()).sort((a, b) => 
      b.lastActive.getTime() - a.lastActive.getTime()
    );
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  // Enhanced messaging with session support
  async sendMessageToSession(
    sessionId: string, 
    message: string, 
    options: DeepSeekStreamOptions = {}
  ): Promise<DeepSeekResponse> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add user message to session
    const userMessage: DeepSeekMessage = { role: 'user', content: message };
    session.messages.push(userMessage);
    session.lastActive = new Date();

    try {
      // Get response from DeepSeek
      const response = await this.sendMessage(session.messages, options);
      
      // Add assistant response to session
      const assistantMessage: DeepSeekMessage = { role: 'assistant', content: response.content };
      session.messages.push(assistantMessage);
      
      return response;
    } catch (error) {
      // Remove user message on error to maintain session integrity
      session.messages.pop();
      throw error;
    }
  }

  async sendMessage(messages: DeepSeekMessage[], options: DeepSeekStreamOptions = {}): Promise<DeepSeekResponse> {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: options.model || 'deepseek-chat',
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 1000,
            stream: false
          }),
          signal: options.abortSignal || controller.signal
        });

        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        return {
          id: data.id || `msg_${Date.now()}`,
          content: data.choices[0]?.message?.content || 'No response generated',
          usage: data.usage,
          model: data.model || options.model || 'deepseek-chat',
          timestamp: new Date()
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === this.maxRetries) {
          console.error(`DeepSeek request failed after ${this.maxRetries} attempts:`, lastError);
          break;
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error('Failed to generate response');
  }

  async fetchQuote(): Promise<DeepSeekQuote | null> {
    // Simple inspirational quotes for study sessions
    const quotes = [
      { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { quote: "Learning never exhausts the mind.", author: "Leonardo da Vinci" },
      { quote: "The more that you read, the more things you will know.", author: "Dr. Seuss" },
      { quote: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela" },
      { quote: "The expert in anything was once a beginner.", author: "Helen Hayes" }
    ];
    
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    return randomQuote;
  }

  // Service management
  getMetrics() {
    return {
      totalSessions: this.sessions.size,
      activeSessions: Array.from(this.sessions.values()).filter(
        s => Date.now() - s.lastActive.getTime() < 24 * 60 * 60 * 1000 // 24 hours
      ).length,
      totalMessages: Array.from(this.sessions.values())
        .reduce((sum, s) => sum + s.messages.length, 0)
    };
  }

  reset(): void {
    this.sessions.clear();
  }

  healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    return {
      status: this.apiKey ? 'healthy' : 'unhealthy',
      details: {
        hasApiKey: !!this.apiKey,
        baseURL: this.baseURL,
        timeout: this.timeout,
        maxRetries: this.maxRetries,
        metrics: this.getMetrics()
      }
    };
  }
}

export const deepSeekService = new DeepSeekService();
/**
 * DeepSeek LLM Client
 * Uses OpenAI-compatible API for DeepSeek integration
 */

import { LLMConfig, LLMResponse, ChatMessage } from './types';

export class DeepSeekClient {
  private apiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1';
  private model: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    this.model = config.model || import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
    
    if (!this.apiKey) {
      throw new Error('DeepSeek API key is required');
    }
  }

  async chat(messages: ChatMessage[]): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 2000,
          stream: false
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${error}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: data.usage
      };
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw error;
    }
  }

  async stream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          temperature: 0.7,
          max_tokens: 2000,
          stream: true
        }),
        signal
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`DeepSeek API error: ${error}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Skip parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream aborted');
        return;
      }
      console.error('DeepSeek streaming error:', error);
      throw error;
    }
  }

  async complete(prompt: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];
    const response = await this.chat(messages);
    return response.content;
  }

  /**
   * Get available DeepSeek models
   */
  static getAvailableModels() {
    return [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'General-purpose conversational model' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Advanced reasoning and problem-solving model' }
    ];
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(): Promise<boolean> {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Say "hello" in one word.' }
      ]);
      return !!response.content;
    } catch (error) {
      console.error('API key validation failed:', error);
      return false;
    }
  }
}

export default DeepSeekClient;
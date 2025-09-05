/**
 * DeepSeek LLM Client
 * Legacy client for backward compatibility with existing components
 */

import { LLMClient, LLMConfig, LLMResponse } from './types';

export interface DeepSeekConfig extends LLMConfig {
  model?: string;
  temperature?: number;
}

export class DeepSeekClient implements LLMClient {
  private config: DeepSeekConfig;
  private baseURL = 'https://api.deepseek.com/v1';

  constructor(config: DeepSeekConfig = {}) {
    this.config = {
      apiKey: config.apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '',
      model: config.model || 'deepseek-chat',
      temperature: config.temperature || 0.7,
      ...config
    };

    if (!this.config.apiKey) {
      console.warn('DeepSeek API key not provided');
    }
  }

  async complete(prompt: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: this.config.temperature,
          max_tokens: 150
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('DeepSeek completion error:', error);
      throw new Error('Failed to generate response');
    }
  }

  async chat(messages: Array<{ role: string; content: string }>): Promise<LLMResponse> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature: this.config.temperature,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0]?.message?.content || 'No response generated',
        usage: data.usage,
        model: this.config.model || 'deepseek-chat',
        provider: 'deepseek'
      };
    } catch (error) {
      console.error('DeepSeek chat error:', error);
      throw new Error('Failed to generate chat response');
    }
  }
}

export default DeepSeekClient;
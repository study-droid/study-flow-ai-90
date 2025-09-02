import { LLMAdapter, LLMConfig } from './types';
import { OpenAIAdapter } from './openai';
import { GeminiAdapter } from './gemini';
import { ClaudeAdapter } from './claude';
import DeepSeekClient from './deepseek';

export * from './types';

class LLMFactory {
  private static instance: LLMFactory;
  private adapters: Map<string, LLMAdapter> = new Map();
  private currentProvider: string;

  private constructor() {
    this.currentProvider = this.getProviderFromEnv();
    this.initializeAdapters();
  }

  static getInstance(): LLMFactory {
    if (!LLMFactory.instance) {
      LLMFactory.instance = new LLMFactory();
    }
    return LLMFactory.instance;
  }

  private getProviderFromEnv(): string {
    // Check multiple possible env var names
    const provider = 
      import.meta.env.VITE_MODEL_PROVIDER ||
      import.meta.env.VITE_LLM_PROVIDER ||
      import.meta.env.MODEL_PROVIDER ||
      'deepseek'; // Default to DeepSeek
    
    return provider.toLowerCase();
  }

  private initializeAdapters() {
    // Initialize OpenAI adapter
    this.adapters.set('openai', new OpenAIAdapter({
      provider: 'openai',
      apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      model: import.meta.env.VITE_OPENAI_MODEL,
    }));

    // Initialize Gemini adapter
    this.adapters.set('gemini', new GeminiAdapter({
      provider: 'gemini',
      apiKey: import.meta.env.VITE_GEMINI_API_KEY,
      model: import.meta.env.VITE_GEMINI_MODEL,
    }));

    // Initialize Claude adapter
    this.adapters.set('claude', new ClaudeAdapter({
      provider: 'claude',
      apiKey: import.meta.env.VITE_CLAUDE_API_KEY,
      model: import.meta.env.VITE_CLAUDE_MODEL,
    }));

    // Initialize DeepSeek adapter (OpenAI-compatible)
    const deepseekClient = new DeepSeekClient({
      provider: 'deepseek',
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
      model: import.meta.env.VITE_DEEPSEEK_MODEL,
    });
    
    // Create adapter wrapper for DeepSeek
    this.adapters.set('deepseek', {
      async sendMessage(message: string): Promise<string> {
        return deepseekClient.complete(message);
      },
      async isAvailable(): Promise<boolean> {
        return deepseekClient.validateApiKey();
      },
      getModelName(): string {
        return import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
      }
    });
  }

  getLLM(provider?: string): LLMAdapter {
    const targetProvider = provider || this.currentProvider;
    const adapter = this.adapters.get(targetProvider);
    
    if (!adapter) {
      console.warn(`Provider ${targetProvider} not found, falling back to DeepSeek`);
      return this.adapters.get('deepseek') || this.adapters.get('gemini')!;
    }
    
    return adapter;
  }

  async getAvailableProviders(): Promise<Array<{
    name: string;
    value: string;
    available: boolean;
    model: string;
    current: boolean;
  }>> {
    const providers = [
      { name: 'DeepSeek', value: 'deepseek' },
      { name: 'OpenAI', value: 'openai' },
      { name: 'Gemini', value: 'gemini' },
      { name: 'Claude', value: 'claude' },
    ];

    const results = await Promise.all(
      providers.map(async (provider) => {
        const adapter = this.adapters.get(provider.value);
        const available = adapter ? await adapter.isAvailable() : false;
        const model = adapter ? adapter.getModelName() : 'Not configured';
        
        return {
          ...provider,
          available,
          model,
          current: provider.value === this.currentProvider,
        };
      })
    );

    return results;
  }

  setProvider(provider: string) {
    if (this.adapters.has(provider)) {
      this.currentProvider = provider;
    } else {
      throw new Error(`Provider ${provider} is not available`);
    }
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }
}

// Export singleton instance and helper function
const factory = LLMFactory.getInstance();

export function getLLM(provider?: string): LLMAdapter {
  return factory.getLLM(provider);
}

export function getAvailableProviders() {
  return factory.getAvailableProviders();
}

export function setLLMProvider(provider: string) {
  factory.setProvider(provider);
}

export function getCurrentProvider(): string {
  return factory.getCurrentProvider();
}
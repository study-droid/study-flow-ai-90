/**
 * AI Tutor Configuration (DeepSeek v3.1)
 * Centralized configuration for the AI Tutor system using DeepSeek v3.1 non-thinking mode
 */

export const aiTutorConfig = {
  ai: {
    apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
    baseURL: import.meta.env.VITE_DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    models: {
      chat: 'deepseek-chat', // DeepSeek v3.1 non-thinking mode
      primary: 'deepseek-chat', // Default model for AI Tutor
      code: 'deepseek-coder',
    },
    endpoints: {
      chat: 'https://api.deepseek.com/v1',
      primary: 'https://api.deepseek.com/v1',
    },
    timeout: 30000, // 30 seconds for standard chat responses
    retries: 3,
    version: '3.1',
    
    // DeepSeek v3.1 specific configuration
    v31: {
      contextWindow: 128000, // 128K tokens
      supportedFormats: ['text', 'json', 'markdown'],
      capabilities: [
        'conversation',
        'code_assistance', 
        'educational_tutoring',
        'mathematical_reasoning',
        'creative_writing'
      ],
      defaultParameters: {
        temperature: 0.7,
        maxTokens: 4000,
        topP: 1.0,
        stream: false
      }
    },
  },

  pipeline: {
    enableValidation: true,
    enableCaching: true,
    enableEnhancements: true,
    qualityThreshold: 0.8,
  },

  cache: {
    memory: {
      max: 500,
      ttl: 1000 * 60 * 5, // 5 minutes
    },
    semantic: {
      threshold: 0.95,
      maxEntries: 1000,
    },
    persistent: {
      ttl: 1000 * 60 * 60 * 24, // 24 hours
      storage: 'localStorage' as const,
    },
  },

  monitoring: {
    enabled: true,
    sampleRate: 1.0,
    metrics: ['latency', 'quality', 'usage', 'errors'],
    
    // v3.1 performance thresholds
    thresholds: {
      responseTime: 30000, // 30 seconds max
      tokenUsage: 4000, // Max tokens per request
      qualityScore: 0.7, // Minimum quality threshold
    },
    retention: {
      metrics: 7 * 24 * 60 * 60 * 1000, // 7 days
      logs: 24 * 60 * 60 * 1000, // 24 hours
    }
  },

  ui: {
    streaming: true,
    autoScroll: true,
    showMetrics: false,
    theme: 'auto' as const,
    animations: true,
  },

  defaults: {
    temperature: 0.7,
    maxTokens: 4000, // Increased for v3.1 capabilities
    difficulty: 'intermediate' as const,
    mode: 'chat' as const, // v3.1 non-thinking mode
    model: 'deepseek-chat' as const,
  },
} as const;

export type AITutorConfig = typeof aiTutorConfig;
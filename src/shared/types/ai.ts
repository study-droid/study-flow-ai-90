/**
 * AI and tutoring-related types
 */

import { BaseEntity } from './common';

export interface AITutorSession extends BaseEntity {
  userId: string;
  title: string;
  subject?: string;
  studyGoal?: string;
  messages: AIMessage[];
  metadata: AISessionMetadata;
  status: AISessionStatus;
}

export interface AIMessage extends BaseEntity {
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata: AIMessageMetadata;
  attachments?: AIMessageAttachment[];
}

export interface AIMessageMetadata {
  provider?: AIProvider;
  model?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latency?: number;
  cached?: boolean;
  optimized?: boolean;
  qualityScore?: number;
  structured?: StructuredResponse;
  responseType?: AIResponseType;
  error?: AIError;
}

export interface AISessionMetadata {
  provider: AIProvider;
  model: string;
  totalTokens: number;
  totalMessages: number;
  averageLatency: number;
  qualityScore: number;
  progressScore?: number;
  totalTime: number;
  lastActive: Date;
}

export type AIProvider = 'deepseek' | 'openai' | 'anthropic' | 'google' | 'local';

export type AISessionStatus = 'active' | 'paused' | 'completed' | 'archived';

export type AIResponseType = 
  | 'explanation'
  | 'study_plan' 
  | 'practice'
  | 'concept_analysis'
  | 'chat'
  | 'quiz'
  | 'summary';

export interface StructuredResponse {
  type: AIResponseType;
  content: any; // Varies by response type
  confidence: number;
  sources?: string[];
  relatedConcepts?: string[];
  difficulty?: number;
  estimatedTime?: number;
}

export interface AIError {
  code: string;
  message: string;
  type: 'network' | 'authentication' | 'rate_limit' | 'timeout' | 'server' | 'validation';
  retryable: boolean;
  details?: any;
}

export interface AIMessageAttachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'code' | 'link';
  url: string;
  metadata?: any;
}

export interface AITutorConfig {
  provider: AIProvider;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  enableStructuredOutput: boolean;
  enableCaching: boolean;
  rateLimitPerMinute: number;
}

export interface AICapabilities {
  textGeneration: boolean;
  imageAnalysis: boolean;
  codeGeneration: boolean;
  mathSolving: boolean;
  languageTranslation: boolean;
  summarization: boolean;
  questionAnswering: boolean;
  tutoring: boolean;
}

export interface AIUsageStats {
  totalRequests: number;
  totalTokens: number;
  averageLatency: number;
  errorRate: number;
  cacheHitRate: number;
  costEstimate: number;
  dailyUsage: DailyAIUsage[];
}

export interface DailyAIUsage {
  date: Date;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
}
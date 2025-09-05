/**
 * AI Tutor Core Types
 * Brand-neutral types for the AI tutoring system
 */

export type AIResponseType =
  | 'explanation'
  | 'code'
  | 'reasoning'
  | 'creative'
  | 'structured'
  | 'study_plan'
  | 'practice'
  | 'quiz'
  | 'concept_map';

// Legacy alias for backward compatibility
export type ResponseType = AIResponseType;

export type AIModel = 
  | 'reasoning'
  | 'chat'
  | 'code'
  | 'creative';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export type PriorityLevel = 'low' | 'normal' | 'high';

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  task: string;
  audience?: string;
  tone?: string;
  responseType?: AIResponseType;
  subject?: string;
  difficulty?: DifficultyLevel;
}

export interface AIModelConfig {
  model: AIModel;
  temperature: number;
  maxTokens: number;
  topP: number;
  jsonMode: boolean;
}

export interface PipelineContext {
  id: string;
  nowISO: string;
  userPrefs?: Record<string, unknown>;
  history: AIMessage[];
  request: AIRequest;
  cacheKey?: string;
  cached?: RequiredResponseStructure;
  modelConfig: AIModelConfig;
  rawModelOutput?: string;
  structured?: RequiredResponseStructure;
  markdown?: string;
  quality?: {
    overall: number; // 0..1
    breakdown: Record<string, number>;
  };
  tokenUsage?: TokenUsage;
  processingMetadata?: ProcessingMetadata;
}

export interface StructuredAnswer {
  title: string;
  tldr: string;
  sections: Array<{
    heading: string;
    body: string;
    code?: Array<{ language: string; content: string; caption?: string }>;
  }>;
  references?: Array<{ label: string; url: string }>;
}

export interface ResponseStructure {
  headers: Array<{ text: string; level: number; hasEmoji: boolean }>;
  sections: Array<{ title: string; wordCount: number; hasSubsections: boolean }>;
  lists?: Array<{ type: 'ordered' | 'unordered'; items: string[]; nested: boolean }>;
  tables?: Array<{ columnCount: number; rows: any[]; isValid: boolean }>;
  codeBlocks?: Array<{ language: string; isValid: boolean }>;
}

export interface QualityAssessment {
  overallScore: number; // 0-100
  breakdown: {
    structure: number;
    consistency: number;
    formatting: number;
    completeness: number;
    educational: number;
  };
  recommendations: string[];
}

export interface ProcessingMetadata {
  processingTime: number;
  stepsCompleted: string[];
  warnings: string[];
  optimizations: string[];
}

export interface ValidationResult {
  isValid: boolean;
  score: number;
  errors?: string[];
}

export interface EducationalValidation {
  isValid: boolean;
  score: number;
  failedChecks?: string[];
}

export interface RequiredResponseStructure {
  formattedResponse: {
    content: string; // final Markdown
    metadata?: {
      responseType?: AIResponseType;
      timeEstimate?: string;
      difficulty?: DifficultyLevel;
      totalHours?: number;
      weeklyGoals?: string[];
      estimatedReadTime?: number;
    };
    structure: ResponseStructure;
  };
  qualityAssessment: QualityAssessment;
  processingMetadata: ProcessingMetadata;
  validationResult?: ValidationResult;
  educationalValidation?: EducationalValidation;
}

export interface AISession {
  id: string;
  subject: string;
  messages: AIMessage[];
  createdAt: Date;
  lastActive: Date;
  provider: 'ai_tutor';
}

export interface AIResponse {
  id: string;
  content: string;
  usage?: TokenUsage;
  model: string;
  timestamp: Date;
}

export interface AIStreamChunk {
  type: 'reasoning' | 'content' | 'done' | 'error';
  content?: string;
  error?: string;
  usage?: TokenUsage;
}

export interface AIOptions {
  model?: AIModel;
  temperature?: number;
  max_tokens?: number;
  abortSignal?: AbortSignal;
  stream?: boolean;
  mode?: 'reasoning' | 'chat' | 'structured';
  priority?: PriorityLevel;
}

export interface AIServiceConfig {
  apiKey?: string;
  baseURL?: string;
  defaultModel?: AIModel;
  timeout?: number;
  maxRetries?: number;
}
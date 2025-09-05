/**
 * AI Tutor Validation Schemas
 * Comprehensive Zod validation for all AI Tutor response types with safe defaults
 */

import { z } from 'zod';
import type {
  AIResponseType,
  AIModel,
  DifficultyLevel,
  PriorityLevel,
  TokenUsage,
  AIMessage,
  AIRequest,
  AIModelConfig,
  PipelineContext,
  StructuredAnswer,
  ResponseStructure,
  QualityAssessment,
  ProcessingMetadata,
  ValidationResult,
  EducationalValidation,
  RequiredResponseStructure,
  AISession,
  AIResponse,
  AIStreamChunk,
  AIOptions,
  AIServiceConfig
} from './ai-tutor';

// Base schemas
export const AIResponseTypeSchema = z.enum([
  'explanation',
  'code',
  'reasoning',
  'creative',
  'structured',
  'study_plan',
  'practice',
  'quiz',
  'concept_map'
]);

export const AIModelSchema = z.enum(['reasoning', 'chat', 'code', 'creative']);

export const DifficultyLevelSchema = z.enum(['easy', 'medium', 'hard']);

export const PriorityLevelSchema = z.enum(['low', 'normal', 'high']);

// Complex object schemas
export const TokenUsageSchema = z.object({
  promptTokens: z.number().int().min(0).default(0),
  completionTokens: z.number().int().min(0).default(0),
  totalTokens: z.number().int().min(0).default(0)
});

export const AIMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1)
});

export const AIRequestSchema = z.object({
  task: z.string().min(1),
  audience: z.string().optional(),
  tone: z.string().optional(),
  responseType: AIResponseTypeSchema.optional(),
  subject: z.string().optional(),
  difficulty: DifficultyLevelSchema.optional()
});

export const AIModelConfigSchema = z.object({
  model: AIModelSchema,
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().default(4000),
  topP: z.number().min(0).max(1).default(1),
  jsonMode: z.boolean().default(false)
});

export const CodeBlockSchema = z.object({
  language: z.string().default('text'),
  content: z.string(),
  caption: z.string().optional()
});

export const StructuredAnswerSchema = z.object({
  title: z.string().min(1).default('AI Tutor Response'),
  tldr: z.string().min(1).default('No summary available'),
  sections: z.array(z.object({
    heading: z.string().min(1),
    body: z.string().min(1),
    code: z.array(CodeBlockSchema).optional()
  })).default([]),
  references: z.array(z.object({
    label: z.string().min(1),
    url: z.string().url()
  })).optional()
});

export const ResponseStructureSchema = z.object({
  headers: z.array(z.object({
    text: z.string().min(1),
    level: z.number().int().min(1).max(6).default(1),
    hasEmoji: z.boolean().default(false)
  })).default([]),
  sections: z.array(z.object({
    title: z.string().min(1),
    wordCount: z.number().int().min(0).default(0),
    hasSubsections: z.boolean().default(false)
  })).default([]),
  lists: z.array(z.object({
    type: z.enum(['ordered', 'unordered']),
    items: z.array(z.string()),
    nested: z.boolean().default(false)
  })).optional(),
  tables: z.array(z.object({
    columnCount: z.number().int().min(1),
    rows: z.array(z.any()),
    isValid: z.boolean().default(true)
  })).optional(),
  codeBlocks: z.array(z.object({
    language: z.string().default('text'),
    isValid: z.boolean().default(true)
  })).optional()
});

export const QualityAssessmentSchema = z.object({
  overallScore: z.number().min(0).max(100).default(75),
  breakdown: z.object({
    structure: z.number().min(0).max(100).default(75),
    consistency: z.number().min(0).max(100).default(75),
    formatting: z.number().min(0).max(100).default(75),
    completeness: z.number().min(0).max(100).default(75),
    educational: z.number().min(0).max(100).default(75)
  }),
  recommendations: z.array(z.string()).default([])
});

export const ProcessingMetadataSchema = z.object({
  processingTime: z.number().min(0).default(0),
  stepsCompleted: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  optimizations: z.array(z.string()).default([])
});

export const ValidationResultSchema = z.object({
  isValid: z.boolean().default(true),
  score: z.number().min(0).max(100).default(100),
  errors: z.array(z.string()).optional()
});

export const EducationalValidationSchema = z.object({
  isValid: z.boolean().default(true),
  score: z.number().min(0).max(100).default(100),
  failedChecks: z.array(z.string()).optional()
});

// Main response structure schema
export const RequiredResponseStructureSchema = z.object({
  formattedResponse: z.object({
    content: z.string().min(1).default('Response content not available'),
    metadata: z.object({
      responseType: AIResponseTypeSchema.optional(),
      timeEstimate: z.string().optional(),
      difficulty: DifficultyLevelSchema.optional(),
      totalHours: z.number().min(0).optional(),
      weeklyGoals: z.array(z.string()).optional(),
      estimatedReadTime: z.number().int().min(0).optional()
    }).optional(),
    structure: ResponseStructureSchema
  }),
  qualityAssessment: QualityAssessmentSchema,
  processingMetadata: ProcessingMetadataSchema,
  validationResult: ValidationResultSchema.optional(),
  educationalValidation: EducationalValidationSchema.optional()
});

export const PipelineContextSchema = z.object({
  id: z.string().uuid(),
  nowISO: z.string().datetime(),
  userPrefs: z.record(z.unknown()).optional(),
  history: z.array(AIMessageSchema).default([]),
  request: AIRequestSchema,
  cacheKey: z.string().optional(),
  cached: RequiredResponseStructureSchema.optional(),
  modelConfig: AIModelConfigSchema,
  rawModelOutput: z.string().optional(),
  structured: RequiredResponseStructureSchema.optional(),
  markdown: z.string().optional(),
  quality: z.object({
    overall: z.number().min(0).max(1).default(0.75),
    breakdown: z.record(z.number().min(0).max(1))
  }).optional(),
  tokenUsage: TokenUsageSchema.optional()
});

export const AISessionSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().min(1),
  messages: z.array(AIMessageSchema).default([]),
  createdAt: z.date(),
  lastActive: z.date(),
  provider: z.literal('ai_tutor')
});

export const AIResponseSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1),
  usage: TokenUsageSchema.optional(),
  model: z.string().min(1),
  timestamp: z.date()
});

export const AIStreamChunkSchema = z.object({
  type: z.enum(['reasoning', 'content', 'done', 'error']),
  content: z.string().optional(),
  error: z.string().optional(),
  usage: TokenUsageSchema.optional()
});

export const AIOptionsSchema = z.object({
  model: AIModelSchema.optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
  abortSignal: z.any().optional(), // AbortSignal can't be validated with Zod
  stream: z.boolean().optional(),
  mode: z.enum(['reasoning', 'chat', 'structured']).optional(),
  priority: PriorityLevelSchema.optional()
});

export const AIServiceConfigSchema = z.object({
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  defaultModel: AIModelSchema.optional(),
  timeout: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional()
});

/**
 * Creates safe default values for RequiredResponseStructure
 */
export function createSafeDefaults(): RequiredResponseStructure {
  return {
    formattedResponse: {
      content: "I apologize, but I'm unable to provide a proper response at this time. Please try again.",
      metadata: {
        responseType: 'explanation',
        difficulty: 'medium',
        estimatedReadTime: 1
      },
      structure: {
        headers: [{
          text: 'AI Tutor Response',
          level: 1,
          hasEmoji: false
        }],
        sections: [{
          title: 'Response Content',
          wordCount: 20,
          hasSubsections: false
        }]
      }
    },
    qualityAssessment: {
      overallScore: 50,
      breakdown: {
        structure: 50,
        consistency: 50,
        formatting: 50,
        completeness: 30,
        educational: 40
      },
      recommendations: ['Response generation failed - using safe defaults']
    },
    processingMetadata: {
      processingTime: 0,
      stepsCompleted: ['safe_defaults'],
      warnings: ['Failed to generate proper response'],
      optimizations: []
    },
    validationResult: {
      isValid: false,
      score: 0,
      errors: ['Using safe fallback response']
    }
  };
}

/**
 * Validates and sanitizes AI Tutor response with safe fallbacks
 */
export function validateResponse(data: unknown): RequiredResponseStructure {
  try {
    const result = RequiredResponseStructureSchema.safeParse(data);
    
    if (result.success) {
      return result.data;
    }
    
    console.warn('AI Tutor response validation failed:', result.error.issues);
    return createSafeDefaults();
  } catch (error) {
    console.error('Critical validation error:', error);
    return createSafeDefaults();
  }
}

/**
 * Validates pipeline context with safe fallbacks
 */
export function validatePipelineContext(data: unknown): PipelineContext | null {
  try {
    const result = PipelineContextSchema.safeParse(data);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Pipeline context validation error:', error);
    return null;
  }
}

/**
 * Validates AI session data
 */
export function validateSession(data: unknown): AISession | null {
  try {
    const result = AISessionSchema.safeParse(data);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Validates streaming chunk data
 */
export function validateStreamChunk(data: unknown): AIStreamChunk | null {
  try {
    const result = AIStreamChunkSchema.safeParse(data);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Stream chunk validation error:', error);
    return null;
  }
}

/**
 * Validates token usage with safe defaults
 */
export function validateTokenUsage(data: unknown): TokenUsage {
  try {
    const result = TokenUsageSchema.safeParse(data);
    return result.success ? result.data : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  } catch (error) {
    console.error('Token usage validation error:', error);
    return { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  }
}

/**
 * Validates AI options with safe defaults
 */
export function validateAIOptions(data: unknown): Partial<AIOptions> {
  try {
    const result = AIOptionsSchema.safeParse(data);
    return result.success ? result.data : {};
  } catch (error) {
    console.error('AI options validation error:', error);
    return {};
  }
}

/**
 * Creates a minimal valid response structure for error cases
 */
export function createErrorResponse(errorMessage: string): RequiredResponseStructure {
  return {
    formattedResponse: {
      content: `**Error**: ${errorMessage}\n\nI apologize for the inconvenience. Please try rephrasing your question or contact support if the issue persists.`,
      metadata: {
        responseType: 'explanation',
        difficulty: 'easy',
        estimatedReadTime: 1
      },
      structure: {
        headers: [{
          text: 'Error Response',
          level: 1,
          hasEmoji: false
        }],
        sections: [{
          title: 'Error Information',
          wordCount: errorMessage.split(' ').length + 20,
          hasSubsections: false
        }]
      }
    },
    qualityAssessment: {
      overallScore: 20,
      breakdown: {
        structure: 60,
        consistency: 60,
        formatting: 70,
        completeness: 10,
        educational: 0
      },
      recommendations: ['Error occurred during response generation']
    },
    processingMetadata: {
      processingTime: 0,
      stepsCompleted: ['error_handling'],
      warnings: [errorMessage],
      optimizations: []
    },
    validationResult: {
      isValid: false,
      score: 0,
      errors: [errorMessage]
    }
  };
}

/**
 * Type guard for checking if data is a valid RequiredResponseStructure
 */
export function isValidResponse(data: unknown): data is RequiredResponseStructure {
  return RequiredResponseStructureSchema.safeParse(data).success;
}

/**
 * Type guard for checking if data is a valid AI message
 */
export function isValidMessage(data: unknown): data is AIMessage {
  return AIMessageSchema.safeParse(data).success;
}

/**
 * Generic validation function with defaults
 */
export function validateWithDefaults<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return result.data;
    }
    
    console.warn('Validation failed, using defaults:', result.error.issues);
    // Try parsing with defaults by passing empty object
    const defaultResult = schema.safeParse({});
    
    if (defaultResult.success) {
      return defaultResult.data;
    }
    
    throw new Error('Schema has no valid defaults');
  } catch (error) {
    console.error('Critical validation error:', error);
    throw error;
  }
}

/**
 * Validation helpers export
 */
export const ValidationHelpers = {
  validateResponse,
  validatePipelineContext,
  validateSession,
  validateStreamChunk,
  validateTokenUsage,
  validateAIOptions,
  createSafeDefaults,
  createErrorResponse,
  isValidResponse,
  isValidMessage,
  validateWithDefaults
} as const;
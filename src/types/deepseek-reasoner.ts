/**
 * DeepSeek Reasoner v3.1 Type Definitions
 * Extends existing AI tutor types with reasoning capabilities
 */

import type { 
  AIMessage, 
  AIModelConfig, 
  TokenUsage,
  AIStreamChunk,
  ProcessingMetadata 
} from './ai-tutor';

// Core Reasoner Types
export type DeepSeekReasonerModel = 
  | 'deepseek-reasoner'
  | 'deepseek-chat' 
  | 'deepseek-coder'
  | 'deepseek-reasoner-beta';

export type ReasoningEffort = 'low' | 'medium' | 'high' | 'maximum';

export type ReasoningStepType = 'analysis' | 'synthesis' | 'evaluation' | 'conclusion';

// Extended Interfaces
export interface DeepSeekReasonerModelConfig extends AIModelConfig {
  model: DeepSeekReasonerModel;
  reasoningEffort?: ReasoningEffort;
  enableReasoningTrace?: boolean;
  maxReasoningSteps?: number;
}

export interface ReasoningStep {
  step: number;
  type: ReasoningStepType;
  content: string;
  confidence: number;
  timestamp: string;
  duration?: number;
  metadata?: {
    keyInsights?: string[];
    evidenceUsed?: string[];
    assumptionsMade?: string[];
  };
}

export interface ReasoningTrace {
  steps: ReasoningStep[];
  totalSteps: number;
  qualityScore: number;
  averageConfidence: number;
  processingTime: number;
  metadata: {
    complexityLevel: 'low' | 'medium' | 'high';
    reasoningPath: string[];
    finalConclusion: string;
  };
}

export interface EnhancedTokenUsage extends TokenUsage {
  reasoningTokens?: number;
  tracingTokens?: number;
  efficiencyRatio?: number; // reasoning_tokens / total_tokens
}

export interface DeepSeekReasonerResponse {
  id: string;
  content: string;
  reasoningTrace?: ReasoningTrace;
  usage?: EnhancedTokenUsage;
  model: string;
  cached: boolean;
  processingTime: number;
  requestId: string;
  metadata?: {
    reasoningSteps: number;
    reasoningQuality: number;
    confidenceScore: number;
    complexityDetected: 'low' | 'medium' | 'high';
    reasoningPath: string;
  };
}

export interface DeepSeekReasonerStreamChunk extends AIStreamChunk {
  type: 'reasoning' | 'content' | 'done' | 'error' | 'reasoning_step' | 'reasoning_complete';
  reasoningStep?: ReasoningStep;
  metadata?: {
    currentStep: number;
    totalSteps: number;
    progress: number;
    estimatedTimeRemaining?: number;
  };
}

// Configuration and Settings
export interface ReasonerConfig {
  defaultEffort: ReasoningEffort;
  enableTracing: boolean;
  maxStepsPerEffort: Record<ReasoningEffort, number>;
  timeoutPerEffort: Record<ReasoningEffort, number>;
  qualityThresholds: {
    minimum: number;
    good: number;
    excellent: number;
  };
}

export interface ReasoningContext {
  taskComplexity: 'low' | 'medium' | 'high';
  domainKnowledge: string[];
  userExpertiseLevel: 'beginner' | 'intermediate' | 'advanced';
  reasoningGoal: 'explanation' | 'analysis' | 'synthesis' | 'evaluation';
  constraints?: {
    maxSteps?: number;
    timeLimit?: number;
    focusAreas?: string[];
  };
}

// Extended Pipeline Context for Reasoning
export interface EnhancedProcessingMetadata extends ProcessingMetadata {
  reasoningTrace?: ReasoningTrace;
  reasoningMetrics?: {
    stepsGenerated: number;
    averageStepConfidence: number;
    reasoningQuality: number;
    complexityHandled: 'low' | 'medium' | 'high';
  };
  reasoningInsights?: {
    keyFindings: string[];
    methodsUsed: string[];
    confidenceAreas: string[];
    uncertaintyAreas: string[];
  };
}

// Request and Response Patterns
export interface DeepSeekReasonerRequest {
  messages: AIMessage[];
  modelConfig: DeepSeekReasonerModelConfig;
  requestId: string;
  priority?: 'low' | 'normal' | 'high';
  cacheKey?: string;
  stream?: boolean;
  abortSignal?: AbortSignal;
  reasoningMode?: boolean;
  reasoningEffort?: ReasoningEffort;
  reasoningContext?: ReasoningContext;
}

// Metrics and Analytics
export interface ReasoningMetrics {
  totalReasoningRequests: number;
  successfulReasoningRequests: number;
  averageReasoningSteps: number;
  averageReasoningTime: number;
  qualityDistribution: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
  effortDistribution: Record<ReasoningEffort, number>;
  modelUsage: Record<DeepSeekReasonerModel, number>;
}

export interface DeepSeekReasonerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  cachedRequests: number;
  reasoningRequests: number;
  averageLatency: number;
  averageReasoningSteps: number;
  totalTokensUsed: number;
  totalReasoningTokens: number;
  circuitBreakerTrips: number;
  rateLimitHits: number;
  lastResetTime: Date;
  reasoningMetrics: ReasoningMetrics;
}

// Error Handling
export interface ReasoningError extends Error {
  code: 'REASONING_TIMEOUT' | 'REASONING_QUALITY_TOO_LOW' | 'REASONING_STEPS_EXCEEDED' | 'REASONING_API_ERROR';
  reasoningStep?: number;
  partialTrace?: ReasoningStep[];
  recoverable: boolean;
}

// Configuration for different use cases
export const REASONING_PRESETS: Record<string, Partial<DeepSeekReasonerRequest>> = {
  // Educational contexts
  'student_explanation': {
    reasoningMode: true,
    reasoningEffort: 'medium',
    reasoningContext: {
      taskComplexity: 'medium',
      userExpertiseLevel: 'beginner',
      reasoningGoal: 'explanation',
      constraints: { maxSteps: 8 }
    }
  },
  
  // Advanced analysis
  'research_analysis': {
    reasoningMode: true,
    reasoningEffort: 'high',
    reasoningContext: {
      taskComplexity: 'high',
      userExpertiseLevel: 'advanced',
      reasoningGoal: 'analysis',
      constraints: { maxSteps: 15 }
    }
  },
  
  // Quick insights
  'quick_reasoning': {
    reasoningMode: true,
    reasoningEffort: 'low',
    reasoningContext: {
      taskComplexity: 'low',
      userExpertiseLevel: 'intermediate',
      reasoningGoal: 'synthesis',
      constraints: { maxSteps: 5, timeLimit: 30000 }
    }
  },

  // Complex problem solving
  'problem_solving': {
    reasoningMode: true,
    reasoningEffort: 'maximum',
    reasoningContext: {
      taskComplexity: 'high',
      userExpertiseLevel: 'intermediate',
      reasoningGoal: 'evaluation',
      constraints: { maxSteps: 20 }
    }
  }
};

// Utility Functions Types
export type ReasoningPreset = keyof typeof REASONING_PRESETS;

export interface ReasoningValidator {
  validateStepQuality: (step: ReasoningStep) => boolean;
  validateTraceCompleteness: (trace: ReasoningTrace) => boolean;
  calculateQualityScore: (trace: ReasoningTrace) => number;
}

export interface ReasoningOptimizer {
  optimizeEffortLevel: (context: ReasoningContext) => ReasoningEffort;
  suggestImprovements: (trace: ReasoningTrace) => string[];
  adaptToUserFeedback: (feedback: 'positive' | 'negative' | 'mixed', trace: ReasoningTrace) => ReasonerConfig;
}

// Integration with existing AI Tutor types
declare module './ai-tutor' {
  interface ProcessingMetadata {
    reasoningTrace?: ReasoningTrace;
    reasoningMetrics?: ReasoningMetrics;
  }
  
  interface TokenUsage {
    reasoningTokens?: number;
    tracingTokens?: number;
  }
}

// Export utility constants
export const REASONING_DEFAULTS = {
  EFFORT: 'medium' as ReasoningEffort,
  MAX_STEPS: 10,
  TIMEOUT: 60000,
  QUALITY_THRESHOLD: 0.7,
  CONFIDENCE_THRESHOLD: 0.6
} as const;

export const EFFORT_TIMEOUTS: Record<ReasoningEffort, number> = {
  'low': 30000,      // 30 seconds
  'medium': 60000,   // 1 minute
  'high': 120000,    // 2 minutes
  'maximum': 300000  // 5 minutes
} as const;

export const EFFORT_MAX_STEPS: Record<ReasoningEffort, number> = {
  'low': 5,
  'medium': 10,
  'high': 15,
  'maximum': 20
} as const;
/**
 * Type definitions for Professional Response Renderer
 * Replaces 'any' types with proper interfaces
 */

import type { RequiredResponseStructure } from '@/types/ai-tutor';

// Renderer metrics and quality assessment
export interface RendererMetrics {
  renderTime: number;
  componentCount: number;
  validationScore: number;
  performance: {
    initialization: number;
    rendering: number;
    validation: number;
  };
  memoryUsage?: {
    initial: number;
    peak: number;
    final: number;
  };
}

export interface QualityAssessment {
  overall_score: number;
  criteria: {
    clarity: number;
    completeness: number;
    accuracy: number;
    usefulness: number;
  };
  feedback: {
    strengths: string[];
    improvements: string[];
    rating: 'excellent' | 'good' | 'fair' | 'poor';
  };
  metadata: {
    confidence: number;
    processing_time: number;
    validation_passed: boolean;
  };
}

export interface ProcessingMetadata {
  request_id: string;
  processing_time: number;
  model_used: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  quality_checks: {
    structure_validation: boolean;
    content_validation: boolean;
    safety_check: boolean;
  };
  cache_status: 'hit' | 'miss' | 'partial';
  optimization_applied: string[];
  error_recovery?: {
    attempts: number;
    strategy: string;
    success: boolean;
  };
}

// Component props interfaces
export interface ProfessionalResponseRendererProps {
  result: unknown;
  color?: keyof typeof import('../components/ai-tutor/ProfessionalResponseRenderer').COLOR_CLASSES;
  fallbackContent?: string;
  showMetrics?: boolean;
  className?: string;
  onError?: (error: Error) => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

// Validation result interfaces
export interface ValidationResult {
  data: RequiredResponseStructure;
  metrics: Partial<RendererMetrics>;
}

export interface ValidationError extends Error {
  field?: string;
  value?: unknown;
  expected?: string;
}

// Component section props
export interface QualityAssessmentCardProps {
  qualityAssessment: QualityAssessment;
  color: keyof typeof import('../components/ai-tutor/ProfessionalResponseRenderer').COLOR_CLASSES;
}

export interface ProcessingMetricsCardProps {
  processingMetadata: ProcessingMetadata;
  color: keyof typeof import('../components/ai-tutor/ProfessionalResponseRenderer').COLOR_CLASSES;
}

// Utility types
export type ColorScheme = {
  bg: string;
  border: string;
  text: string;
  accent: string;
};

export type ErrorInfo = {
  componentStack: string;
};

// Performance monitoring
export interface PerformanceTracker {
  start: (operation: string) => void;
  end: (operation: string) => number;
  getMetrics: () => Record<string, number>;
  reset: () => void;
}

// Safe rendering types
export interface SafeRenderOptions {
  maxDepth?: number;
  fallbackContent?: string;
  errorBoundary?: boolean;
  performanceTracking?: boolean;
}
/**
 * Type definitions for AI Table Service
 * Replaces 'any' types with proper interfaces
 */

import type { TableColumn, TableRow, CellValue, TableConfig } from '@/types/table-types';

// AI Response Types
export interface AITableResult {
  content?: string;
  data?: unknown;
  error?: string;
  success?: boolean;
}

export interface AITableConfig {
  columns?: AITableColumnConfig[];
  sampleData?: AITableRowData[];
  formatting?: AITableFormatting;
  validation?: AITableValidation;
  metadata?: AITableMetadata;
}

export interface AITableColumnConfig {
  id?: string;
  key?: string;
  title?: string;
  dataType?: 'string' | 'number' | 'boolean' | 'date' | 'currency';
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  required?: boolean;
  formatter?: AIFormatterConfig;
  validator?: AIValidatorConfig;
}

export interface AITableRowData {
  id?: string | number;
  data?: Record<string, CellValue> | CellValue[];
  metadata?: Record<string, unknown>;
}

export interface AITableFormatting {
  style?: 'professional' | 'academic' | 'dashboard' | 'financial' | 'educational';
  theme?: 'light' | 'dark' | 'auto';
  density?: 'compact' | 'standard' | 'comfortable';
  borders?: boolean;
  striped?: boolean;
  hover?: boolean;
}

export interface AITableValidation {
  rules?: Record<string, AIValidationRule[]>;
  messages?: Record<string, string>;
  onValidation?: (errors: ValidationErrors) => void;
}

export interface AIValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: unknown;
  message?: string;
  validator?: (value: CellValue) => boolean;
}

export interface ValidationErrors {
  [rowId: string]: {
    [columnId: string]: string[];
  };
}

export interface AITableMetadata {
  generatedAt?: string;
  version?: string;
  source?: string;
  context?: Record<string, unknown>;
  performance?: {
    generationTime: number;
    processingTime: number;
    validationTime: number;
  };
}

// Formatter and Validator Types
export interface AIFormatterConfig {
  type?: 'currency' | 'percentage' | 'date' | 'number' | 'text' | 'custom';
  options?: {
    currency?: string;
    precision?: number;
    dateFormat?: string;
    prefix?: string;
    suffix?: string;
    locale?: string;
  };
  customFormatter?: (value: CellValue) => string;
}

export interface AIValidatorConfig {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  custom?: (value: CellValue) => string | null;
  message?: string;
}

// Analysis Types
export interface AITableAnalysisResult {
  structure: {
    score: number;
    issues: string[];
    recommendations: string[];
    columnTypes?: Record<string, string>;
    relationships?: TableRelationship[];
  };
  dataQuality: {
    score: number;
    completeness: number;
    consistency: number;
    accuracy: number;
    issues: DataQualityIssue[];
    suggestions?: string[];
  };
  insights: {
    patterns: DataPattern[];
    outliers: DataOutlier[];
    trends?: DataTrend[];
    correlations?: DataCorrelation[];
  };
  optimization: {
    performance: PerformanceOptimization[];
    structure: StructureOptimization[];
    usability: UsabilityOptimization[];
  };
  metadata: {
    processingTime: number;
    confidence: number;
    modelUsed?: string;
    version?: string;
  };
}

export interface TableRelationship {
  type: 'oneToOne' | 'oneToMany' | 'manyToMany';
  sourceColumn: string;
  targetColumn: string;
  strength: number;
  description?: string;
}

export interface DataQualityIssue {
  type: 'missing' | 'invalid' | 'duplicate' | 'inconsistent' | 'outlier';
  severity: 'low' | 'medium' | 'high' | 'critical';
  column?: string;
  row?: number;
  description: string;
  suggestedFix?: string;
}

export interface DataPattern {
  type: 'trend' | 'cycle' | 'distribution' | 'correlation' | 'anomaly';
  columns: string[];
  description: string;
  confidence: number;
  significance?: number;
}

export interface DataOutlier {
  row: number;
  column: string;
  value: CellValue;
  expectedRange?: {
    min: number;
    max: number;
  };
  zScore?: number;
  description: string;
}

export interface DataTrend {
  columns: string[];
  direction: 'increasing' | 'decreasing' | 'stable' | 'cyclical';
  strength: number;
  timeframe?: string;
  description: string;
}

export interface DataCorrelation {
  columnA: string;
  columnB: string;
  correlation: number;
  type: 'positive' | 'negative' | 'none';
  significance: number;
}

export interface PerformanceOptimization {
  type: 'indexing' | 'caching' | 'pagination' | 'lazy-loading' | 'virtualization';
  description: string;
  expectedImprovement: string;
  effort: 'low' | 'medium' | 'high';
}

export interface StructureOptimization {
  type: 'normalization' | 'denormalization' | 'partitioning' | 'indexing';
  description: string;
  benefits: string[];
  risks?: string[];
}

export interface UsabilityOptimization {
  type: 'sorting' | 'filtering' | 'grouping' | 'formatting' | 'navigation';
  description: string;
  userBenefit: string;
  implementationNotes?: string;
}

// Service Response Types
export interface TableGenerationResponse {
  success: boolean;
  config?: TableConfig;
  error?: string;
  metadata?: {
    processingTime: number;
    tokensUsed?: number;
    modelUsed?: string;
    fallbackUsed?: boolean;
  };
}

export interface TableAnalysisResponse {
  success: boolean;
  analysis?: AITableAnalysisResult;
  error?: string;
  metadata?: {
    processingTime: number;
    confidence: number;
    modelUsed?: string;
  };
}

// Utility Types
export type FormatterFunction = (value: CellValue, row: TableRow) => string | React.ReactNode;
export type ValidatorFunction = (value: CellValue) => string | null;

// AI Processing Context
export interface AIProcessingContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  preferences?: UserTablePreferences;
  history?: PreviousTableRequest[];
}

export interface UserTablePreferences {
  defaultStyle?: AITableFormatting['style'];
  preferredColumns?: number;
  preferredRows?: number;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  numberFormat?: string;
}

export interface PreviousTableRequest {
  description: string;
  timestamp: number;
  success: boolean;
  feedback?: 'positive' | 'negative' | 'neutral';
}
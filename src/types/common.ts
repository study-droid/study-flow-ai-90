/**
/*
 * Common type definitions for StudyFlow AI application
 * This file contains shared types that replace 'any' usage across the codebase
 */

// Basic utility types to replace 'any'
export type UnknownObject = Record<string, unknown>;
export type UnknownArray = unknown[];
export type UnknownRecord = Record<string, unknown>;
export type AnyFunction = (...args: unknown[]) => unknown;
export type AsyncFunction<T = unknown> = (...args: unknown[]) => Promise<T>;

// JSON types
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject {
  [key: string]: JSONValue;
}
export type JSONArray = JSONValue[];

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type AsyncEventHandler<T = Event> = (event: T) => Promise<void>;
export type ChangeHandler<T = unknown> = (value: T) => void;
export type AsyncChangeHandler<T = unknown> = (value: T) => Promise<void>;
export type ErrorHandler = (error: unknown) => void;

// Error types with context
export interface ErrorWithContext extends Error {
  context?: UnknownRecord;
  code?: string;
  details?: UnknownRecord;
}

// API Response types
export interface APIResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: UnknownRecord;
  };
  status?: number;
  timestamp?: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Component props utility types
export interface BaseComponentProps {
  className?: string;
  id?: string;
  'data-testid'?: string;
}

export interface WithChildren {
  children?: React.ReactNode;
}

// Form types
export interface FormField<T = unknown> {
  name: string;
  value: T;
  error?: string;
  touched?: boolean;
  disabled?: boolean;
}

export interface FormData {
  [key: string]: FormField;
}

// Storage and cache types
export interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiry?: number;
}

export interface StorageOptions {
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number;
}

// Validation types
export interface ValidationRule<T = unknown> {
  validate: (value: T) => boolean | string;
  message?: string;
  required?: boolean;
}

export type ValidationSchema<T = UnknownRecord> = {
  [K in keyof T]?: ValidationRule<T[K]> | Array<ValidationRule<T[K]>>;
};

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  data?: UnknownRecord;
}

// Performance types
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  context?: UnknownRecord;
}

export interface MemoryUsage {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
}

// Logging types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: UnknownRecord;
  stack?: string;
}

// Table/Data types for replacing any in table components
export type CellValue = string | number | boolean | null | undefined;

export interface TableColumn {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'currency';
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  formatter?: (value: CellValue) => string;
}

export interface TableRow {
  id: string;
  [columnId: string]: CellValue;
}

// Security types
export interface SecurityContext {
  userId?: string;
  roles: string[];
  permissions: string[];
  sessionId?: string;
  ipAddress?: string;
}

export interface SanitizationOptions {
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  removeEmpty?: boolean;
}

// Third-party API integration types
export interface ThirdPartyApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: UnknownRecord;
  };
}

// Analytics types (enhanced)
export interface AnalyticsEvent {
  name: string;
  properties?: UnknownRecord;
  timestamp?: Date;
  userId?: string;
  sessionId?: string;
}

export interface AnalyticsMetrics {
  [key: string]: number | string | boolean;
}

// PDF types
export interface PDFDocument {
  addPage: () => void;
  text: (text: string, x?: number, y?: number) => void;
  save: () => Blob;
}

// Request/Response metadata types
export interface RequestWithMetadata<T = UnknownRecord> {
  data: T;
  metadata?: {
    requestId?: string;
    timestamp?: number;
    source?: string;
    userAgent?: string;
  };
}

export interface ResponseWithMetadata<T = unknown> {
  data: T;
  metadata?: {
    responseId?: string;
    timestamp?: number;
    duration?: number;
    cached?: boolean;
  };
}

// Configuration types
export interface ConfigValue {
  value: unknown;
  type: string;
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface Configuration {
  [key: string]: ConfigValue | Configuration;
}

// Custom event types
export interface CustomEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
  source?: string;
}

// Mock and test types
export interface MockServer {
  listen: () => void;
  close: () => void;
  use: (...handlers: unknown[]) => void;
  resetHandlers: (...handlers: unknown[]) => void;
}

export interface TestContext {
  page: {
    goto: (url: string) => Promise<void>;
    click: (selector: string) => Promise<void>;
    fill: (selector: string, value: string) => Promise<void>;
    waitForSelector: (selector: string) => Promise<void>;
    evaluate: <T>(fn: () => T) => Promise<T>;
  };
  mockServer?: MockServer;
}

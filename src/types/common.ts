// Common type definitions to replace 'any'
export type UnknownObject = Record<string, unknown>;
export type UnknownArray = unknown[];
export type AsyncFunction<T = unknown> = () => Promise<T>;
export type EventHandler = (event: Event) => void;
export type ErrorHandler = (error: unknown) => void;

// Analytics types
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: Date;
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

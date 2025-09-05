/**
 * Common types used across the application
 */

// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Generic async state
export interface AsyncState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch?: Date;
}

// User preferences
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: NotificationSettings;
  study: StudyPreferences;
}

export interface NotificationSettings {
  enabled: boolean;
  studyReminders: boolean;
  breakReminders: boolean;
  achievementNotifications: boolean;
  emailNotifications: boolean;
}

export interface StudyPreferences {
  defaultStudyDuration: number; // minutes
  defaultBreakDuration: number; // minutes
  pomodoroEnabled: boolean;
  soundEnabled: boolean;
  ambientSounds: string[];
}

// Form states
export interface FormState<T = any> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

// Component props
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface WithTestId {
  testId?: string;
}

// Event handlers
export type EventHandler<T = any> = (event: T) => void;
export type AsyncEventHandler<T = any> = (event: T) => Promise<void>;

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
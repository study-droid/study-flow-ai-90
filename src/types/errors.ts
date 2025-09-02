/**
 * Type-safe error handling types
 */

export interface BaseError {
  message: string;
  code?: string;
  status?: number;
  originalError?: unknown;
}

export interface SupabaseError extends BaseError {
  details?: string;
  hint?: string;
}

export interface ApiError extends BaseError {
  endpoint?: string;
  method?: string;
  requestData?: unknown;
}

export interface ValidationError extends BaseError {
  field?: string;
  value?: unknown;
  constraint?: string;
}

export type AppError = SupabaseError | ApiError | ValidationError | Error;

/**
 * Type guard to check if error is a Supabase error
 */
export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    'code' in error && (error as SupabaseError).code !== undefined
  );
}

/**
 * Type guard to check if error is an API error
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('endpoint' in error || 'method' in error)
  );
}

/**
 * Type guard to check if error is a validation error
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    ('field' in error || 'constraint' in error)
  );
}

/**
 * Safe error message extraction
 */
export function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (isSupabaseError(error) || isApiError(error) || isValidationError(error)) {
    return error.message;
  }
  
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  
  return 'An unexpected error occurred';
}

/**
 * Safe error code extraction
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isSupabaseError(error)) {
    return error.code;
  }
  
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  
  return undefined;
}
/**
 * AI Tutor Services Index
 * Exports all service modules for easy importing
 */

export { AITutorService } from './ai-tutor.service';
export { AITutorRepository } from './ai-tutor.repo';
export { aiTutorFallbackService } from './ai-tutor-fallback.service';
export { responseCacheService } from './response-cache.service';
export { motivationalWordsService } from './motivational-words.service';

// Error handling services
export { 
  errorHandler, 
  ErrorHandlerService,
  ErrorCategory,
  ErrorSeverity,
  type ClassifiedError,
  type RecoveryAction,
  type ErrorRecoveryResult
} from './error-handler.service';
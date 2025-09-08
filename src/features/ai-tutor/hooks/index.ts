/**
 * AI Tutor Hooks Index
 * Exports all hook modules for easy importing
 */

export { useAITutor } from './useAITutor';
export { useDeepSeekStreaming } from './useDeepSeekStreaming';

// Error handling hooks
export { 
  useErrorRecovery,
  type ErrorRecoveryState,
  type ErrorRecoveryOptions
} from './useErrorRecovery';
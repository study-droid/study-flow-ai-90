/**
 * AI Tutor Hooks Index
 * Exports all hook modules for easy importing
 */

export { useAITutor } from './useAITutor';
// DeepSeek streaming removed

// Error handling hooks
export { 
  useErrorRecovery,
  type ErrorRecoveryState,
  type ErrorRecoveryOptions
} from './useErrorRecovery';
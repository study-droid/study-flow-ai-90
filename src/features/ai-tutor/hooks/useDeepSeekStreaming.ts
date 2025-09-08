/**
 * Hook for managing DeepSeek streaming responses
 * Provides real-time markdown processing and validation
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  DeepSeekStreamingProcessor,
  createDeepSeekStreamingProcessor,
  type StreamingChunk,
  type StreamingState,
  type StreamingOptions,
  type StreamingCallbacks,
  type StreamingMetrics
} from '@/services/ai/deepseek-streaming-processor';
import { logger } from '@/services/logging/logger';
import type { RequiredResponseStructure } from '@/types/ai-tutor';
import type { ProcessedResponse } from '@/services/markdown-response-processor';
import type { DeepSeekValidationResult } from '@/services/ai/deepseek-validator';

export interface UseDeepSeekStreamingOptions extends StreamingOptions {
  autoStart?: boolean;
  onComplete?: (response: RequiredResponseStructure) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export interface DeepSeekStreamingHookState {
  // Content state
  currentContent: string;
  processedContent?: ProcessedResponse;
  validationResult?: DeepSeekValidationResult;
  finalResponse?: RequiredResponseStructure;
  
  // Processing state
  isStreaming: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  
  // Progress tracking
  progress: number;
  chunkCount: number;
  
  // Error handling
  errors: string[];
  warnings: string[];
  
  // Metrics
  metrics?: StreamingMetrics;
}

export interface DeepSeekStreamingHookActions {
  startStreaming: (options?: StreamingOptions) => void;
  processChunk: (chunk: StreamingChunk) => Promise<void>;
  processChunks: (chunks: StreamingChunk[]) => Promise<void>;
  stopStreaming: () => void;
  reset: () => void;
  getState: () => StreamingState;
  getMetrics: () => StreamingMetrics | undefined;
}

export function useDeepSeekStreaming(
  options: UseDeepSeekStreamingOptions = {}
): [DeepSeekStreamingHookState, DeepSeekStreamingHookActions] {
  
  // State
  const [state, setState] = useState<DeepSeekStreamingHookState>({
    currentContent: '',
    isStreaming: false,
    isProcessing: false,
    isComplete: false,
    progress: 0,
    chunkCount: 0,
    errors: [],
    warnings: []
  });

  // Refs
  const processorRef = useRef<DeepSeekStreamingProcessor | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processorRef.current) {
        processorRef.current.dispose();
        processorRef.current = null;
      }
    };
  }, []);

  // Start streaming
  const startStreaming = useCallback((streamingOptions?: StreamingOptions) => {
    logger.info('Starting DeepSeek streaming', 'useDeepSeekStreaming');

    // Dispose existing processor
    if (processorRef.current) {
      processorRef.current.dispose();
    }

    // Merge options
    const finalOptions = { ...optionsRef.current, ...streamingOptions };

    // Create callbacks
    const callbacks: StreamingCallbacks = {
      onChunk: (chunk, processorState) => {
        setState(prev => ({
          ...prev,
          currentContent: processorState.accumulatedContent,
          chunkCount: processorState.chunkCount,
          progress: chunk.isComplete ? 100 : Math.min(95, (processorState.chunkCount / 10) * 100),
          errors: processorState.errors,
          warnings: processorState.warnings
        }));

        // Call progress callback
        const progress = chunk.isComplete ? 100 : Math.min(95, (processorState.chunkCount / 10) * 100);
        optionsRef.current.onProgress?.(progress);
      },

      onProcessed: (processed, processorState) => {
        setState(prev => ({
          ...prev,
          processedContent: processed,
          isProcessing: false
        }));
      },

      onValidated: (validation, processorState) => {
        setState(prev => ({
          ...prev,
          validationResult: validation,
          warnings: [...prev.warnings, ...validation.warnings]
        }));
      },

      onError: (error, processorState) => {
        logger.error('DeepSeek streaming error', 'useDeepSeekStreaming', error);
        
        setState(prev => ({
          ...prev,
          errors: [...prev.errors, error.message],
          isProcessing: false
        }));

        optionsRef.current.onError?.(error);
      },

      onComplete: (processorState) => {
        const finalResponse = processorRef.current?.getFinalResponse();
        const metrics = processorRef.current?.getMetrics();
        
        setState(prev => ({
          ...prev,
          isComplete: true,
          isStreaming: false,
          isProcessing: false,
          progress: 100,
          finalResponse: finalResponse || undefined,
          metrics
        }));

        if (finalResponse) {
          optionsRef.current.onComplete?.(finalResponse);
        }

        logger.info('DeepSeek streaming completed', 'useDeepSeekStreaming', {
          contentLength: processorState.accumulatedContent.length,
          chunkCount: processorState.chunkCount,
          hasErrors: processorState.errors.length > 0
        });
      },

      onStateChange: (processorState) => {
        setState(prev => ({
          ...prev,
          isProcessing: processorState.isProcessing,
          warnings: processorState.warnings,
          errors: processorState.errors
        }));
      }
    };

    // Create processor
    processorRef.current = createDeepSeekStreamingProcessor(finalOptions, callbacks);

    // Update state
    setState(prev => ({
      ...prev,
      isStreaming: true,
      isComplete: false,
      currentContent: '',
      processedContent: undefined,
      validationResult: undefined,
      finalResponse: undefined,
      progress: 0,
      chunkCount: 0,
      errors: [],
      warnings: [],
      metrics: undefined
    }));

  }, []);

  // Process single chunk
  const processChunk = useCallback(async (chunk: StreamingChunk) => {
    if (!processorRef.current) {
      logger.warn('No processor available for chunk processing', 'useDeepSeekStreaming');
      return;
    }

    try {
      await processorRef.current.processChunk(chunk);
    } catch (error) {
      logger.error('Error processing chunk', 'useDeepSeekStreaming', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));
    }
  }, []);

  // Process multiple chunks
  const processChunks = useCallback(async (chunks: StreamingChunk[]) => {
    if (!processorRef.current) {
      logger.warn('No processor available for chunks processing', 'useDeepSeekStreaming');
      return;
    }

    try {
      for (const chunk of chunks) {
        await processorRef.current.processChunk(chunk);
      }
    } catch (error) {
      logger.error('Error processing chunks', 'useDeepSeekStreaming', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));
    }
  }, []);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    logger.info('Stopping DeepSeek streaming', 'useDeepSeekStreaming');

    if (processorRef.current) {
      processorRef.current.dispose();
      processorRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isStreaming: false,
      isProcessing: false
    }));
  }, []);

  // Reset state
  const reset = useCallback(() => {
    logger.info('Resetting DeepSeek streaming state', 'useDeepSeekStreaming');

    if (processorRef.current) {
      processorRef.current.reset();
    }

    setState({
      currentContent: '',
      isStreaming: false,
      isProcessing: false,
      isComplete: false,
      progress: 0,
      chunkCount: 0,
      errors: [],
      warnings: []
    });
  }, []);

  // Get processor state
  const getState = useCallback(() => {
    return processorRef.current?.getState() || {
      accumulatedContent: '',
      isProcessing: false,
      lastProcessedAt: 0,
      chunkCount: 0,
      errors: [],
      warnings: []
    };
  }, []);

  // Get metrics
  const getMetrics = useCallback(() => {
    return processorRef.current?.getMetrics();
  }, []);

  // Auto-start if enabled
  useEffect(() => {
    if (options.autoStart) {
      startStreaming();
    }
  }, [options.autoStart, startStreaming]);

  // Actions object
  const actions: DeepSeekStreamingHookActions = {
    startStreaming,
    processChunk,
    processChunks,
    stopStreaming,
    reset,
    getState,
    getMetrics
  };

  return [state, actions];
}

/**
 * Simplified hook for basic streaming scenarios
 */
export function useSimpleDeepSeekStreaming(
  onComplete?: (response: RequiredResponseStructure) => void,
  onError?: (error: Error) => void
) {
  return useDeepSeekStreaming({
    autoStart: false,
    processIncrementally: true,
    enableDebouncing: true,
    onComplete,
    onError
  });
}

/**
 * Hook for high-performance streaming scenarios
 */
export function useHighPerformanceDeepSeekStreaming(
  onComplete?: (response: RequiredResponseStructure) => void,
  onProgress?: (progress: number) => void
) {
  return useDeepSeekStreaming({
    autoStart: false,
    processIncrementally: true,
    enableDebouncing: false,
    processingInterval: 50, // Faster processing
    debounceDelay: 50,
    onComplete,
    onProgress
  });
}

export default useDeepSeekStreaming;
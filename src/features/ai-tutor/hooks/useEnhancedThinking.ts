/**
 * Enhanced Thinking Hook
 * Manages intelligent thinking states with contextual analysis
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { thinkingStateService, type EnhancedThinkingState, type ThinkingContext } from '../services/thinking-state.service';

interface UseEnhancedThinkingOptions {
  autoProgress?: boolean;
  progressUpdateInterval?: number;
  factRotationInterval?: number;
  onStageChange?: (stage: 'analyzing' | 'reasoning' | 'responding') => void;
  onProgressUpdate?: (progress: number) => void;
  onComplete?: () => void;
}

interface UseEnhancedThinkingReturn {
  thinkingState: EnhancedThinkingState | null;
  isThinking: boolean;
  progress: number;
  
  // Actions
  startThinking: (messageContent: string, previousMessages?: Array<{ role: string; content: string }>) => void;
  updateStage: (stage: 'analyzing' | 'reasoning' | 'responding', additionalContext?: string) => void;
  updateProgress: (progress: number, message?: string) => void;
  stopThinking: () => void;
  
  // Utilities
  analyzeMessage: (content: string) => ThinkingContext;
  getEstimatedDuration: () => number;
  getCurrentFact: () => any;
}

export function useEnhancedThinking(options: UseEnhancedThinkingOptions = {}): UseEnhancedThinkingReturn {
  const {
    autoProgress = true,
    progressUpdateInterval = 200,
    factRotationInterval = 4000,
    onStageChange,
    onProgressUpdate,
    onComplete
  } = options;

  const [thinkingState, setThinkingState] = useState<EnhancedThinkingState | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [messageContext, setMessageContext] = useState<ThinkingContext | null>(null);

  const progressIntervalRef = useRef<NodeJS.Timeout>();
  const stageStartTimeRef = useRef<number>(0);
  const currentStageRef = useRef<'analyzing' | 'reasoning' | 'responding'>('analyzing');

  // Auto-progress simulation
  useEffect(() => {
    if (!isThinking || !thinkingState || !autoProgress) return;

    const updateProgress = () => {
      const elapsed = Date.now() - stageStartTimeRef.current;
      const estimatedDuration = thinkingState.estimatedDuration;
      const targetProgress = Math.min(95, (elapsed / estimatedDuration) * 100);
      
      setProgress(prev => {
        const increment = Math.random() * 2 + 0.5; // Random increment between 0.5-2.5%
        const newProgress = Math.min(targetProgress, prev + increment);
        
        onProgressUpdate?.(newProgress);
        
        // Auto-complete when reaching 100%
        if (newProgress >= 100) {
          setTimeout(() => {
            stopThinking();
            onComplete?.();
          }, 500);
        }
        
        return newProgress;
      });
    };

    const interval = setInterval(updateProgress, progressUpdateInterval);
    progressIntervalRef.current = interval;

    return () => clearInterval(interval);
  }, [isThinking, thinkingState, autoProgress, progressUpdateInterval, onProgressUpdate, onComplete]);

  // Update thinking state when progress changes
  useEffect(() => {
    if (!thinkingState) return;

    const updatedState = thinkingStateService.updateThinkingProgress(
      thinkingState,
      progress
    );
    
    setThinkingState(updatedState);
  }, [progress]);

  const startThinking = useCallback((
    messageContent: string, 
    previousMessages?: Array<{ role: string; content: string }>
  ) => {
    const context = thinkingStateService.analyzeMessage(messageContent, previousMessages);
    setMessageContext(context);
    
    const initialState = thinkingStateService.generateThinkingState('analyzing', context);
    setThinkingState(initialState);
    setIsThinking(true);
    setProgress(initialState.progress);
    
    stageStartTimeRef.current = Date.now();
    currentStageRef.current = 'analyzing';
    
    onStageChange?.('analyzing');
  }, [onStageChange]);

  const updateStage = useCallback((
    stage: 'analyzing' | 'reasoning' | 'responding',
    additionalContext?: string
  ) => {
    if (!messageContext) return;

    // Handle stage transition
    if (currentStageRef.current !== stage) {
      const transition = thinkingStateService.generateStageTransition(
        currentStageRef.current,
        stage,
        messageContext
      );
      
      setProgress(transition.progress);
      stageStartTimeRef.current = Date.now();
      currentStageRef.current = stage;
      
      onStageChange?.(stage);
    }

    const newState = thinkingStateService.generateThinkingState(
      stage,
      messageContext,
      progress
    );

    if (additionalContext) {
      newState.content = additionalContext;
      newState.contextualMessage = additionalContext;
    }

    setThinkingState(newState);
  }, [messageContext, progress, onStageChange]);

  const updateProgress = useCallback((newProgress: number, message?: string) => {
    setProgress(Math.min(100, Math.max(0, newProgress)));
    
    if (message && thinkingState) {
      const updatedState = thinkingStateService.updateThinkingProgress(
        thinkingState,
        newProgress,
        message
      );
      setThinkingState(updatedState);
    }
    
    onProgressUpdate?.(newProgress);
  }, [thinkingState, onProgressUpdate]);

  const stopThinking = useCallback(() => {
    setIsThinking(false);
    setThinkingState(null);
    setProgress(0);
    setMessageContext(null);
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
  }, []);

  const analyzeMessage = useCallback((content: string) => {
    return thinkingStateService.analyzeMessage(content);
  }, []);

  const getEstimatedDuration = useCallback(() => {
    return thinkingState?.estimatedDuration || 0;
  }, [thinkingState]);

  const getCurrentFact = useCallback(() => {
    return thinkingState?.currentFact || null;
  }, [thinkingState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  return {
    thinkingState,
    isThinking,
    progress,
    
    // Actions
    startThinking,
    updateStage,
    updateProgress,
    stopThinking,
    
    // Utilities
    analyzeMessage,
    getEstimatedDuration,
    getCurrentFact,
  };
}
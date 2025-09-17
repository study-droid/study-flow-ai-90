/**
 * Enhanced DeepSeek Streaming Hook
 * Provides real-time streaming capabilities for DeepSeek AI interactions
 */

import { useCallback, useRef, useState } from 'react';
import { aiProxyClient } from '@/services/ai-proxy-client';
import type { AIProxyRequest } from '@/services/ai-proxy-client';
import { logger } from '@/services/logging/logger';

export interface StreamingOptions {
  provider?: AIProxyRequest['provider'];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

export interface StreamingState {
  isStreaming: boolean;
  content: string;
  error: string | null;
  progress: number;
}

export interface StreamingActions {
  startStreaming: (messages: Array<{ role: string; content: string }>, options?: StreamingOptions) => Promise<void>;
  stopStreaming: () => void;
  clearContent: () => void;
}

export function useDeepSeekStreaming(
  defaultOptions: StreamingOptions = {}
): [StreamingState, StreamingActions] {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    content: '',
    error: null,
    progress: 0
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const startStreaming = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    options: StreamingOptions = {}
  ) => {
    const finalOptions = { ...defaultOptions, ...options };
    
    // Reset state
    setState({
      isStreaming: true,
      content: '',
      error: null,
      progress: 0
    });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      logger.info('Starting DeepSeek streaming', 'useDeepSeekStreaming', {
        provider: finalOptions.provider || 'deepseek',
        messageCount: messages.length
      });

      // Since we don't have real streaming from the edge function yet,
      // we'll simulate it by making a regular request and chunk the response
      const response = await aiProxyClient.sendChatMessage(
        finalOptions.provider || 'deepseek',
        messages,
        {
          model: finalOptions.model,
          temperature: finalOptions.temperature,
          maxTokens: finalOptions.maxTokens
        }
      );

      if (response.error) {
        throw new Error(response.error);
      }

      // Extract content from response
      let fullContent = '';
      if (response.data) {
        // Handle different response formats
        if (response.data.choices?.[0]?.message?.content) {
          fullContent = response.data.choices[0].message.content;
        } else if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
          fullContent = response.data.candidates[0].content.parts[0].text;
        } else if (response.data.content?.[0]?.text) {
          fullContent = response.data.content[0].text;
        } else if (typeof response.data === 'string') {
          fullContent = response.data;
        }
      }

      if (!fullContent) {
        throw new Error('No content received from AI provider');
      }

      // Simulate streaming by chunking the response
      const words = fullContent.split(' ');
      let currentContent = '';
      
      for (let i = 0; i < words.length; i++) {
        // Check if streaming was cancelled
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        currentContent += (i > 0 ? ' ' : '') + words[i];
        const progress = ((i + 1) / words.length) * 100;

        setState(prev => ({
          ...prev,
          content: currentContent,
          progress
        }));

        // Call chunk callback
        finalOptions.onChunk?.(words[i]);

        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Finalize streaming
      setState(prev => ({
        ...prev,
        isStreaming: false,
        progress: 100
      }));

      finalOptions.onComplete?.(currentContent);

      logger.info('DeepSeek streaming completed', 'useDeepSeekStreaming', {
        contentLength: currentContent.length,
        wordCount: words.length
      });

    } catch (error: any) {
      logger.error('DeepSeek streaming error', 'useDeepSeekStreaming', error);
      
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: error.message || 'Streaming failed',
        progress: 0
      }));

      finalOptions.onError?.(error);
    }
  }, [defaultOptions]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isStreaming: false
    }));

    logger.info('DeepSeek streaming stopped', 'useDeepSeekStreaming');
  }, []);

  const clearContent = useCallback(() => {
    setState({
      isStreaming: false,
      content: '',
      error: null,
      progress: 0
    });
  }, []);

  return [
    state,
    {
      startStreaming,
      stopStreaming,
      clearContent
    }
  ];
}

export default useDeepSeekStreaming;
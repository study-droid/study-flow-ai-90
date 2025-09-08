/**
 * Smart Message Bubble Component
 * Automatically selects the appropriate message bubble based on AI provider and message type
 */

import React from 'react';
import { MessageBubble } from '@/features/ai-tutor/components/MessageBubble';
import { DeepSeekMessageBubble } from '@/components/ai/DeepSeekMessageBubble';
import { DeepSeekStreamingMessageBubble } from '@/components/ai/DeepSeekStreamingMessageBubble';
import { DeepSeekErrorBoundary } from '@/components/error-boundaries/DeepSeekErrorBoundary';
import type { ChatMessage, ThinkingState } from '@/features/ai-tutor/types';
import type { StreamingChunk } from '@/services/ai/deepseek-streaming-processor';

interface SmartMessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
  isThinking?: boolean;
  thinkingState?: ThinkingState;
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  className?: string;
  
  // Provider detection
  aiProvider?: 'deepseek' | 'openai' | 'anthropic' | 'gemini' | 'auto';
  
  // Streaming support
  isStreaming?: boolean;
  streamingChunks?: StreamingChunk[];
  
  // DeepSeek specific options
  showMetrics?: boolean;
  enableFallback?: boolean;
  showStreamingProgress?: boolean;
  
  // Callbacks
  onStreamingComplete?: (finalResponse: any) => void;
  onStreamingError?: (error: Error) => void;
}

/**
 * Detect AI provider from message metadata or content patterns
 */
function detectAIProvider(message: ChatMessage): 'deepseek' | 'openai' | 'anthropic' | 'gemini' | 'unknown' {
  // Check message metadata first
  if (message.metadata?.model) {
    const model = message.metadata.model.toLowerCase();
    if (model.includes('deepseek')) return 'deepseek';
    if (model.includes('gpt') || model.includes('openai')) return 'openai';
    if (model.includes('claude') || model.includes('anthropic')) return 'anthropic';
    if (model.includes('gemini') || model.includes('google')) return 'gemini';
  }

  // Check content patterns for DeepSeek-specific formatting
  if (message.role === 'assistant' && message.content) {
    // DeepSeek often uses specific markdown patterns
    const hasDeepSeekPatterns = [
      /^#{1,3}\s+.+$/m, // Headers
      /\*\*[^*]+\*\*/g, // Bold text
      /```[\s\S]*?```/g, // Code blocks
      /\|.+\|/g, // Tables
      /F\(\w+\)\s*=/, // Mathematical functions (common in DeepSeek responses)
    ].some(pattern => pattern.test(message.content!));

    if (hasDeepSeekPatterns) {
      return 'deepseek';
    }
  }

  return 'unknown';
}

/**
 * Determine if message should use streaming display
 */
function shouldUseStreaming(
  message: ChatMessage,
  isStreaming?: boolean,
  streamingChunks?: StreamingChunk[]
): boolean {
  return !!(
    isStreaming || 
    (streamingChunks && streamingChunks.length > 0) ||
    message.type === 'thinking'
  );
}

export function SmartMessageBubble({
  message,
  isLoading = false,
  isThinking = false,
  thinkingState,
  onFeedback,
  className,
  aiProvider = 'auto',
  isStreaming = false,
  streamingChunks,
  showMetrics = false,
  enableFallback = true,
  showStreamingProgress = true,
  onStreamingComplete,
  onStreamingError
}: SmartMessageBubbleProps) {
  
  // Determine the actual provider to use
  const detectedProvider = aiProvider === 'auto' ? detectAIProvider(message) : aiProvider;
  
  // Determine if we should use streaming
  const useStreaming = shouldUseStreaming(message, isStreaming, streamingChunks);
  
  // For user messages, always use the standard MessageBubble
  if (message.role === 'user') {
    return (
      <MessageBubble
        message={message}
        isLoading={isLoading}
        isThinking={isThinking}
        thinkingState={thinkingState}
        onFeedback={onFeedback}
        className={className}
      />
    );
  }

  // For DeepSeek messages, use specialized components with error boundary
  if (detectedProvider === 'deepseek') {
    const deepSeekComponent = useStreaming ? (
      <DeepSeekStreamingMessageBubble
        message={message}
        isStreaming={isStreaming}
        streamingChunks={streamingChunks}
        isLoading={isLoading}
        isThinking={isThinking}
        thinkingState={thinkingState}
        onFeedback={onFeedback}
        className={className}
        showMetrics={showMetrics}
        showStreamingProgress={showStreamingProgress}
        onStreamingComplete={onStreamingComplete}
        onStreamingError={onStreamingError}
      />
    ) : (
      <DeepSeekMessageBubble
        message={message}
        isLoading={isLoading}
        isThinking={isThinking}
        thinkingState={thinkingState}
        onFeedback={onFeedback}
        className={className}
        showMetrics={showMetrics}
        enableFallback={enableFallback}
      />
    );

    return (
      <DeepSeekErrorBoundary
        messageId={message.id}
        fallbackContent={message.content}
        enableRawFallback={enableFallback}
        enableRetry={true}
        onError={(error) => {
          console.error('DeepSeek rendering error:', error);
          onStreamingError?.(error);
        }}
        onFallbackUsed={(fallbackType) => {
          console.log(`DeepSeek fallback used: ${fallbackType} for message ${message.id}`);
        }}
      >
        {deepSeekComponent}
      </DeepSeekErrorBoundary>
    );
  }

  // For other providers or unknown, use the standard MessageBubble
  return (
    <MessageBubble
      message={message}
      isLoading={isLoading}
      isThinking={isThinking}
      thinkingState={thinkingState}
      onFeedback={onFeedback}
      className={className}
    />
  );
}

export default SmartMessageBubble;
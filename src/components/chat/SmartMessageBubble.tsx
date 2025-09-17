/**
 * Smart Message Bubble Component - Simplified version
 */

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DeepSeekMessageBubble } from '@/components/ai/DeepSeekMessageBubble';
import type { ChatMessage } from '@/features/ai-tutor/types';

interface SmartMessageBubbleProps {
  message: ChatMessage;
  isLoading?: boolean;
  isThinking?: boolean;
  onFeedback?: (messageId: string, type: 'helpful' | 'not_helpful') => void;
  className?: string;
  showMetrics?: boolean;
}

export function SmartMessageBubble({
  message,
  isLoading = false,
  isThinking = false,
  onFeedback,
  className,
  showMetrics = false
}: SmartMessageBubbleProps) {
  // Simple rendering strategy
  const isDeepSeekMessage = useMemo(() => (
    message.role === 'assistant' && 
    (message.metadata?.model?.toLowerCase().includes('deepseek') ||
     message.sessionId?.includes('deepseek') ||
     message.content?.includes('DeepSeek'))
  ), [message.role, message.metadata, message.sessionId, message.content]);

  // Always use standard DeepSeek bubble for simplicity
  return (
    <div className={cn('smart-message-bubble standard', className)}>
      <DeepSeekMessageBubble
        message={message}
        isLoading={isLoading}
        isThinking={isThinking}
        onFeedback={onFeedback}
        showMetrics={showMetrics}
        className="deepseek-standard-bubble"
      />
      
      {/* Strategy metadata for debugging */}
      {showMetrics && (
        <div className="text-xs text-muted-foreground mt-1 px-2">
          {isDeepSeekMessage ? 'DeepSeek AI' : 'Standard'} rendering
        </div>
      )}
    </div>
  );
}

export default SmartMessageBubble;